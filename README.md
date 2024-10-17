# Smart EOA

A list of scripts that uses EIP-7702 and ERC-4337 to send a UserOperation on an EOA.

## Scripts

- `1_authorize.ts`: signs an authorization and sends a delegation designation tx (sets the code)
- `2_initialize.ts`: initializes the smart EOA with the ownership data (sets the storage)
- `3_send.ts`: signs and sends the User Operation
