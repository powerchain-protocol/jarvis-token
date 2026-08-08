# JARVIS Token Sale

Standalone, fail-closed Next.js sale application. It intentionally does not own token monetary policy; it consumes canonical identifiers and sale configuration at the deployment boundary.

## Production gates

- `JARVIS_SALE_ENABLED` remains false until contract IDs and legal approvals are complete.
- Prices and token amounts are integer base-unit strings. Never use JS floating point for settlement.
- Quote and purchase endpoints must be rate-limited, idempotent, simulated, and server-verified.
- Wallet adapters sign client-side; seed phrases/private keys never enter the app backend.
- Cache only public chain/config reads. Quotes, eligibility, wallet state and purchase results are `no-store`.
- Mainnet enablement requires deployment evidence, package/coin type verification, treasury ownership verification, and destroyed Sui package `UpgradeCap` after the intended immutable release.
