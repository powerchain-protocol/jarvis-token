import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { databaseConfigurationSummary, loadDatabaseConfiguration } from "../packages/token-core/src/database/config.js";
import { assertAiLedgerPersistenceTransition, assertTransactionFinalityProjection, assertTransactionPersistenceTransition, digestAuditPayload } from "../packages/token-core/src/database/repositories.js";
import { EXPECTED_DATABASE_MIGRATIONS, EXPECTED_DATABASE_TABLES, inspectDatabaseReadiness } from "../packages/token-core/src/database/readiness.js";

const secret = "correct-horse-battery-staple";

describe("PostgreSQL provider configuration", () => {
  it("separates Neon pooled runtime and direct migration connections", () => {
    const config = loadDatabaseConfiguration({ NODE_ENV: "production", JARVIS_DATABASE_PROVIDER: "neon", DATABASE_URL: `postgresql://jarvis:${secret}@ep-green-pooler.eu-central-1.aws.neon.tech/jarvis?sslmode=require&connection_limit=5`, DIRECT_URL: `postgresql://jarvis:${secret}@ep-green.eu-central-1.aws.neon.tech/jarvis?sslmode=require` }, true);
    expect(databaseConfigurationSummary(config)).toEqual({ provider: "neon", runtimeHost: "ep-green-pooler.eu-central-1.aws.neon.tech", directHost: "ep-green.eu-central-1.aws.neon.tech", pooledRuntime: true, credentialsRedacted: true });
  });

  it("accepts Supabase transaction pooling only for runtime", () => {
    const config = loadDatabaseConfiguration({ NODE_ENV: "production", JARVIS_DATABASE_PROVIDER: "supabase", DATABASE_URL: `postgresql://postgres.project:${secret}@aws-0-eu.pooler.supabase.com:6543/postgres?sslmode=require&connection_limit=1`, DIRECT_URL: `postgresql://postgres:${secret}@db.project.supabase.co:5432/postgres?sslmode=require` }, true);
    expect(config.pooledRuntime).toBe(true);
    expect(() => loadDatabaseConfiguration({ JARVIS_DATABASE_PROVIDER: "supabase", DATABASE_URL: config.runtimeUrl, DIRECT_URL: config.runtimeUrl }, true)).toThrow(/separated/);
    expect(() => loadDatabaseConfiguration({ JARVIS_DATABASE_PROVIDER: "supabase", DATABASE_URL: config.runtimeUrl, DIRECT_URL: config.runtimeUrl.replace("aws-0-eu.pooler", "migration.pooler") }, false)).toThrow(/must not use a transaction pooler/);
  });

  it("rejects insecure production URLs and preserves required relational constraints", () => {
    expect(() => loadDatabaseConfiguration({ JARVIS_DATABASE_PROVIDER: "neon", DATABASE_URL: `postgresql://jarvis:${secret}@ep-green-pooler.neon.tech/jarvis`, DIRECT_URL: `postgresql://jarvis:${secret}@ep-green.neon.tech/jarvis` }, true)).toThrow(/require TLS/);
    const migration = readFileSync("prisma/migrations/20260806170000_initial_persistence/migration.sql", "utf8");
    expect(migration).toContain('UNIQUE ("transfer_id", "transceiver")');
    expect(migration).toContain('"transaction_id" TEXT NOT NULL UNIQUE');
    expect(migration).toContain('CHECK ("observed_at" >= "claimed_at")');
    expect(migration).toContain('ON DELETE RESTRICT');
    const hardening = readFileSync("prisma/migrations/20260806203000_harden_persisted_state/migration.sql", "utf8");
    expect(hardening).toContain('jsonb_typeof("payload") = \'object\'');
    expect(hardening).toContain('"transaction_intents_network_by_chain"');
    expect(hardening).toContain('CREATE TRIGGER "ai_ledger_states_set_updated_at"');
    const access = readFileSync("prisma/migrations/20260806220000_restrict_public_access/migration.sql", "utf8");
    expect(access.match(/ENABLE ROW LEVEL SECURITY/g)).toHaveLength(8);
    expect(access).toContain("FROM PUBLIC");
    expect(access).toContain("ARRAY['anon', 'authenticated']");
    expect(access).not.toContain("CREATE POLICY");
    const finality = readFileSync("prisma/migrations/20260806233000_add_finality_anchors/migration.sql", "utf8");
    expect(finality).toContain('"finality_block_height"');
    expect(finality).toContain('"finality_block_hash"');
    expect(finality).toContain('CREATE INDEX "transaction_intents_finality_block_idx"');
    const commitments = readFileSync("prisma/migrations/20260807001000_commit_finality_anchors/migration.sql", "utf8");
    expect(commitments).toContain('"finality_anchor_digest"');
    expect(commitments).toContain('"transaction_intents_finality_by_status"');
    expect(commitments.match(/NOT VALID/g)).toHaveLength(2);
  });

  it("rejects persisted state regression and ledger inflation", () => {
    const intent = { intentId: "intent-0000001", nonce: "nonce-00000000001", reference: "ai-order-1", chain: "sui", network: "testnet", kind: "ai-payment", from: `0x${"a".repeat(64)}`, to: `0x${"b".repeat(64)}`, amountBaseUnits: "10", assetId: `0x${"c".repeat(64)}::jarvis::JARVIS`, createdAt: "2026-08-06T12:00:00.000Z", expiresAt: "2026-08-06T13:00:00.000Z", metadataDigest: "d".repeat(64) } as const;
    const confirmed = { intent, payloadDigest: "e".repeat(64), status: "confirmed", proposalId: "proposal-1", transactionId: "tx".repeat(32), submittedAt: "2026-08-06T12:10:00.000Z", confirmedAt: "2026-08-06T12:11:00.000Z" } as const;
    expect(() => assertTransactionPersistenceTransition(confirmed, { ...confirmed, status: "submitted", confirmedAt: undefined } as never)).toThrow(/status transition/);
    const ledger = { accountId: "account-1", balanceBaseUnits: "100", reservations: [] };
    expect(() => assertAiLedgerPersistenceTransition(ledger, { ...ledger, balanceBaseUnits: "101" })).toThrow(/cannot increase/);
    const reserved = { ...ledger, reservations: [{ id: "reserve-1", idempotencyKey: "idempotency-1", sessionId: "session-1", amountBaseUnits: "10", status: "reserved" as const }] };
    expect(() => assertAiLedgerPersistenceTransition(reserved, ledger)).toThrow(/cannot be removed/);
  });

  it("hashes equivalent audit payloads canonically", () => {
    expect(digestAuditPayload({ b: 2, a: { y: true, x: [1, "two"] } })).toBe(digestAuditPayload({ a: { x: [1, "two"], y: true }, b: 2 }));
    expect(digestAuditPayload({ amount: "10" })).not.toBe(digestAuditPayload({ amount: "11" }));
    expect(() => digestAuditPayload({ invalid: undefined })).toThrow(/undefined/);
    expect(() => digestAuditPayload({ invalid: Number.NaN })).toThrow(/non-finite/);
  });

  it("reports migration and RLS readiness without writes", async () => {
    const queries: string[] = [];
    const ready = await inspectDatabaseReadiness({ query: async <T>(sql: string) => {
      queries.push(sql);
      return (sql.includes("_prisma_migrations")
        ? EXPECTED_DATABASE_MIGRATIONS.map((migration_name) => ({ migration_name, finished_at: new Date(), rolled_back_at: null }))
        : EXPECTED_DATABASE_TABLES.map((table_name) => ({ table_name, rls_enabled: true }))) as T[];
    }});
    expect(ready).toMatchObject({ ready: true, expectedMigrationCount: 5, completedMigrationCount: 5, missingTables: [], tablesWithoutRls: [] });
    expect(queries.every((sql) => /^SELECT /.test(sql))).toBe(true);

    const blocked = await inspectDatabaseReadiness({ query: async <T>(sql: string) => (sql.includes("_prisma_migrations")
      ? [{ migration_name: EXPECTED_DATABASE_MIGRATIONS[0], finished_at: new Date(), rolled_back_at: null }, { migration_name: EXPECTED_DATABASE_MIGRATIONS[1], finished_at: null, rolled_back_at: null }]
      : [{ table_name: EXPECTED_DATABASE_TABLES[0], rls_enabled: false }]) as T[] });
    expect(blocked.ready).toBe(false);
    expect(blocked.missingMigrations).toEqual([EXPECTED_DATABASE_MIGRATIONS[2], EXPECTED_DATABASE_MIGRATIONS[3], EXPECTED_DATABASE_MIGRATIONS[4]]);
    expect(blocked.incompleteMigrations).toEqual([EXPECTED_DATABASE_MIGRATIONS[1]]);
    expect(blocked.tablesWithoutRls).toEqual([EXPECTED_DATABASE_TABLES[0]]);
  });

  it("rejects mismatched block-data projections", () => {
    const record = { intent: { chain: "sui", network: "mainnet" }, blockAnchor: { chain: "sui", network: "mainnet", blockHeight: "1", blockHash: "8".repeat(44), finality: "finalized" } } as never;
    expect(() => assertTransactionFinalityProjection(record, { finalityBlockHeight: "2", finalityBlockHash: "8".repeat(44), finalityAnchorDigest: "0".repeat(64) })).toThrow(/does not match payload/);
  });
});
