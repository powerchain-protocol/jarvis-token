# JARVIS token storage

Provider-neutral storage contracts keep canonical asset state and immutable snapshots independent from Prisma, Sui, Solana, Wormhole, and RPC clients.

`InMemoryTokenStorage` is only a deterministic development/test adapter. Production persistence should use the platform persistence layer and preserve:

- immutable snapshot IDs;
- SHA-256 digests;
- ISO-8601 timestamps;
- append-only supply/authority/reconciliation history;
- exact base-unit strings in database-facing records;
- canonical asset version/concurrency semantics where mutable administrative state is stored.

The authoritative token supply remains on-chain. Database snapshots are evidence and indexing material, not issuance authority.
