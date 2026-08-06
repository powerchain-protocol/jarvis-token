# JARVIS Token-2022

This workspace defines the policy program and TypeScript scripts used to create
and verify the JARVIS Token-2022 mint.

## Mint specification

- Program: Token-2022
- Symbol: JARVIS
- Decimals: 6
- Fixed supply: 18,440,000,000 JARVIS
- Fixed base-unit supply: 18,440,000,000,000,000
- Extensions: Metadata Pointer and Token Metadata
- Metadata pointer: mint itself
- Mint authority: revoked after the one-time fixed-supply mint
- Freeze authority: none by default

The Anchor policy program does not replace Token-2022. It records and enforces
Jarvis-specific policy while the mint remains owned by Token-2022.

## Build

```bash
pnpm solana:build
pnpm solana:test
```

## Devnet

```bash
pnpm solana:deploy:devnet
pnpm solana:initialize-token
pnpm solana:verify-token
```

Replace all placeholder program IDs, URLs, and authority references before use.
Production deployment requires an independent smart-contract and operational
security review.
