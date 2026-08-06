-- Deny browser/API access by default. The dedicated Prisma database role owns
-- these server-side tables; any future client policy requires separate review.
ALTER TABLE "bridge_transfers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bridge_attestations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "allocation_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "claim_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vesting_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transaction_intents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_ledger_states" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  "bridge_transfers", "bridge_attestations", "allocation_plans", "claim_events",
  "vesting_snapshots", "transaction_intents", "ai_ledger_states", "audit_events"
FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION "jarvis_set_updated_at"() FROM PUBLIC;

DO $$
DECLARE
  role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE %s FROM %I',
        '"bridge_transfers", "bridge_attestations", "allocation_plans", "claim_events", "vesting_snapshots", "transaction_intents", "ai_ledger_states", "audit_events"',
        role_name
      );
    END IF;
  END LOOP;
END;
$$;
