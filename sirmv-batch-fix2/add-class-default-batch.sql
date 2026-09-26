-- Run this against your Neon database to let each class have an optional
-- default/typical batch (e.g. "1 PUC" -> "NEET Batch"), set from the
-- Classes admin page. This is a safety-net default only — the batch
-- actually stored on a student is still whatever is chosen (or defaulted)
-- at registration time. Safe to run even if it was already added.

ALTER TABLE classes ADD COLUMN IF NOT EXISTS default_batch_id VARCHAR(64) REFERENCES batches(id) ON DELETE SET NULL;
