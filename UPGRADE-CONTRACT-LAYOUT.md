# JARVIS Token rc.1 — canonical contract layout upgrade

This release removes duplicated Sui token source mirrors and establishes one authoritative Move module:

```text
contracts/jarvis_token/sources/jarvis.move
```

Environment-specific framework and release settings are kept separately:

```text
contracts/mainnet/
contracts/devnet/
```

Neither environment profile may contain a committed `jarvis.move` copy. `scripts/prepare-sui-contract-profile.mjs` combines a selected `Move.toml` with the canonical source into `.build/sui/<profile>` for compilation/publishing workflows.

The economic and bridge invariants remain unchanged: 20B fixed supply, 6 decimals, consumed Sui TreasuryCap after genesis issuance, no post-genesis canonical minting, Solana as a Wormhole NTT bridged representation, and exact 1:1 reserve accounting.
