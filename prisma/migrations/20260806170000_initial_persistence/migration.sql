CREATE TABLE "bridge_transfers" (
  "transfer_id" TEXT PRIMARY KEY,
  "message_digest" TEXT NOT NULL UNIQUE,
  "direction" TEXT NOT NULL CHECK ("direction" IN ('sui-to-solana', 'solana-to-sui')),
  "status" TEXT NOT NULL CHECK ("status" IN ('pending-attestations', 'ready-to-redeem', 'completed', 'manual-review')),
  "amount_base_units" TEXT NOT NULL CHECK ("amount_base_units" ~ '^[1-9][0-9]*$'),
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "payload" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("transfer_id", "version")
);
CREATE INDEX "bridge_transfers_status_direction_idx" ON "bridge_transfers" ("status", "direction");

CREATE TABLE "bridge_attestations" (
  "attestation_id" TEXT PRIMARY KEY,
  "transfer_id" TEXT NOT NULL REFERENCES "bridge_transfers"("transfer_id") ON DELETE CASCADE,
  "transceiver" TEXT NOT NULL,
  "observed_at" TIMESTAMPTZ NOT NULL,
  "payload" JSONB NOT NULL,
  UNIQUE ("transfer_id", "transceiver")
);
CREATE INDEX "bridge_attestations_transfer_observed_idx" ON "bridge_attestations" ("transfer_id", "observed_at");

CREATE TABLE "allocation_plans" (
  "allocation_commitment_sha256" TEXT PRIMARY KEY CHECK ("allocation_commitment_sha256" ~ '^[a-f0-9]{64}$'),
  "token_version" TEXT NOT NULL,
  "governance_record" TEXT NOT NULL,
  "approved_at" TIMESTAMPTZ NOT NULL,
  "payload" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "allocation_plans_approved_at_idx" ON "allocation_plans" ("approved_at");

CREATE TABLE "claim_events" (
  "claim_id" TEXT PRIMARY KEY,
  "transaction_id" TEXT NOT NULL UNIQUE,
  "allocation_commitment_sha256" TEXT NOT NULL REFERENCES "allocation_plans"("allocation_commitment_sha256") ON DELETE RESTRICT,
  "allocation_id" TEXT NOT NULL,
  "chain" TEXT NOT NULL CHECK ("chain" IN ('sui', 'solana')),
  "network" TEXT NOT NULL,
  "amount_base_units" TEXT NOT NULL CHECK ("amount_base_units" ~ '^[1-9][0-9]*$'),
  "claimed_at" TIMESTAMPTZ NOT NULL,
  "observed_at" TIMESTAMPTZ NOT NULL CHECK ("observed_at" >= "claimed_at"),
  "payload" JSONB NOT NULL
);
CREATE INDEX "claim_events_allocation_observed_idx" ON "claim_events" ("allocation_commitment_sha256", "observed_at");
CREATE INDEX "claim_events_chain_network_transaction_idx" ON "claim_events" ("chain", "network", "transaction_id");

CREATE TABLE "vesting_snapshots" (
  "snapshot_sha256" TEXT PRIMARY KEY CHECK ("snapshot_sha256" ~ '^[a-f0-9]{64}$'),
  "allocation_commitment_sha256" TEXT NOT NULL REFERENCES "allocation_plans"("allocation_commitment_sha256") ON DELETE RESTRICT,
  "claim_ledger_sha256" TEXT NOT NULL CHECK ("claim_ledger_sha256" ~ '^[a-f0-9]{64}$'),
  "as_of" TIMESTAMPTZ NOT NULL,
  "payload" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("allocation_commitment_sha256", "as_of")
);
CREATE INDEX "vesting_snapshots_as_of_idx" ON "vesting_snapshots" ("as_of");

CREATE TABLE "transaction_intents" (
  "intent_id" TEXT PRIMARY KEY,
  "nonce" TEXT NOT NULL UNIQUE,
  "business_reference" TEXT NOT NULL UNIQUE,
  "payload_digest" TEXT NOT NULL UNIQUE,
  "chain" TEXT NOT NULL CHECK ("chain" IN ('sui', 'solana')),
  "network" TEXT NOT NULL,
  "status" TEXT NOT NULL CHECK ("status" IN ('planned', 'authorized', 'submitted', 'confirmed', 'failed')),
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "payload" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("intent_id", "version")
);
CREATE INDEX "transaction_intents_status_chain_network_idx" ON "transaction_intents" ("status", "chain", "network");

CREATE TABLE "ai_ledger_states" (
  "ledger_id" TEXT PRIMARY KEY,
  "account_id" TEXT NOT NULL UNIQUE,
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "payload" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("ledger_id", "version")
);

CREATE TABLE "audit_events" (
  "id" TEXT PRIMARY KEY,
  "aggregate_type" TEXT NOT NULL,
  "aggregate_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload_digest" TEXT NOT NULL CHECK ("payload_digest" ~ '^[a-f0-9]{64}$'),
  "payload" JSONB NOT NULL,
  "occurred_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "audit_events_aggregate_idx" ON "audit_events" ("aggregate_type", "aggregate_id", "occurred_at");
CREATE INDEX "audit_events_type_idx" ON "audit_events" ("event_type", "occurred_at");
