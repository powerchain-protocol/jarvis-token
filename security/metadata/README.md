# JARVIS token metadata

This directory contains canonical public metadata and deterministic integrity evidence.

- `metadata.json` — human/public token metadata and artwork references.
- `sui.json` — canonical Sui representation profile; deployment IDs remain null until verified.
- `solana.json` — official Token-2022 bridged representation profile.
- `security.json` — immutable security/activation expectations.
- `logo-manifest.json` — source variants, generated sizes/formats, and display policy.
- `asset-manifest.json` — SHA-256 digests for source artwork and all generated derivatives.
- `integrity-manifest.json` — deterministic SHA-256 commitment across token config, metadata, schemas, contracts, and Solana profiles.

Do not mark a deployment `verified` until its public identities have been independently checked against the target network and the bridge authority policy.

On-chain observations are runtime evidence and are not mixed into static token metadata. They belong in the observation storage models and are timestamped independently so historical verification remains auditable.

## Deployment profiles

Static public metadata is not deployment proof. Environment-specific evidence lives in `token/config/deployments/{testnet,mainnet}.json`. Canonical Sui evidence includes package, coin type, metadata object, fixed-supply proof object, publish transaction, observed supply, and TreasuryCap-consumption verification. Solana evidence includes the Token-2022 mint, Wormhole NTT manager/authority, zero-genesis-supply verification, and disabled freeze authority.
