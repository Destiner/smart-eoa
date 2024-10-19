import {
  Address,
  concat,
  createClient,
  encodeAbiParameters,
  encodeFunctionData,
  Hex,
  http,
  keccak256,
} from "viem";
import { odysseyTestnet } from "viem/chains";
import { privateKeyToAccount, sign } from "viem/accounts";
import { writeContract } from "viem/actions";

import entryPoint070Abi from "@/abi/entryPoint0_7_0.js";
import kernelV3ImplementationAbi from "@/abi/kernelV3Implementation.js";

interface Op_0_7 {
  sender: Address;
  nonce: bigint;
  initCode: Hex;
  callData: Hex;
  accountGasLimits: Hex;
  preVerificationGas: bigint;
  gasFees: Hex;
  paymasterAndData: Hex;
  signature: Hex;
}

const ENTRY_POINT_0_7_0 = "0x0000000071727de22e5e9d8baf0edac6f37da032";

const ownerPrivateKey = process.env.OWNER_PRIVATE_KEY as Hex | undefined;
if (!ownerPrivateKey) {
  throw new Error("OWNER_PRIVATE_KEY is required");
}
const owner = privateKeyToAccount(ownerPrivateKey);

const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY as Hex | undefined;
if (!sponsorPrivateKey) {
  throw new Error("SPONSOR_PRIVATE_KEY is required");
}
const sponsorAccount = privateKeyToAccount(sponsorPrivateKey);
const client = createClient({
  account: sponsorAccount,
  chain: odysseyTestnet,
  transport: http(),
});

const execMode =
  "0x0100000000000000000000000000000000000000000000000000000000000000";
const executionCalldata = encodeAbiParameters(
  [
    {
      type: "tuple[]",
      components: [
        {
          type: "address",
          name: "target",
        },
        {
          type: "uint256",
          name: "value",
        },
        {
          type: "bytes",
          name: "callData",
        },
      ],
    },
  ],
  [
    [
      {
        target: "0x0000000000000000000000000000000000000001",
        value: 1n,
        callData: "0x",
      },
      {
        target: "0x0000000000000000000000000000000000000002",
        value: 2n,
        callData: "0x",
      },
    ],
  ]
);

const callData = encodeFunctionData({
  abi: kernelV3ImplementationAbi,
  functionName: "execute",
  args: [execMode, executionCalldata],
});

function getOpHash(chain: number, entryPoint: Address, op: Op_0_7): Hex | null {
  const hashedInitCode = keccak256(op.initCode);
  const hashedCallData = keccak256(op.callData);
  const hashedPaymasterAndData = keccak256(op.paymasterAndData);
  const packedUserOp = encodeAbiParameters(
    [
      { type: "address" },
      { type: "uint256" },
      { type: "bytes32" },
      { type: "bytes32" },
      { type: "bytes32" },
      { type: "uint256" },
      { type: "bytes32" },
      { type: "bytes32" },
    ],
    [
      op.sender,
      op.nonce,
      hashedInitCode,
      hashedCallData,
      op.accountGasLimits,
      op.preVerificationGas,
      op.gasFees,
      hashedPaymasterAndData,
    ]
  );
  const encoded = encodeAbiParameters(
    [{ type: "bytes32" }, { type: "address" }, { type: "uint256" }],
    [keccak256(packedUserOp), entryPoint, BigInt(chain)]
  );
  return keccak256(encoded);
}

const op: Op_0_7 = {
  sender: owner.address,
  // Fix: bump automatically
  nonce: 0n,
  // Should be already initialized
  initCode: "0x",
  callData,
  // Fix: make it dynamic
  accountGasLimits:
    "0x00000000000000000000000000030ecd00000000000000000000000000064fc0",
  // Fix: make it dynamic
  preVerificationGas: 100000n,
  // Fix: make it dynamic
  gasFees: "0x0000000000000000000000000010eff00000000000000000000000000033915f",
  paymasterAndData: "0x",
  signature: "0x",
};

const opHash = getOpHash(odysseyTestnet.id, ENTRY_POINT_0_7_0, op);
if (!opHash) {
  console.error("Failed to get op hash");
  process.exit(1);
}
const signature = await sign({
  hash: opHash,
  privateKey: ownerPrivateKey,
});
console.log("Signature:", signature);

const signatureHex = concat([
  signature.r,
  signature.s,
  `0x${(signature.v || 0n).toString(16)}`,
]);

const txHash = await writeContract(client, {
  address: ENTRY_POINT_0_7_0,
  abi: entryPoint070Abi,
  functionName: "handleOps",
  args: [
    [
      {
        ...op,
        signature: signatureHex,
      },
    ],
    sponsorAccount.address,
  ],
});

console.log("Tx hash:", txHash);
