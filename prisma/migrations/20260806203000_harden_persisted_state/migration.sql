-- Fail closed when records are written outside Prisma and keep update clocks
-- database-owned. This migration is additive and preserves the initial history.
CREATE FUNCTION "jarvis_set_updated_at"() RETURNS trigger AS $$
BEGIN
  NEW."updated_at" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "bridge_transfers_set_updated_at"
BEFORE UPDATE ON "bridge_transfers"
FOR EACH ROW EXECUTE FUNCTION "jarvis_set_updated_at"();

CREATE TRIGGER "transaction_intents_set_updated_at"
BEFORE UPDATE ON "transaction_intents"
FOR EACH ROW EXECUTE FUNCTION "jarvis_set_updated_at"();

CREATE TRIGGER "ai_ledger_states_set_updated_at"
BEFORE UPDATE ON "ai_ledger_states"
FOR EACH ROW EXECUTE FUNCTION "jarvis_set_updated_at"();

ALTER TABLE "bridge_transfers"
  ADD CONSTRAINT "bridge_transfers_message_digest_format" CHECK ("message_digest" ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT "bridge_transfers_payload_object" CHECK (jsonb_typeof("payload") = 'object');
ALTER TABLE "bridge_attestations"
  ADD CONSTRAINT "bridge_attestations_payload_object" CHECK (jsonb_typeof("payload") = 'object');
ALTER TABLE "allocation_plans"
  ADD CONSTRAINT "allocation_plans_payload_object" CHECK (jsonb_typeof("payload") = 'object');
ALTER TABLE "claim_events"
  ADD CONSTRAINT "claim_events_network_by_chain" CHECK (
    ("chain" = 'sui' AND "network" IN ('mainnet', 'testnet', 'devnet', 'localnet')) OR
    ("chain" = 'solana' AND "network" IN ('mainnet-beta', 'testnet', 'devnet'))
  ),
  ADD CONSTRAINT "claim_events_payload_object" CHECK (jsonb_typeof("payload") = 'object');
ALTER TABLE "vesting_snapshots"
  ADD CONSTRAINT "vesting_snapshots_payload_object" CHECK (jsonb_typeof("payload") = 'object');
ALTER TABLE "transaction_intents"
  ADD CONSTRAINT "transaction_intents_payload_digest_format" CHECK ("payload_digest" ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT "transaction_intents_network_by_chain" CHECK (
    ("chain" = 'sui' AND "network" IN ('mainnet', 'testnet', 'devnet', 'localnet')) OR
    ("chain" = 'solana' AND "network" IN ('mainnet-beta', 'testnet', 'devnet'))
  ),
  ADD CONSTRAINT "transaction_intents_payload_object" CHECK (jsonb_typeof("payload") = 'object');
ALTER TABLE "ai_ledger_states"
  ADD CONSTRAINT "ai_ledger_states_payload_object" CHECK (jsonb_typeof("payload") = 'object');
ALTER TABLE "audit_events"
  ADD CONSTRAINT "audit_events_payload_object" CHECK (jsonb_typeof("payload") = 'object');
