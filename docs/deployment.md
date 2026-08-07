# JARVIS token deployment evidence

JARVIS has two separate readiness concepts.

## Canonical Sui issuance

`canonicalSuiDeploymentReadiness()` requires independently observed evidence for:

- published package ID;
- canonical `CoinType`;
- metadata object;
- frozen `FixedSupply<JARVIS>` proof object;
- publish transaction digest;
- exact observed supply of `18,440,000,000,000,000` base units;
- absence of a live `TreasuryCap`;
- explicit verification.

A canonical token may be ready while the cross-chain bridge is still disabled.

## Solana bridged representation

`bridgedSolanaDeploymentReadiness()` additionally requires:

- official Token-2022 mint;
- Wormhole NTT manager identity;
- approved mint/bridge authority;
- disabled freeze authority;
- verified zero genesis supply;
- Wormhole provider identity;
- explicit verification.

## Full cross-chain readiness

`deploymentReadiness()` combines both evidence sets. `tokenRuntimeReadiness()` uses canonical-only readiness while bridging is disabled and full readiness when bridging is enabled.

Never set `verified: true` from configuration alone. Verification represents independently observed network evidence.
