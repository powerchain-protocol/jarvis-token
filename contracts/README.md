# Canonical JARVIS Sui token contracts

Token issuance belongs to the **JARVIS token domain**. Bridge custody belongs to the Bridge domain.

```text
token/contracts/
├── sui-mainnet/   canonical Mainnet package profile
└── sui-testnet/   Testnet validation/deployment profile

contracts/jarvis_bridge/
└── cross-chain lock/release vault (not token issuance)
```

The two Sui profiles intentionally mirror the same `sources/jarvis.move`. Their `Move.toml` files select the appropriate Sui framework/network revision. `token:sui-profiles:validate` rejects source drift.

## Fixed-supply issuance

Publishing the package:

1. creates JARVIS with 6 decimals;
2. mints exactly `18,440,000,000,000,000` base units (`18,440,000,000` JARVIS);
3. verifies the created total supply;
4. consumes the `TreasuryCap` into a `Supply<JARVIS>`;
5. freezes the `CoinMetadata`;
6. freezes the `FixedSupply<JARVIS>` proof;
7. transfers the complete initial supply to the publisher for approved treasury/allocation operations.

Because the `TreasuryCap` is consumed, the canonical package has no post-genesis mint authority. Canonical Sui JARVIS is locked/released by the bridge; it is not burned to manufacture the Solana representation.

## Solana representation

The official Solana asset is **JARVIS · Bridged**, implemented as Token-2022 with zero genesis supply. Its approved Wormhole NTT authority may mint only against verified canonical custody and burns the representation on the reverse route before Sui release. Freeze authority must remain disabled.

## Deployment evidence

Templates live under `token/config/deployments/`. They remain disabled and unverified until real network identities are recorded and independently checked. Do not put private signing material in deployment profiles.
