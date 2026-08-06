ALTER TABLE "claim_events"
  ADD COLUMN "finality_block_height" TEXT,
  ADD COLUMN "finality_block_hash" TEXT,
  ADD CONSTRAINT "claim_events_finality_anchor_pair" CHECK (
    ("finality_block_height" IS NULL AND "finality_block_hash" IS NULL) OR
    ("finality_block_height" ~ '^(0|[1-9][0-9]*)$' AND "finality_block_hash" ~ '^[1-9A-HJ-NP-Za-km-z]{40,50}$')
  );
CREATE INDEX "claim_events_finality_block_idx" ON "claim_events" ("chain", "network", "finality_block_height");

ALTER TABLE "transaction_intents"
  ADD COLUMN "finality_block_height" TEXT,
  ADD COLUMN "finality_block_hash" TEXT,
  ADD CONSTRAINT "transaction_intents_finality_anchor_pair" CHECK (
    ("finality_block_height" IS NULL AND "finality_block_hash" IS NULL) OR
    ("finality_block_height" ~ '^(0|[1-9][0-9]*)$' AND "finality_block_hash" ~ '^[1-9A-HJ-NP-Za-km-z]{40,50}$')
  );
CREATE INDEX "transaction_intents_finality_block_idx" ON "transaction_intents" ("chain", "network", "finality_block_height");
