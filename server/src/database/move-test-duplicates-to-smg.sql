-- Moves the 3 test HODs, 10 test faculty, and 40 test students created by
-- seed-test-duplicates.ts from Davangere (branch-dvg) to Shivamogga
-- (branch-smg). Every row touched here has an id starting with 'test-',
-- so this only ever affects that TEST-tagged data — nothing real is moved.
--
-- Every branch has identical department/class/section/batch ids, just with
-- a '-branch-dvg' vs '-branch-smg' suffix (see postgres-seed.ts), so the
-- move is a straight suffix swap on every foreign key that currently points
-- at a Davangere department/class/section/batch.
--
-- Safe to run more than once (all WHERE clauses only match rows still on
-- '-branch-dvg', so a second run is a no-op).
--
-- Run with: psql "$DATABASE_URL" -f server/src/database/move-test-duplicates-to-smg.sql

BEGIN;

-- 1. The 3 test HODs -----------------------------------------------------
UPDATE users
SET branch_id = 'branch-smg'
WHERE id IN ('test-hod-bio', 'test-hod-cs', 'test-hod-eng');

UPDATE teacher_profiles
SET department_id = replace(department_id, '-branch-dvg', '-branch-smg')
WHERE id IN ('test-tp-hod-bio', 'test-tp-hod-cs', 'test-tp-hod-eng')
  AND department_id LIKE '%-branch-dvg';

-- Release the Davangere departments these 3 test HODs were heading...
UPDATE departments
SET hod_user_id = NULL
WHERE hod_user_id IN ('test-hod-bio', 'test-hod-cs', 'test-hod-eng')
  AND id LIKE '%-branch-dvg';

-- ...and put each one in charge of the equivalent Shivamogga department.
UPDATE departments SET hod_user_id = 'test-hod-bio' WHERE id = 'dept-bio-branch-smg';
UPDATE departments SET hod_user_id = 'test-hod-cs'  WHERE id = 'dept-cs-branch-smg';
UPDATE departments SET hod_user_id = 'test-hod-eng' WHERE id = 'dept-eng-branch-smg';

-- 2. The 10 test faculty ---------------------------------------------------
UPDATE users
SET branch_id = 'branch-smg'
WHERE id LIKE 'test-teacher-%';

UPDATE teacher_profiles
SET department_id = replace(department_id, '-branch-dvg', '-branch-smg')
WHERE id LIKE 'test-tp-teacher-%'
  AND department_id LIKE '%-branch-dvg';

-- 3. The 40 test students (20 hostel + 20 dayscholar) -----------------------
UPDATE users
SET branch_id = 'branch-smg'
WHERE id LIKE 'test-student-%';

UPDATE student_profiles
SET branch_id = 'branch-smg',
    class_id = replace(class_id, '-branch-dvg', '-branch-smg'),
    section_id = replace(section_id, '-branch-dvg', '-branch-smg'),
    batch_id = replace(batch_id, '-branch-dvg', '-branch-smg')
WHERE id LIKE 'test-sp-%'
  AND branch_id = 'branch-dvg';

COMMIT;

-- Afterwards, Davangere (branch-dvg) is back to its original 8 base
-- students / HODs / faculty, and Shivamogga (branch-smg) has its usual 1
-- base student plus these 40 test students, 10 test faculty, and 3 test
-- HODs (in departments that previously had none: Biology, Computer
-- Science, English).
--
-- To remove all of this test data entirely later (regardless of which
-- branch it's currently in), undo-test-duplicates.sql in this same folder
-- still works unchanged — it matches purely on the 'test-' id prefix.
