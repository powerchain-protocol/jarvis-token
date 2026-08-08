# JARVIS Sui contracts

The standalone token has one authoritative Move module and environment-specific build profiles:

```text
contracts/
├── jarvis_token/
│   └── sources/jarvis.move    # only canonical JARVIS Move source
├── mainnet/
│   ├── Move.toml              # production framework/release profile
│   └── profile.json
└── devnet/
    ├── Move.toml              # non-production framework/release profile
    └── profile.json
```

The profile directories intentionally do not duplicate `jarvis.move`. `scripts/prepare-sui-contract-profile.mjs` creates a disposable build package by combining one profile manifest with the canonical source.

The Move module enforces 6 decimals and exactly 20,000,000,000 JARVIS (20,000,000,000,000,000 base units), consumes the original `TreasuryCap`, freezes metadata and the fixed-supply proof, and exposes no post-genesis canonical mint path.

Mainnet publishing remains release-gated by independently verified deployment evidence and Wormhole NTT bridge configuration. Devnet output is never production deployment, reserve, tokenomics, or bridge-backing evidence.
