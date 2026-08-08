# JARVIS Token — Deployment Hardening Build

This build strengthens production deployment evidence without changing JARVIS economics.

## Added

- full 32-byte Sui package/object identity validation;
- exact package binding inside the canonical Sui coin type;
- exact 32-byte Solana public-key decoding for mint, NTT manager, bridge program and mint authority;
- production-only deployment readiness gate;
- deterministic canonical deployment manifests;
- SHA-256 deployment commitments;
- tamper detection;
- canonical ISO-8601 timestamp enforcement;
- paired signer/signature evidence records;
- optional injected cryptographic signature verification;
- production on-chain finalization checks for exact Sui supply, destroyed TreasuryCap, frozen metadata, disabled Solana freeze authority and expected Solana mint authority;
- release CLI helpers and regression tests.

## Unchanged

- 20B fixed supply;
- 6 decimals;
- Sui canonical issuance;
- no post-genesis canonical minting;
- Solana Token-2022 bridged representation;
- Wormhole NTT;
- exact 1:1 lock/mint/burn/release accounting.
