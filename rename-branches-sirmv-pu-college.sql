-- Restores the original branch names: "SIR MV PU College - <campus>"
-- Undoes rename-branches-manchester-technologies.sql.
-- Run with:  psql "$env:DATABASE_URL" -f rename-branches-sirmv-pu-college.sql
BEGIN;
UPDATE branches SET name = 'SIR MV PU College - Davangere'  WHERE id = 'branch-dvg';
UPDATE branches SET name = 'SIR MV PU College - Shivamogga' WHERE id = 'branch-smg';
UPDATE branches SET name = 'SIR MV PU College - Ballari'    WHERE id = 'branch-bly';
UPDATE branches SET name = REPLACE(name, 'Manchester Technologies', 'SIR MV PU College')
WHERE name LIKE '%Manchester Technologies%';
COMMIT;
-- Verify: SELECT id, name FROM branches ORDER BY id;
