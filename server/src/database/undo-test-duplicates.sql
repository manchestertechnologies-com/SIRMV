-- Removes every row added by seed-test-duplicates.ts — every one of them
-- has an id starting with 'test-', so this is exact and doesn't touch any
-- real or base-demo data. Safe to run even if the test data was never
-- added (all DELETEs just affect 0 rows).
--
-- Run with: psql "$DATABASE_URL" -f server/src/database/undo-test-duplicates.sql

-- Restore the 3 departments that were given a test HOD back to no HOD.
UPDATE departments SET hod_user_id = NULL WHERE hod_user_id LIKE 'test-hod-%';

DELETE FROM student_profiles WHERE id LIKE 'test-sp-%';
DELETE FROM teacher_profiles WHERE id LIKE 'test-tp-%';
DELETE FROM users WHERE id LIKE 'test-student-%' OR id LIKE 'test-teacher-%' OR id LIKE 'test-hod-%';
