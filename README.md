# Lotto — Zama FHEVM-based Encrypted Lottery DApp

This folder contains a complete backend + frontend implementation of a privacy-preserving lottery using Zama FHEVM. It mirrors the official template patterns for both on-chain FHE usage and frontend decryption flow.

- Backend: `Lotto/backend` (Hardhat + `@fhevm/hardhat-plugin` + `@fhevm/solidity`)
- Frontend: `Lotto/frontend` (Next.js + `@zama-fhe/relayer-sdk` + `@fhevm/mock-utils`)

The contract performs all FHE computations (encrypted ticket numbers, encrypted winning number, encrypted per-ticket results). The frontend handles client-side encryption of inputs and user decryption of results in the same way as the official template.

## Dependencies (versions)

- `@fhevm/mock-utils`: 0.1.0 (frontend)
- `@fhevm/solidity`: ^0.8.0 (backend)
- `@fhevm/hardhat-plugin`: ^0.1.0 (backend)
- `hardhat-deploy`: ^0.12.4 (backend)

Other major dependencies:
- `ethers` v6, `next` v14, `react` v18, `@openzeppelin/contracts` v5

## Project structure

```
Lotto/
  backend/
    contracts/Lotto.sol
    hardhat.config.ts
    deploy/00_deploy_lotto.ts
    package.json
  frontend/
    src/app/page.tsx
    src/abi/{LottoABI.ts,LottoAddresses.ts}
    src/fhevm/** (Relayer integration, signature, mock)
    src/hooks/useLotto.tsx
    package.json
  scripts/genabi.mjs
```

## How the DApp works

- Buy: Users encrypt a chosen number (1..99) on the frontend using Relayer SDK (`instance.createEncryptedInput(...); input.add8(num); await input.encrypt()`), then call `buyTicket(handle, proof)`.
- Draw: The contract generates an encrypted winning number on-chain using `FHE.randEuint32` and computes each ticket’s encrypted `isWinner` using `FHE.eq`. Both the contract and the ticket owner are granted ACL to decrypt.
- Decrypt: On the frontend, the user requests an EIP-712 decryption signature (`FhevmDecryptionSignature.loadOrSign(...)`) and calls `instance.userDecrypt(...)` to obtain their clear result locally.

No plaintext winning numbers or ticket numbers are revealed on-chain. Only the user can decrypt their own results.

## Prerequisites

- Node.js 18+
- pnpm or npm

## 1) Backend: install, compile, deploy

```
cd Lotto/backend
pnpm install   # or npm install
pnpm compile   # or npm run compile
# start a local FHEVM hardhat node in a separate terminal (see notes below)
pnpm deploy    # deploys Lotto to hardhat (chainId 31337)
```

Notes:
- Use the FHEVM-enabled hardhat node from the Zama template toolchain (the plugin will expose `fhevm_relayer_metadata`).
- For Sepolia deployment, set your env vars via `npx hardhat vars set` (MNEMONIC, INFURA_API_KEY, ETHERSCAN_API_KEY).

## 2) Frontend: generate ABI/addresses, run dev server

After deployment, export ABI and addresses to the frontend:

```
cd Lotto/frontend
pnpm install
pnpm genabi     # copies deployments ABI/address into src/abi
pnpm dev        # start Next.js
```

Open the app at http://localhost:3000.

## Frontend encryption/decryption (matches official template)

- Encryption (inputs):
  - `const input = instance.createEncryptedInput(contractAddress, userAddress);`
  - `input.add8(num);`
  - `const enc = await input.encrypt();`
  - Call `contract.buyTicket(enc.handles[0], enc.inputProof)`

- Decryption (views):
  - Build EIP-712 signature once per user per set of contracts using `FhevmDecryptionSignature.loadOrSign(...)`.
  - Call `instance.userDecrypt([{ handle, contractAddress }], signature...)` to retrieve clear results.

This is identical to Zama’s official FHEVM template flow (`createEncryptedInput` / `input.encrypt` / `userDecrypt`).

## Contract overview

The single contract `Lotto.sol` (inherits `SepoliaConfig`) uses the FHE library:
- Stores encrypted ticket numbers `euint8` per tokenId
- Generates encrypted winning number: `FHE.randEuint32()` → range-map to 1..99
- Computes encrypted winner flag per ticket: `FHE.eq(ticket.number, winning)`
- Grants ACL with `FHE.allowThis(...)` and `FHE.allow(..., user)` so only the owner and the contract can decrypt
- Exposes encrypted getters to the UI:
  - `getTicketNumber(tokenId) -> euint8`
  - `getTicketResult(tokenId) -> ebool`
  - `getWinningNumber(round) -> euint8`

## Local development with Hardhat FHEVM mock

When running against a local Hardhat node (chainId 31337), the frontend automatically creates a mock FHEVM instance using `@fhevm/mock-utils` by reading `fhevm_relayer_metadata`. This mirrors the official template’s behavior and avoids bundling the entire SDK for local usage.

## Security and privacy

- Encrypted operations only; no plaintext lottery numbers on-chain
- Results are per-user decryptable, using ACL and EIP-712 signed decryption requests
- The draw randomness uses FHEVM random + mapping to [1..99]

## Troubleshooting

- If frontend shows no address, ensure backend is deployed and run `pnpm genabi` in `Lotto/frontend`.
- If mock instance fails, verify you are running a FHEVM-enabled Hardhat node (responds to `fhevm_relayer_metadata`).
- If decryption fails, re-sign the EIP-712 request by triggering `Decrypt` again.

## License

MIT
