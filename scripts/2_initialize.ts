import { concat, createWalletClient, Hex, http, zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { writeContract } from "viem/actions";
import { odysseyTestnet } from "viem/chains";

import kernelV3ImplementationAbi from "@/abi/kernelV3Implementation.js";

const MULTI_CHAIN_VALIDATOR = "0x02d32f9c668C92A60b44825C4f79B501c0F685dA";

const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY as Hex | undefined;
if (!sponsorPrivateKey) {
  throw new Error("SPONSOR_PRIVATE_KEY is required");
}
const sponsorAccount = privateKeyToAccount(sponsorPrivateKey);
console.log("Sponsor Address:", sponsorAccount.address);
const sponsorClient = createWalletClient({
  chain: odysseyTestnet,
  transport: http(),
  account: sponsorAccount,
});

const ownerPrivateKey = process.env.OWNER_PRIVATE_KEY as Hex | undefined;
if (!ownerPrivateKey) {
  throw new Error("OWNER_PRIVATE_KEY is required");
}
const account = privateKeyToAccount(ownerPrivateKey);

const txHash = await writeContract(sponsorClient, {
  address: account.address,
  abi: kernelV3ImplementationAbi,
  functionName: "initialize",
  args: [
    concat(["0x01", MULTI_CHAIN_VALIDATOR]),
    zeroAddress,
    account.address,
    "0x",
  ],
});

console.log("Transaction Hash:", txHash);
