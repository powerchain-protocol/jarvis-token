import type { PrismaClient } from "@prisma/client";

export const EXPECTED_DATABASE_MIGRATIONS = Object.freeze([
  "20260806170000_initial_persistence",
  "20260806203000_harden_persisted_state",
  "20260806220000_restrict_public_access",
  "20260806233000_add_finality_anchors",
  "20260807001000_commit_finality_anchors",
]);

export const EXPECTED_DATABASE_TABLES = Object.freeze([
  "ai_ledger_states", "allocation_plans", "audit_events", "bridge_attestations",
  "bridge_transfers", "claim_events", "transaction_intents", "vesting_snapshots",
]);

export interface DatabaseReadinessReport {
  ready: boolean;
  expectedMigrationCount: number;
  completedMigrationCount: number;
  missingMigrations: string[];
  incompleteMigrations: string[];
  missingTables: string[];
  tablesWithoutRls: string[];
}

export interface ReadonlyDatabaseQuery {
  query<T>(sql: string): Promise<T[]>;
}

interface MigrationRow { migration_name: string; finished_at: Date | string | null; rolled_back_at: Date | string | null; }
interface TableRow { table_name: string; rls_enabled: boolean; }

/** Pure report builder, separated from Prisma so readiness behavior is unit-testable. */
export async function inspectDatabaseReadiness(query: ReadonlyDatabaseQuery): Promise<DatabaseReadinessReport> {
  const migrations = await query.query<MigrationRow>(
    'SELECT "migration_name", "finished_at", "rolled_back_at" FROM "_prisma_migrations" ORDER BY "migration_name"',
  );
  const tables = await query.query<TableRow>(
    "SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY c.relname",
  );
  const migrationByName = new Map(migrations.map((row) => [row.migration_name, row]));
  const tableByName = new Map(tables.map((row) => [row.table_name, row]));
  const missingMigrations = EXPECTED_DATABASE_MIGRATIONS.filter((name) => !migrationByName.has(name));
  const incompleteMigrations = EXPECTED_DATABASE_MIGRATIONS.filter((name) => {
    const row = migrationByName.get(name);
    return row !== undefined && (row.finished_at === null || row.rolled_back_at !== null);
  });
  const missingTables = EXPECTED_DATABASE_TABLES.filter((name) => !tableByName.has(name));
  const tablesWithoutRls = EXPECTED_DATABASE_TABLES.filter((name) => tableByName.get(name)?.rls_enabled === false);
  const completedMigrationCount = EXPECTED_DATABASE_MIGRATIONS.length - missingMigrations.length - incompleteMigrations.length;
  return {
    ready: missingMigrations.length === 0 && incompleteMigrations.length === 0 && missingTables.length === 0 && tablesWithoutRls.length === 0,
    expectedMigrationCount: EXPECTED_DATABASE_MIGRATIONS.length, completedMigrationCount,
    missingMigrations, incompleteMigrations, missingTables, tablesWithoutRls,
  };
}

/** Runs only fixed, read-only inspection SQL. */
export function inspectPrismaDatabaseReadiness(db: PrismaClient): Promise<DatabaseReadinessReport> {
  return inspectDatabaseReadiness({ query: <T>(sql: string) => db.$queryRawUnsafe<T[]>(sql) });
}
