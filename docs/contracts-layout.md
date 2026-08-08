# Contract source and environment profiles

JARVIS uses a single-source Move layout to prevent production/test source drift.

- `contracts/jarvis_token/sources/jarvis.move` is authoritative.
- `contracts/mainnet/` selects the production Sui framework revision and rc.1 package identity.
- `contracts/devnet/` selects the non-production Devnet framework revision and rc.1 package identity.
- Generated build directories under `.build/sui/` are disposable and excluded from integrity/deployment evidence.

The canonical module preserves the fixed monetary constants and finalization behavior. Mainnet evidence is separate from build output and remains governed by canonical SHA-256 deployment manifests plus paired signer/signature evidence.
