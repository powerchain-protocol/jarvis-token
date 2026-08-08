# JARVIS token deployment evidence

JARVIS has two separate readiness concepts.

## Canonical Sui issuance

`canonicalSuiDeploymentReadiness()` requires independently observed evidence for:

- published package ID;
- canonical `CoinType`;
- metadata object;
- frozen `FixedSupply<JARVIS>` proof object;
- publish transaction digest;
- exact observed supply of `20,000,000,000,000,000` base units;
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

## Hardened production deployment evidence

Production releases must validate the full Sui package/coin/object identities and the Solana Token-2022 mint, NTT manager, bridge program, and mint-authority identities. Deployment facts are committed with deterministic canonical JSON + SHA-256 and paired signer/signature evidence. See `docs/deployment-evidence.md`.
