-- Student Portal module: hostel grievances (reach the Warden) and hostel
-- room maintenance requests (reach the Warden/Head Warden), both filed by
-- resident students about their own room. Additive migration — reuses
-- existing branches, student_profiles, hostel_rooms and users tables.
--
-- Apply with: psql "$DATABASE_URL" -f add-student-portal-schema.sql

-- 1. Grievances — a resident student's complaint/concern, routed to the
--    Warden / Head Warden of their branch. Independent of outpasses.
CREATE TABLE IF NOT EXISTS grievances (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  category VARCHAR(64) DEFAULT 'GENERAL', -- GENERAL, ROOMMATE, MESS_FOOD, SAFETY, STAFF_BEHAVIOUR, OTHER
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(32) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
  response TEXT,
  responded_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_grievances_branch ON grievances(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_grievances_student ON grievances(student_id);

-- 2. Hostel room maintenance requests — a resident student reporting a
--    cleaning/repair issue in their own allotted room, routed the same way.
CREATE TABLE IF NOT EXISTS hostel_maintenance_requests (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  room_id VARCHAR(64) NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
  category VARCHAR(32) DEFAULT 'MAINTENANCE' CHECK (category IN ('CLEANING', 'MAINTENANCE', 'ELECTRICAL', 'PLUMBING', 'FURNITURE', 'OTHER')),
  description TEXT NOT NULL,
  status VARCHAR(32) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_hostel_maint_branch ON hostel_maintenance_requests(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_hostel_maint_room ON hostel_maintenance_requests(room_id);

-- 3. A simple, informational weekly cleaning schedule per hostel block —
--    one row per day of the week, so the student portal has something real
--    to display rather than a hardcoded string. Admin/Warden can edit later;
--    for now it's seeded with a sensible default per existing block below.
CREATE TABLE IF NOT EXISTS hostel_cleaning_schedule (
  id VARCHAR(64) PRIMARY KEY,
  block_id VARCHAR(64) NOT NULL REFERENCES hostel_blocks(id) ON DELETE CASCADE,
  day_of_week VARCHAR(16) NOT NULL, -- Monday .. Sunday
  task VARCHAR(255) NOT NULL,       -- e.g. "Room & corridor cleaning", "Bathroom deep-clean"
  time_slot VARCHAR(64) DEFAULT 'Morning (7:00 - 9:00 AM)',
  UNIQUE (block_id, day_of_week, task)
);

-- Seed a default weekly schedule for every hostel block that exists today
-- (safe to re-run; ON CONFLICT ignores rows already present).
INSERT INTO hostel_cleaning_schedule (id, block_id, day_of_week, task, time_slot)
SELECT 'hcs-' || hb.id || '-' || dow.day || '-room', hb.id, dow.day, 'Room & corridor cleaning', 'Morning (7:00 - 9:00 AM)'
FROM hostel_blocks hb
CROSS JOIN (VALUES ('Monday'), ('Wednesday'), ('Friday')) AS dow(day)
ON CONFLICT (block_id, day_of_week, task) DO NOTHING;

INSERT INTO hostel_cleaning_schedule (id, block_id, day_of_week, task, time_slot)
SELECT 'hcs-' || hb.id || '-' || dow.day || '-bath', hb.id, dow.day, 'Bathroom & washroom deep-clean', 'Morning (6:30 - 8:00 AM)'
FROM hostel_blocks hb
CROSS JOIN (VALUES ('Tuesday'), ('Saturday')) AS dow(day)
ON CONFLICT (block_id, day_of_week, task) DO NOTHING;
