ALTER TABLE "claim_events"
  ADD COLUMN "finality_anchor_digest" TEXT,
  ADD CONSTRAINT "claim_events_finality_digest_format" CHECK (
    "finality_anchor_digest" IS NULL OR "finality_anchor_digest" ~ '^[a-f0-9]{64}$'
  ),
  ADD CONSTRAINT "claim_events_require_finality_anchor" CHECK (
    "finality_block_height" IS NOT NULL AND "finality_block_hash" IS NOT NULL AND "finality_anchor_digest" IS NOT NULL
  ) NOT VALID;

ALTER TABLE "transaction_intents"
  ADD COLUMN "finality_anchor_digest" TEXT,
  ADD CONSTRAINT "transaction_intents_finality_digest_format" CHECK (
    "finality_anchor_digest" IS NULL OR "finality_anchor_digest" ~ '^[a-f0-9]{64}$'
  ),
  ADD CONSTRAINT "transaction_intents_finality_by_status" CHECK (
    ("status" IN ('confirmed', 'failed') AND "finality_block_height" IS NOT NULL AND "finality_block_hash" IS NOT NULL AND "finality_anchor_digest" IS NOT NULL) OR
    ("status" IN ('planned', 'authorized', 'submitted') AND "finality_block_height" IS NULL AND "finality_block_hash" IS NULL AND "finality_anchor_digest" IS NULL)
  ) NOT VALID;

CREATE INDEX "claim_events_finality_digest_idx" ON "claim_events" ("finality_anchor_digest");
CREATE INDEX "transaction_intents_finality_digest_idx" ON "transaction_intents" ("finality_anchor_digest");
