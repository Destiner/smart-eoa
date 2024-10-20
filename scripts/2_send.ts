import {
  Address,
  concat,
  createClient,
  encodeAbiParameters,
  encodeFunctionData,
  Hex,
  http,
  keccak256,
  padHex,
} from "viem";
import { odysseyTestnet } from "viem/chains";
import { privateKeyToAccount, sign } from "viem/accounts";
import { readContract } from "viem/actions";
import {
  createBundlerClient,
  sendUserOperation,
} from "viem/account-abstraction";

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

// Fix: make it dynamic
const callGasLimit = 327680n;
const verificationGasLimit = 1048576n;
const preVerificationGas = 100000n;
const maxPriorityFeePerGas = 1500000000n;
const maxFeePerGas = 2000000000n;

const ownerPrivateKey = process.env.OWNER_PRIVATE_KEY as Hex | undefined;
if (!ownerPrivateKey) {
  throw new Error("OWNER_PRIVATE_KEY is required");
}
const owner = privateKeyToAccount(ownerPrivateKey);
console.log("Owner Address:", owner.address);

const bundlerRpc = process.env.BUNDLER_RPC;
if (!bundlerRpc) {
  throw new Error("BUNDLER_RPC is required");
}

const client = createClient({
  chain: odysseyTestnet,
  transport: http(),
});
const bundlerClient = createBundlerClient({
  client,
  transport: http(bundlerRpc),
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

const nonce = await readContract(client, {
  address: ENTRY_POINT_0_7_0,
  abi: entryPoint070Abi,
  functionName: "getNonce",
  args: [owner.address, 0n],
});

const op: Op_0_7 = {
  sender: owner.address,
  nonce,
  // Should be already initialized
  initCode: "0x",
  callData,
  accountGasLimits: concat([
    padHex(verificationGasLimit.toString(16) as Hex, { size: 16 }),
    padHex(callGasLimit.toString(16) as Hex, { size: 16 }),
  ]),
  preVerificationGas,
  gasFees: concat([
    padHex(maxPriorityFeePerGas.toString(16) as Hex, { size: 16 }),
    padHex(maxFeePerGas.toString(16) as Hex, { size: 16 }),
  ]),
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
  to: "hex",
});
console.log("Signature:", signature);

const userOpHash = await sendUserOperation(bundlerClient, {
  entryPointAddress: ENTRY_POINT_0_7_0,
  sender: owner.address,
  nonce,
  callData,
  callGasLimit,
  verificationGasLimit,
  preVerificationGas,
  maxPriorityFeePerGas,
  maxFeePerGas,
  signature,
});

console.log("Op hash:", userOpHash);

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
