-- Rebrand: "SIR MV PU College" -> "Manchester Technologies"
-- Updates the human-readable branch names shown throughout the app
-- (Navbar/Sidebar "branchName", DashboardHome subtitle, report headers, etc.
-- all read currentBranch.name from this table). Branch ids/codes/emails are
-- left untouched so existing logins and references keep working.
--
-- Run with:
--   psql "$DATABASE_URL" -f rename-branches-manchester-technologies.sql

BEGIN;

UPDATE branches SET name = 'Manchester Technologies - Davangere'  WHERE id = 'branch-dvg';
UPDATE branches SET name = 'Manchester Technologies - Shivamogga' WHERE id = 'branch-smg';
UPDATE branches SET name = 'Manchester Technologies - Ballari'    WHERE id = 'branch-bly';

-- Catch-all in case a branch was created under a different id but still
-- carries the old name somewhere (safe no-op if none match).
UPDATE branches SET name = REPLACE(name, 'SIR MV PU College', 'Manchester Technologies')
WHERE name LIKE '%SIR MV PU College%';

COMMIT;

-- Verify:
-- SELECT id, name FROM branches ORDER BY id;
