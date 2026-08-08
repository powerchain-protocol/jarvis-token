# Production token invariants

This document is normative for the JARVIS token release gate.

## Monetary invariants

- Maximum supply: **20,000,000,000 JARVIS**.
- Decimals: **6**.
- Maximum base units: **20,000,000,000,000,000**.
- Canonical issuance: **Sui**.
- Canonical minting after genesis: **disabled** by consuming the Sui `TreasuryCap`.
- Canonical metadata: frozen after initialization.
- Solana representation: **Token-2022**, bridged through **Wormhole NTT**.
- Solana genesis bridged supply: **0**.
- Solana freeze authority: **disabled**.
- Solana mint authority: must equal the independently verified bridge/NTT authority recorded in deployment evidence.

## Bridge accounting

Forward direction:

1. lock canonical JARVIS on Sui;
2. verify the Wormhole/NTT message;
3. mint the identical number of base units on Solana.

Reverse direction:

1. burn bridged JARVIS on Solana;
2. verify the Wormhole/NTT message;
3. release the identical number of locked canonical base units on Sui.

Pending reverse burns remain a canonical custody liability until release. At no point may bridged supply plus pending liabilities exceed the canonical amount locked for bridge backing.

## Deployment evidence

A production evidence set is incomplete unless it binds all of:

- full Sui package ID;
- exact Sui coin type using that package ID;
- Sui metadata object;
- Sui fixed-supply proof object;
- Sui publish transaction digest;
- Solana Token-2022 mint;
- Solana Wormhole NTT manager program;
- Solana JARVIS bridge program;
- Solana mint-authority key/PDA.

The canonical deployment manifest is SHA-256 committed using deterministic canonical JSON. Any mutation changes the commitment and is rejected. Release signature evidence is paired with a signer identity and canonical signing timestamp.
