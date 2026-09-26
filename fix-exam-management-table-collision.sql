-- CORRECTIVE MIGRATION — fixes a table-name collision in the Exam
-- Management module (Phase 1). Apply this ONLY IF you already ran
-- add-exam-management-schema.sql before this fix existed.
--
-- What went wrong: add-exam-management-schema.sql originally created a
-- table named "exams". This repo already had a DIFFERENT, unrelated
-- "exams" table (used by Unit Tests / Board Marks: exam_subjects,
-- student_marks, evaluated_papers, exam_remarks). Because the migration
-- used CREATE TABLE IF NOT EXISTS, it silently did nothing — no new
-- columns (academic_year_id, pu_level, status, ...) were ever added to
-- any table, and exam_batches/exam_sessions ended up with foreign keys
-- pointing at the WRONG (old board-exam) "exams" table. Symptom:
-- "column e.academic_year_id does not exist".
--
-- The fix (already applied in code): the new module's table is now
-- called "pu_exams" everywhere, so it can never collide with the old
-- board-exam "exams" table again.
--
-- This migration creates pu_exams and repoints every dependent table's
-- exam_id foreign key at it. It is safe to drop and recreate the
-- dependent tables because the original bug meant no exam could ever be
-- successfully created — there is no real data to lose in them.
--
-- Apply with: psql "$DATABASE_URL" -f fix-exam-management-table-collision.sql

BEGIN;

-- 1. Drop the dependent tables (created empty/broken by the old
--    migration, pointing at the wrong "exams" table). CASCADE also
--    drops exam_room_allocations, exam_student_allocations,
--    exam_invigilator_requests, exam_invigilator_assignments, and
--    exam_invigilator_request_selections, which all descend from these.
DROP TABLE IF EXISTS exam_batches CASCADE;
DROP TABLE IF EXISTS exam_sessions CASCADE;

-- 2. Create the correctly-named table for this module. (If your DB
--    somehow already has a broken "exams" table from this module with
--    the new columns on it — unlikely, since CREATE TABLE IF NOT EXISTS
--    would have no-op'd — this is still safe: pu_exams is brand new.)
CREATE TABLE IF NOT EXISTS pu_exams (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  academic_year_id VARCHAR(64) NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  pu_level VARCHAR(8) NOT NULL CHECK (pu_level IN ('1 PU', '2 PU')),
  instructions TEXT,
  seating_layout VARCHAR(16) NOT NULL DEFAULT 'ZIGZAG' CHECK (seating_layout IN ('ZIGZAG', 'USHAPE')),
  separate_same_class INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'ROOMS_SELECTED', 'STUDENTS_ALLOCATED',
    'INVIGILATORS_ALLOCATED', 'READY_TO_PUBLISH', 'PUBLISHED'
  )),
  created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMPTZ
);

-- 3. Recreate the dependent tables, now referencing pu_exams(id).
CREATE TABLE IF NOT EXISTS exam_batches (
  id VARCHAR(64) PRIMARY KEY,
  exam_id VARCHAR(64) NOT NULL REFERENCES pu_exams(id) ON DELETE CASCADE,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id VARCHAR(64) NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  UNIQUE(exam_id, class_id, section_id)
);

CREATE TABLE IF NOT EXISTS exam_sessions (
  id VARCHAR(64) PRIMARY KEY,
  exam_id VARCHAR(64) NOT NULL REFERENCES pu_exams(id) ON DELETE CASCADE,
  subject_id VARCHAR(64) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  exam_date DATE NOT NULL,
  start_time VARCHAR(16) NOT NULL,
  end_time VARCHAR(16) NOT NULL,
  reporting_time VARCHAR(16),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exam_room_allocations (
  id VARCHAR(64) PRIMARY KEY,
  exam_session_id VARCHAR(64) NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  room_id VARCHAR(64) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  is_priority_room INTEGER NOT NULL DEFAULT 0,
  priority_class_id VARCHAR(64) REFERENCES classes(id) ON DELETE SET NULL,
  priority_section_id VARCHAR(64) REFERENCES sections(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_session_id, room_id)
);

CREATE TABLE IF NOT EXISTS exam_student_allocations (
  id VARCHAR(64) PRIMARY KEY,
  exam_session_id VARCHAR(64) NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  room_id VARCHAR(64) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id VARCHAR(64) NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  bench_number INTEGER NOT NULL,
  seat_number INTEGER NOT NULL,
  row_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_session_id, student_id),
  UNIQUE(exam_session_id, room_id, seat_number)
);

CREATE TABLE IF NOT EXISTS exam_invigilator_requests (
  id VARCHAR(64) PRIMARY KEY,
  exam_session_id VARCHAR(64) NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  department_id VARCHAR(64) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  required_count INTEGER NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'FULFILLED')),
  requested_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exam_invigilator_assignments (
  id VARCHAR(64) PRIMARY KEY,
  exam_session_id VARCHAR(64) NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  room_id VARCHAR(64) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  teacher_id VARCHAR(64) NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  assigned_via VARCHAR(16) NOT NULL DEFAULT 'MANUAL' CHECK (assigned_via IN ('AUTO', 'MANUAL', 'HOD')),
  request_id VARCHAR(64) REFERENCES exam_invigilator_requests(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_session_id, room_id)
);

-- 4. Phase 2's invigilator-pool-selection table also descends from
--    exam_invigilator_requests, which was just dropped and recreated —
--    so it needs recreating too (it's a no-op if it was never applied).
CREATE TABLE IF NOT EXISTS exam_invigilator_request_selections (
  id VARCHAR(64) PRIMARY KEY,
  request_id VARCHAR(64) NOT NULL REFERENCES exam_invigilator_requests(id) ON DELETE CASCADE,
  teacher_id VARCHAR(64) NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  selected_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  selected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(request_id, teacher_id)
);

-- 5. Recreate the indexes.
CREATE INDEX IF NOT EXISTS idx_exam_sessions_exam ON exam_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_room_allocations_session ON exam_room_allocations(exam_session_id);
CREATE INDEX IF NOT EXISTS idx_exam_student_allocations_session ON exam_student_allocations(exam_session_id);
CREATE INDEX IF NOT EXISTS idx_exam_student_allocations_student ON exam_student_allocations(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_invigilator_assignments_session ON exam_invigilator_assignments(exam_session_id);
CREATE INDEX IF NOT EXISTS idx_exam_invigilator_assignments_teacher ON exam_invigilator_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_exam_batches_exam ON exam_batches(exam_id);

COMMIT;

-- Note: exam_room_configs (the benches/seats-per-bench config table) did
-- NOT reference "exams" at all, so it was never affected and is left
-- untouched by this migration.
