# Token database schemas

Portable JSON Schema Draft 2020-12 contracts for token-facing persistence, monitoring, reconciliation, and audit data. They are intentionally independent from Prisma so indexers, support tooling, SDKs, workers, and external systems can validate JARVIS records without importing the platform database client.

| Schema | Purpose |
| --- | --- |
| `canonical-asset.schema.json` | Canonical asset and exact representation model. |
| `representation.schema.json` | Individual Sui/Solana representation records. |
| `metadata.schema.json` | Public token metadata document. |
| `deployment.schema.json` | Verified deployment identities and environment evidence. |
| `authority-snapshot.schema.json` | Solana mint/freeze authority security evidence. |
| `supply-snapshot.schema.json` | Cross-chain supply accounting snapshot. |
| `bridge-reserve-snapshot.schema.json` | Lock/mint/burn/release reserve reconciliation evidence. |
| `token-health.schema.json` | User/operations-facing token health state. |
| `token-event.schema.json` | Portable token-domain event envelope. |

All token amounts are decimal strings in persistence formats. JavaScript floating-point numbers must never be used for JARVIS accounting. Schema roots reject unknown fields by default to reduce accidental contract drift.

Run:

```bash
pnpm token:schemas:validate
```
