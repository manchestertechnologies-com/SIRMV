-- Run this against your Neon database to move the "Default Batch" setting
-- from the whole class down to each individual section (e.g. "1 PUC
-- Section A" -> "NEET Batch", "1 PUC Section B" -> "Regular PU"), set from
-- the Classes admin page. This supersedes add-class-default-batch.sql —
-- run this even if you already ran that one; it's safe either way.

ALTER TABLE sections ADD COLUMN IF NOT EXISTS default_batch_id VARCHAR(64) REFERENCES batches(id) ON DELETE SET NULL;

-- The old class-level column is no longer used by the app. Safe to drop
-- (only skips if it was never added).
ALTER TABLE classes DROP COLUMN IF EXISTS default_batch_id;
