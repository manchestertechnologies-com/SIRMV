-- Run this against your Neon database BEFORE deploying the converted students.ts.
-- Using ADD COLUMN IF NOT EXISTS so it's safe to run even if some of these
-- were already added manually — it won't error on a live database.

ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS category VARCHAR(64);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS sslc_result VARCHAR(64);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS residence_status VARCHAR(32) DEFAULT 'NON_RESIDENT' CHECK (residence_status IN ('RESIDENT', 'NON_RESIDENT'));
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS admission_type VARCHAR(32) DEFAULT '1ST_PU' CHECK (admission_type IN ('1ST_PU', '2ND_PU', 'LONG_TERM'));
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 1;
