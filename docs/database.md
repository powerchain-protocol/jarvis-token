# Database, Prisma, Neon, and Supabase

JARVIS uses one PostgreSQL-compatible Prisma schema for self-hosted PostgreSQL,
Neon, and Supabase. Database support is persistence only: it does not sign,
broadcast, attest, redeem, mint, burn, or infer that stored chain evidence is
valid. Core validators run before repository writes.

## Connection roles

Set `DATABASE_URL` for pooled application traffic and `DIRECT_URL` for the
direct or session connection reserved for Prisma migrations. Set
`JARVIS_DATABASE_PROVIDER` to `postgresql`, `neon`, or `supabase`.

Production validation requires TLS and different runtime/migration URLs. A
transaction pooler on port `6543` is rejected for `DIRECT_URL`. Neon runtime
URLs normally use a `-pooler` hostname. Supabase serverless runtime traffic
normally uses Supavisor transaction mode while migrations use a direct or
session connection. Copy exact strings from the provider console and never
commit credentials.

## Install and validate

```bash
npm ci
npm run prisma:generate
npm run db:validate
npm run jarvis -- validate-database-config --production
```

The validator reports only provider and host roles; credentials and complete
URLs are never printed.

## Migrations

Review SQL under `prisma/migrations/`, then run from a reviewed operator
environment:

```bash
npm run db:migrate:status
npm run db:migrate:deploy
npm run db:readiness
```

No install, build, test, planning, or readiness command applies a migration.
Never use `prisma migrate reset` against shared or production databases.

`db:readiness` is read-only. It checks that every migration shipped with this
release finished without rollback, all eight expected tables exist, and RLS is
enabled on each table. Its JSON report contains names and counts only—never
connection URLs or credentials—and exits non-zero when a gate fails.

Finalized transaction and claim records also project their block height and
block hash into indexed columns while retaining the complete validated anchor
inside JSON evidence. Legacy rows remain nullable for migration safety; current
application validators require anchors for all new terminal records.

Each anchor also has a canonical SHA-256 commitment in
`finality_anchor_digest`. The follow-up migration uses `NOT VALID` constraints:
existing legacy rows can be upgraded deliberately, while every new or modified
claim and transaction row must satisfy the terminal-status finality rules.

The hardening migration also protects writes made outside Prisma: payloads must
remain JSON objects, SHA-256 fields must retain canonical form, chain/network
pairs must agree, and PostgreSQL triggers own mutable-record timestamps. Apply
every committed migration in order; never edit a migration already applied to
a shared environment.

The access-control migration enables PostgreSQL Row Level Security on every
JARVIS table, revokes table privileges from `PUBLIC`, and—when running on
Supabase—revokes the `anon` and `authenticated` roles. It intentionally creates
no client policy. The dedicated server-side Prisma owner remains the supported
access path. If a deployment uses a non-owner application role, grant only its
required table privileges and add narrowly scoped policies in a separately
reviewed migration; never expose the Prisma credential to a client.

## Stored records

The initial migration stores bridge transfers and attestations, approved
allocation commitments, finalized claim events, verified vesting snapshots,
guarded transaction intents, versioned AI ledger state, and append-only audit
events. Amounts remain canonical decimal strings. PostgreSQL constraints enforce
positive values, chronology, uniqueness, foreign keys, and recognized states.
Bridge, guarded-transaction, and AI-ledger writes use optimistic locking and
revalidate persisted payloads. A caller encountering a version conflict must
reload the latest record and reapply the intended state transition; silently
overwriting a concurrent change is not supported.

Audit events accept only bounded, normalized aggregate/event identifiers, ISO
timestamps, and plain JSON-object payloads. Their SHA-256 commitment uses
recursively sorted object keys, so semantically identical payloads produce the
same digest regardless of insertion order. Arrays retain their original order.

Prisma owns only these application tables. Do not migrate Supabase-managed
`auth`, `storage`, or other managed schemas, and never reuse the server Prisma
role in browsers or mobile clients.

Use separate Neon branches or Supabase projects for testnet rehearsals. Branch
creation, backups, credential rotation, and promotion remain operator actions.

## Explorer helpers

`packages/token-core/src/explorers.ts` provides validated Sui and Solana
transaction/account/object URLs. It binds links to an explicit network and
rejects malformed identifiers, cross-type Sui identifiers, unrealistic Solana
signature lengths, or public localnet links. Explorer links are
diagnostic conveniences, not chain-finality evidence.
