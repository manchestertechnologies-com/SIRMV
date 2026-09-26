-- Run this against your Neon database. Idempotent (safe to re-run).
--
-- Fixes:
-- 1) "column specialization of relation teacher_profiles does not exist" —
--    teachers.ts inserts/updates specialization + experience_years on
--    teacher_profiles, and teacher_assignments.academic_year_id, but none
--    of these columns existed in the original schema.
-- 2) Adds the missing Electronics / Sanskrit / Hindi departments (existing
--    branches already have Physics/Chemistry/Maths/Biology/CS/English/Kannada).
-- 3) Adds a UNIQUE(teacher_id, date) constraint to teacher_absences so
--    marking the same teacher absent twice on the same day can no longer
--    silently create duplicate rows (root cause of the "5 absent but no
--    absences reported" / duplicated-periods bug in the Substitution Hub).
-- 4) Adds a staff_category column to users (for Non-Teaching & Operational
--    Staff: Floor In Charge / Cleaning / Bus / Warden / Mess) and a generic
--    staff_attendance table (present/absent marking for any staff member,
--    one row per person per day).

ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS specialization VARCHAR(255);
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0;

ALTER TABLE teacher_assignments ADD COLUMN IF NOT EXISTS academic_year_id VARCHAR(64) REFERENCES academic_years(id) ON DELETE SET NULL;

-- Missing departments, added for every existing branch (skips any branch
-- that already has a department with that code).
INSERT INTO departments (id, branch_id, name, code)
SELECT 'dept-elec-' || b.id, b.id, 'Electronics Department', 'ELEC'
FROM branches b
WHERE NOT EXISTS (SELECT 1 FROM departments d WHERE d.branch_id = b.id AND d.code = 'ELEC');

INSERT INTO departments (id, branch_id, name, code)
SELECT 'dept-sans-' || b.id, b.id, 'Sanskrit Department', 'SANS'
FROM branches b
WHERE NOT EXISTS (SELECT 1 FROM departments d WHERE d.branch_id = b.id AND d.code = 'SANS');

INSERT INTO departments (id, branch_id, name, code)
SELECT 'dept-hin-' || b.id, b.id, 'Hindi Department', 'HIN'
FROM branches b
WHERE NOT EXISTS (SELECT 1 FROM departments d WHERE d.branch_id = b.id AND d.code = 'HIN');

-- De-duplicate any existing teacher_absences rows before adding the unique
-- constraint (keeps the earliest row per teacher/date, safe no-op if there
-- are no duplicates yet).
DELETE FROM teacher_absences a USING teacher_absences b
WHERE a.teacher_id = b.teacher_id AND a.date = b.date AND a.created_at > b.created_at;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teacher_absences_teacher_date_unique'
  ) THEN
    ALTER TABLE teacher_absences ADD CONSTRAINT teacher_absences_teacher_date_unique UNIQUE (teacher_id, date);
  END IF;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_category VARCHAR(64);

CREATE TABLE IF NOT EXISTS staff_attendance (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date VARCHAR(32) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'ABSENT')),
  marked_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, date)
);
