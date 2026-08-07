# JARVIS token deployment evidence

JARVIS has two separate readiness concepts.

## Canonical Sui issuance

`canonicalSuiDeploymentReadiness()` requires independently observed evidence for:

- published package ID;
- canonical `CoinType`;
- metadata object;
- frozen `FixedSupply<JARVIS>` proof object;
- frozen `GenesisReceipt` object recording recipient, decimals, and exact genesis supply;
- publish transaction digest;
- exact observed supply of `18,440,000,000,000,000` base units;
- absence of a live `TreasuryCap`;
- explicit verification.

A canonical token may be ready while the cross-chain bridge is still disabled.

## Solana bridged representation

`bridgedSolanaDeploymentReadiness()` additionally requires:

- official Token-2022 mint;
- Wormhole NTT manager identity;
- JARVIS Solana bridge policy program identity;
- canonical Sui Wormhole chain/domain ID (`21`);
- configured per-transfer cap within the fixed monetary maximum;
- approved mint/bridge authority;
- disabled freeze authority;
- verified zero genesis supply;
- Wormhole provider identity;
- explicit verification.

## Full cross-chain readiness

`deploymentReadiness()` combines both evidence sets. `tokenRuntimeReadiness()` uses canonical-only readiness while bridging is disabled and full readiness when bridging is enabled.

Never set `verified: true` from configuration alone. Verification represents independently observed network evidence.


## Critical bridge configuration

The bridge policy layers are intentionally separate from token issuance.

- `token/contracts/sui-*` owns canonical issuance and immutable genesis evidence.
- `contracts/jarvis_bridge/` owns Sui custody lock/release.
- `programs/solana-jarvis-bridge/` owns Solana Token-2022 mint/burn policy.

Both policy programs enforce a configurable per-transfer ceiling. Raising the ceiling, rotating the verification transceiver, changing the rate window, or manually resetting a rate window must not be used to bypass live safety controls. Transceiver rotation and rate-window resets require the bridge to be paused.

The Solana program additionally binds inbound redemption to the configured canonical Sui Wormhole domain before minting bridged JARVIS.

Deployment templates remain paused and unverified until independently observed evidence is recorded.
