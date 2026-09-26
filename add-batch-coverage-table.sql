-- Run this against your Neon database to enable specifying which
-- class/section combinations a batch (NEET/JEE/KCET/Regular PU) covers,
-- on the Batches admin page. Safe to run even if it was already added.

CREATE TABLE IF NOT EXISTS batch_coverage (
  id VARCHAR(64) PRIMARY KEY,
  batch_id VARCHAR(64) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id VARCHAR(64) NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  UNIQUE (batch_id, section_id)
);
