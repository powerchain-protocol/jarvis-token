# JARVIS Mainnet contract profile

Production Sui profile for the canonical JARVIS token source at `../jarvis_token/sources/jarvis.move`.

This directory intentionally contains **no copy** of `jarvis.move`. `Move.toml` is combined with the canonical source in an isolated generated build directory by `scripts/prepare-sui-contract-profile.mjs`.

Publishing this profile is not proof of a production deployment. Production readiness additionally requires independently verified package/coin identities, fixed-supply finalization evidence, canonical SHA-256 deployment commitment, and signer/signature evidence.
