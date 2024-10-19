# Smart EOA

A list of scripts that uses EIP-7702 and ERC-4337 to send a UserOperation on an EOA.

## Scripts

- `1_authorize.ts`:
  - signs an authorization and sends a delegation designation tx (sets the code)
  - initializes the smart EOA with the ownership data (sets the storage)
- `2_send.ts`: signs and sends the User Operation
