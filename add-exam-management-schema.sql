-- Exam Management module (PU-level examinations: 1 PU / 2 PU).
-- Additive migration — reuses existing branches, academic_years, classes,
-- sections, subjects, departments, teacher_profiles, student_profiles,
-- rooms and timetable_entries. Creates only the new entities the spec
-- calls for: exams, exam sessions (one per date/subject/time so an exam
-- can span multiple papers), room exam-configs (benches/seats), room and
-- student seat allocations, and the invigilator + HOD-request workflow.
--
-- Apply with: psql "$DATABASE_URL" -f add-exam-management-schema.sql

-- 1. New role for a dedicated Exam Management department, alongside the
--    existing roles. ADMIN/PRINCIPAL keep full access too (see routes).
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
  role IN (
    'ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER', 'FLOOR_ATTENDER',
    'NON_TEACHING_STAFF', 'GATE_STAFF', 'WARDEN', 'HEAD_WARDEN',
    'STUDENT', 'PARENT', 'EXAM_DEPARTMENT'
  )
);

-- 2. Exam-specific bench/seat configuration for an existing room.
--    total capacity is always benches * seats_per_bench — computed in
--    application code, never stored, so it can't drift out of sync.
CREATE TABLE IF NOT EXISTS exam_room_configs (
  room_id VARCHAR(64) PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  benches INTEGER NOT NULL DEFAULT 15,
  seats_per_bench INTEGER NOT NULL DEFAULT 2,
  is_available_for_exams INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. An exam (may span several dates/subjects — see exam_sessions).
CREATE TABLE IF NOT EXISTS exams (
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

-- 4. Which class+section combinations ("batches" in the spec's sense —
--    e.g. "2 PU PCMB A") are writing this exam.
CREATE TABLE IF NOT EXISTS exam_batches (
  id VARCHAR(64) PRIMARY KEY,
  exam_id VARCHAR(64) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id VARCHAR(64) NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  UNIQUE(exam_id, class_id, section_id)
);

-- 5. One paper: a subject on a specific date/time within the exam.
--    "Do not assume one exam consists of only one paper."
CREATE TABLE IF NOT EXISTS exam_sessions (
  id VARCHAR(64) PRIMARY KEY,
  exam_id VARCHAR(64) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id VARCHAR(64) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  exam_date DATE NOT NULL,
  start_time VARCHAR(16) NOT NULL,
  end_time VARCHAR(16) NOT NULL,
  reporting_time VARCHAR(16),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Rooms selected for a session (automatic or manual), with a flag for
--    whether this room was chosen because it's the batch's own regular
--    classroom (Priority 1 in the allocation algorithm).
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

-- 7. One row per student per session: their seat.
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

-- 8. Exam Department -> HOD invigilator requests.
CREATE TABLE IF NOT EXISTS exam_invigilator_requests (
  id VARCHAR(64) PRIMARY KEY,
  exam_session_id VARCHAR(64) NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  department_id VARCHAR(64) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  required_count INTEGER NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'FULFILLED')),
  requested_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Final invigilator-per-room assignments (auto, manual, or via an HOD
--    request). One primary invigilator per room per session.
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

CREATE INDEX IF NOT EXISTS idx_exam_sessions_exam ON exam_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_room_allocations_session ON exam_room_allocations(exam_session_id);
CREATE INDEX IF NOT EXISTS idx_exam_student_allocations_session ON exam_student_allocations(exam_session_id);
CREATE INDEX IF NOT EXISTS idx_exam_student_allocations_student ON exam_student_allocations(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_invigilator_assignments_session ON exam_invigilator_assignments(exam_session_id);
CREATE INDEX IF NOT EXISTS idx_exam_invigilator_assignments_teacher ON exam_invigilator_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_exam_batches_exam ON exam_batches(exam_id);
