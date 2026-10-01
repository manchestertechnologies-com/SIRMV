-- Seeds real hostel infrastructure for Shivamogga (branch-smg), which today
-- has ZERO rows in hostels/hostel_blocks/hostel_rooms/hostel_beds (the seed
-- script only ever built hostel data for Davangere). Without this, the
-- Hostel & Residential Management page shows "0 Beds Assigned" and the
-- Daily Hostel Night Roll-Call shows "0 Residents" for Shivamogga even
-- though 20 of its (test) students are marked RESIDENT.
--
-- Mirrors the existing Davangere pattern in postgres-seed.ts: one Boys
-- hostel and one Girls hostel, each with a single block and three rooms
-- (one per floor, matching the Attendance Center's Floor 1/2/3 picker),
-- capacity 4 per room. Only 10 of each hostel's 12 beds are assigned, so
-- the UI has real "available" (unassigned) beds to show alongside the
-- allocated ones, per request.
--
-- The 20 RESIDENT test students (test-sp-001..test-sp-020, alternating
-- MALE/FEMALE per seed-test-duplicates.ts) are assigned: the 10 odd-numbered
-- ids (MALE) to the Boys hostel, the 10 even-numbered ids (FEMALE) to the
-- Girls hostel.
--
-- Safe to run more than once — every INSERT upserts on its primary key, and
-- the student_profiles/bed UPDATEs are idempotent.
--
-- Run with: psql "$DATABASE_URL" -f server/src/database/seed-hostel-smg.sql

BEGIN;

-- 1. Hostels ---------------------------------------------------------------
INSERT INTO hostels (id, branch_id, name, type) VALUES
  ('hostel-boys-smg', 'branch-smg', 'Sir MV Boys Hostel (Shivamogga)', 'BOYS'),
  ('hostel-girls-smg', 'branch-smg', 'Sir MV Girls Hostel (Shivamogga)', 'GIRLS')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type;

-- 2. Blocks ------------------------------------------------------------------
INSERT INTO hostel_blocks (id, hostel_id, name) VALUES
  ('block-a-boys-smg', 'hostel-boys-smg', 'Block A'),
  ('block-a-girls-smg', 'hostel-girls-smg', 'Block A')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 3. Rooms — one per floor (1, 2, 3) per block, capacity 4 each -------------
INSERT INTO hostel_rooms (id, block_id, room_number, floor, capacity) VALUES
  ('hroom-b101-smg', 'block-a-boys-smg', '101', 1, 4),
  ('hroom-b201-smg', 'block-a-boys-smg', '201', 2, 4),
  ('hroom-b301-smg', 'block-a-boys-smg', '301', 3, 4),
  ('hroom-g101-smg', 'block-a-girls-smg', '101', 1, 4),
  ('hroom-g201-smg', 'block-a-girls-smg', '201', 2, 4),
  ('hroom-g301-smg', 'block-a-girls-smg', '301', 3, 4)
ON CONFLICT (id) DO UPDATE SET room_number = EXCLUDED.room_number, floor = EXCLUDED.floor, capacity = EXCLUDED.capacity;

-- 4. Beds — 12 beds per hostel (4 rooms x... actually 3 rooms x 4 = 12).
--    10 assigned to the 10 same-gender test residents, 2 left empty per
--    hostel so "available beds" has real unassigned rows to show.
INSERT INTO hostel_beds (id, room_id, bed_number, student_id) VALUES
  -- Boys — 10 of the 10 MALE residents (test-sp-001,003,...,019)
  ('bed-b101-1-smg', 'hroom-b101-smg', 'Bed 1', 'test-sp-001'),
  ('bed-b101-2-smg', 'hroom-b101-smg', 'Bed 2', 'test-sp-003'),
  ('bed-b101-3-smg', 'hroom-b101-smg', 'Bed 3', 'test-sp-005'),
  ('bed-b101-4-smg', 'hroom-b101-smg', 'Bed 4', 'test-sp-007'),
  ('bed-b201-1-smg', 'hroom-b201-smg', 'Bed 1', 'test-sp-009'),
  ('bed-b201-2-smg', 'hroom-b201-smg', 'Bed 2', 'test-sp-011'),
  ('bed-b201-3-smg', 'hroom-b201-smg', 'Bed 3', 'test-sp-013'),
  ('bed-b201-4-smg', 'hroom-b201-smg', 'Bed 4', 'test-sp-015'),
  ('bed-b301-1-smg', 'hroom-b301-smg', 'Bed 1', 'test-sp-017'),
  ('bed-b301-2-smg', 'hroom-b301-smg', 'Bed 2', 'test-sp-019'),
  ('bed-b301-3-smg', 'hroom-b301-smg', 'Bed 3', NULL), -- available
  ('bed-b301-4-smg', 'hroom-b301-smg', 'Bed 4', NULL), -- available
  -- Girls — 10 of the 10 FEMALE residents (test-sp-002,004,...,020)
  ('bed-g101-1-smg', 'hroom-g101-smg', 'Bed 1', 'test-sp-002'),
  ('bed-g101-2-smg', 'hroom-g101-smg', 'Bed 2', 'test-sp-004'),
  ('bed-g101-3-smg', 'hroom-g101-smg', 'Bed 3', 'test-sp-006'),
  ('bed-g101-4-smg', 'hroom-g101-smg', 'Bed 4', 'test-sp-008'),
  ('bed-g201-1-smg', 'hroom-g201-smg', 'Bed 1', 'test-sp-010'),
  ('bed-g201-2-smg', 'hroom-g201-smg', 'Bed 2', 'test-sp-012'),
  ('bed-g201-3-smg', 'hroom-g201-smg', 'Bed 3', 'test-sp-014'),
  ('bed-g201-4-smg', 'hroom-g201-smg', 'Bed 4', 'test-sp-016'),
  ('bed-g301-1-smg', 'hroom-g301-smg', 'Bed 1', 'test-sp-018'),
  ('bed-g301-2-smg', 'hroom-g301-smg', 'Bed 2', 'test-sp-020'),
  ('bed-g301-3-smg', 'hroom-g301-smg', 'Bed 3', NULL), -- available
  ('bed-g301-4-smg', 'hroom-g301-smg', 'Bed 4', NULL)  -- available
ON CONFLICT (id) DO UPDATE SET student_id = EXCLUDED.student_id;

-- 5. Keep student_profiles in sync (is_hostelite / hostel_room_id), so
--    anything that reads those columns directly (rather than hostel_beds)
--    also reflects the assignment correctly.
UPDATE student_profiles sp
SET is_hostelite = 1,
    residence_status = 'RESIDENT',
    hostel_room_id = hb.room_id
FROM hostel_beds hb
WHERE hb.student_id = sp.id
  AND sp.branch_id = 'branch-smg';

COMMIT;

-- Afterwards, branch-smg has 2 hostels, 2 blocks, 6 rooms (floors 1-3 in
-- each block) and 24 beds, with 20 allocated to the existing test residents
-- and 4 left available/unassigned, so the Hostel & Residential Management
-- page, the Daily Hostel Night Roll-Call roster, and the Warden/Head Warden
-- Students view all have real, non-empty data to show.
