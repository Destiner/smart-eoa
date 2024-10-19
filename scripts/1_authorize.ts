import { concat, createClient, createWalletClient, Hex, http, zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { writeContract } from "viem/actions";
import { odysseyTestnet } from "viem/chains";

import kernelV3ImplementationAbi from "@/abi/kernelV3Implementation.js";
import { signAuthorization } from "viem/experimental";

const KERNEL_V3_1_IMPLEMENTATION = "0x94F097E1ebEB4ecA3AAE54cabb08905B239A7D27";
const MULTI_CHAIN_VALIDATOR = "0x02d32f9c668C92A60b44825C4f79B501c0F685dA";

const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY as Hex | undefined;
if (!sponsorPrivateKey) {
  throw new Error("SPONSOR_PRIVATE_KEY is required");
}
const sponsorAccount = privateKeyToAccount(sponsorPrivateKey);
console.log("Sponsor Address:", sponsorAccount.address);

const ownerPrivateKey = process.env.OWNER_PRIVATE_KEY as Hex | undefined;
if (!ownerPrivateKey) {
  throw new Error("OWNER_PRIVATE_KEY is required");
}
const account = privateKeyToAccount(ownerPrivateKey);

const client = createClient({
  chain: odysseyTestnet,
  transport: http(),
});

const authorization = await signAuthorization(client, {
  account,
  contractAddress: KERNEL_V3_1_IMPLEMENTATION,
  delegate: sponsorAccount
});

const txHash = await writeContract(client, {
  address: account.address,
  abi: kernelV3ImplementationAbi,
  functionName: "initialize",
  args: [
    concat(["0x01", MULTI_CHAIN_VALIDATOR]),
    zeroAddress,
    account.address,
    "0x",
  ],
  account: sponsorAccount,
  authorizationList: [authorization]
});

console.log("Transaction Hash:", txHash);
