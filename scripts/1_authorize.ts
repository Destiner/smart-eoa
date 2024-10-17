import { createWalletClient, Hex, http, slice } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { odysseyTestnet } from "viem/chains";
import { eip7702Actions, signAuthorization } from "viem/experimental";

const KERNEL_V3_1_IMPLEMENTATION = "0x94F097E1ebEB4ecA3AAE54cabb08905B239A7D27";

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
}).extend(eip7702Actions());

const ownerPrivateKey = process.env.OWNER_PRIVATE_KEY as Hex | undefined;
if (!ownerPrivateKey) {
  throw new Error("OWNER_PRIVATE_KEY is required");
}
const account = privateKeyToAccount(ownerPrivateKey);
const accountClient = createWalletClient({
  chain: odysseyTestnet,
  transport: http(),
  account,
});
const signedAuthorization = await signAuthorization(accountClient, {
  chainId: odysseyTestnet.id,
  contractAddress: KERNEL_V3_1_IMPLEMENTATION,
  nonce: 0,
});

// Alternatively, you can sign the authorization using Foundry:
// cast wallet sign-auth --private-key $PK 0x94F097E1ebEB4ecA3AAE54cabb08905B239A7D27 --rpc-url "https://odyssey.ithaca.xyz" --chain 911867
// const signedAuthorization =
//   "0xf85d830de9fb9494f097e1ebeb4eca3aae54cabb08905b239a7d278080a08c95e5ddf3483575afd74eab8065c23dc481387bb135df5c72eefccd14afb83ba0031a60de0d37283f12cebbc99f4b42ce392a1820e7bf6380da74bfcb972acbbe";
// const r = slice(signedAuthorization, 30, 30 + 32);
// const s = slice(signedAuthorization, 30 + 32 + 1, 30 + 32 + 1 + 32);
// const v = slice(signedAuthorization, 28, 29) === "0x80" ? 27n : 28n;
// const yParity = v === 28n ? 1 : 0;

const hash = await sponsorClient.sendTransaction({
  authorizationList: [
    {
      chainId: odysseyTestnet.id,
      contractAddress: KERNEL_V3_1_IMPLEMENTATION,
      nonce: 0,
      r: signedAuthorization.r,
      s: signedAuthorization.s,
      v: signedAuthorization.v,
      yParity: signedAuthorization.yParity,
    },
  ],
  to: account.address,
});

console.log("Transaction Hash:", hash);
