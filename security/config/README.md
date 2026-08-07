# Token configuration

- `asset.json` is the canonical machine-readable identity and representation registry for JARVIS.
- `tokenomics.policy.json` freezes monetary-policy constants used by code and tests.

Bridge and infrastructure configuration belongs in the root `config/` tree and references these token sources rather than duplicating token identity.
