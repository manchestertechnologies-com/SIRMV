-- SIR MV PU College PostgreSQL Database Schema
-- Multi-branch support: Davangere, Shivamogga, Ballari
-- Compatible with PostgreSQL 14+ / Neon Serverless Postgres

-- 1. Branches
CREATE TABLE IF NOT EXISTS branches (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64) NOT NULL UNIQUE,
  city VARCHAR(128) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(64) NOT NULL,
  email VARCHAR(128) NOT NULL,
  logo_url TEXT,
  principal_name VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  username VARCHAR(128) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL CHECK(role IN ('ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER', 'FLOOR_ATTENDER', 'NON_TEACHING_STAFF', 'GATE_STAFF', 'WARDEN', 'HEAD_WARDEN', 'STUDENT', 'PARENT')),
  name VARCHAR(128) NOT NULL,
  email VARCHAR(128),
  phone VARCHAR(64),
  avatar_url TEXT,
  is_active INTEGER DEFAULT 1,
  staff_category VARCHAR(64), -- Non-teaching staff job category: Floor In Charge / Cleaning / Bus / Warden / Mess
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Academic Structure
CREATE TABLE IF NOT EXISTS academic_years (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  is_current INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,
  code VARCHAR(64) NOT NULL,
  hod_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS classes (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL -- e.g. '1 PUC', '2 PUC'
);

CREATE TABLE IF NOT EXISTS sections (
  id VARCHAR(64) PRIMARY KEY,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name VARCHAR(64) NOT NULL -- e.g. 'A', 'B', 'C'
);

CREATE TABLE IF NOT EXISTS batches (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL, -- e.g. 'NEET', 'JEE', 'KCET', 'Regular PU'
  code VARCHAR(64) NOT NULL
);

-- Which class/section combinations a batch covers (e.g. NEET Batch covers
-- 1 PUC Section A and 2 PUC Section A). This is now DERIVED automatically
-- from actual student registrations (see GET /batches/:id) rather than set
-- manually, so this table is kept only for backward compatibility and is
-- no longer written to by the app.
CREATE TABLE IF NOT EXISTS batch_coverage (
  id VARCHAR(64) PRIMARY KEY,
  batch_id VARCHAR(64) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id VARCHAR(64) NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  UNIQUE (batch_id, section_id)
);

-- Optional default/typical batch for a class (e.g. "1 PUC" defaults to
-- "NEET Batch"), set from the Classes admin page as a safety-net default
-- that can still be overridden per-student at registration time. Added
-- here, after `batches`, since `classes` is declared earlier in this file
-- and can't forward-reference it in its own CREATE TABLE.
ALTER TABLE classes ADD COLUMN IF NOT EXISTS default_batch_id VARCHAR(64) REFERENCES batches(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS subjects (
  id VARCHAR(64) PRIMARY KEY,
  department_id VARCHAR(64) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL, -- Physics, Chemistry, Mathematics, Biology, Computer Science, English, Kannada, Hindi
  code VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  room_number VARCHAR(64) NOT NULL,
  floor INTEGER NOT NULL,
  building VARCHAR(128) DEFAULT 'Main Academic Block',
  capacity INTEGER DEFAULT 60
);

-- Assigned classroom for a section (added here, after `rooms`, since
-- `sections` is declared earlier in this file and can't forward-reference it
-- in its own CREATE TABLE).
ALTER TABLE sections ADD COLUMN IF NOT EXISTS room_id VARCHAR(64) REFERENCES rooms(id) ON DELETE SET NULL;

-- 4. Teacher Profiles & Academic Assignments
CREATE TABLE IF NOT EXISTS teacher_profiles (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  employee_id VARCHAR(64) NOT NULL UNIQUE,
  photo_url TEXT,
  date_of_birth VARCHAR(64),
  phone VARCHAR(64),
  email VARCHAR(128),
  address TEXT,
  department_id VARCHAR(64) REFERENCES departments(id) ON DELETE SET NULL,
  designation VARCHAR(128) NOT NULL,
  joining_date VARCHAR(64),
  qualification VARCHAR(255),
  specialization VARCHAR(255),
  experience_years INTEGER DEFAULT 0,
  is_hod INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teacher_assignments (
  id VARCHAR(64) PRIMARY KEY,
  teacher_id VARCHAR(64) NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  department_id VARCHAR(64) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  subject_id VARCHAR(64) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id VARCHAR(64) NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  batch_id VARCHAR(64) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  academic_year_id VARCHAR(64) REFERENCES academic_years(id) ON DELETE SET NULL,
  is_class_teacher INTEGER DEFAULT 0
);

-- 5. Hostels Hierarchy (Defined before student_profiles / hostel_beds)
CREATE TABLE IF NOT EXISTS hostels (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,
  type VARCHAR(32) NOT NULL CHECK(type IN ('BOYS', 'GIRLS'))
);

CREATE TABLE IF NOT EXISTS hostel_blocks (
  id VARCHAR(64) PRIMARY KEY,
  hostel_id VARCHAR(64) NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL
);

CREATE TABLE IF NOT EXISTS hostel_rooms (
  id VARCHAR(64) PRIMARY KEY,
  block_id VARCHAR(64) NOT NULL REFERENCES hostel_blocks(id) ON DELETE CASCADE,
  room_number VARCHAR(64) NOT NULL,
  floor INTEGER NOT NULL,
  capacity INTEGER DEFAULT 4
);

-- 6. Student Profiles
CREATE TABLE IF NOT EXISTS student_profiles (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  register_number VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  photo_url TEXT,
  date_of_birth VARCHAR(64),
  gender VARCHAR(32),
  phone VARCHAR(64),
  email VARCHAR(128),
  address TEXT,
  parent_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  parent_name VARCHAR(128) NOT NULL,
  parent_phone VARCHAR(64) NOT NULL,
  parent_email VARCHAR(128),
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  section_id VARCHAR(64) NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  batch_id VARCHAR(64) NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  is_hostelite INTEGER DEFAULT 0,
  hostel_room_id VARCHAR(64) REFERENCES hostel_rooms(id) ON DELETE SET NULL,
  category VARCHAR(64), -- caste category shown on the student's own profile (General/OBC/SC/ST/EWS etc.)
  sslc_result VARCHAR(64),
  residence_status VARCHAR(32) DEFAULT 'NON_RESIDENT' CHECK (residence_status IN ('RESIDENT', 'NON_RESIDENT')),
  admission_type VARCHAR(32) DEFAULT '1ST_PU' CHECK (admission_type IN ('1ST_PU', '2ND_PU', 'LONG_TERM')),
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hostel_beds (
  id VARCHAR(64) PRIMARY KEY,
  room_id VARCHAR(64) NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
  bed_number VARCHAR(64) NOT NULL,
  student_id VARCHAR(64) UNIQUE REFERENCES student_profiles(id) ON DELETE SET NULL
);

-- 7. Timetable, Absences & Substitution System
CREATE TABLE IF NOT EXISTS timetable_entries (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  day_of_week VARCHAR(32) NOT NULL, -- Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
  period_number INTEGER NOT NULL,
  start_time VARCHAR(16) NOT NULL, -- e.g. '08:45'
  end_time VARCHAR(16) NOT NULL,   -- e.g. '09:30'
  subject_id VARCHAR(64) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id VARCHAR(64) NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  batch_id VARCHAR(64) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  room_id VARCHAR(64) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  teacher_id VARCHAR(64) NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teacher_absences (
  id VARCHAR(64) PRIMARY KEY,
  teacher_id VARCHAR(64) NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  date VARCHAR(32) NOT NULL,
  reason TEXT,
  status VARCHAR(32) DEFAULT 'RECORDED', -- RECORDED, CANCELLED
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (teacher_id, date)
);

-- Generic present/absent attendance marking for any staff member (teaching
-- or non-teaching), one row per person per day.
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

CREATE TABLE IF NOT EXISTS substitution_assignments (
  id VARCHAR(64) PRIMARY KEY,
  timetable_entry_id VARCHAR(64) NOT NULL REFERENCES timetable_entries(id) ON DELETE CASCADE,
  date VARCHAR(32) NOT NULL,
  original_teacher_id VARCHAR(64) NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  substitute_teacher_id VARCHAR(64) NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  assigned_by VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status VARCHAR(32) DEFAULT 'ASSIGNED' CHECK(status IN ('ASSIGNED', 'ACKNOWLEDGED', 'REJECTED')),
  acknowledged_at TIMESTAMPTZ,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Floor Attender & Lecture Sessions
CREATE TABLE IF NOT EXISTS lecture_sessions (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  timetable_entry_id VARCHAR(64) REFERENCES timetable_entries(id) ON DELETE SET NULL,
  date VARCHAR(32) NOT NULL,
  academic_year VARCHAR(64) NOT NULL,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  section_id VARCHAR(64) NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  batch_id VARCHAR(64) NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  subject_id VARCHAR(64) NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  teacher_id VARCHAR(64) NOT NULL REFERENCES teacher_profiles(id) ON DELETE RESTRICT,
  substitute_teacher_id VARCHAR(64) REFERENCES teacher_profiles(id) ON DELETE SET NULL,
  room_id VARCHAR(64) NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  floor INTEGER NOT NULL,
  scheduled_start VARCHAR(16) NOT NULL,
  scheduled_end VARCHAR(16) NOT NULL,
  teacher_time_in VARCHAR(16),
  lecture_start_time VARCHAR(16),
  lecture_end_time VARCHAR(16),
  teacher_time_out VARCHAR(16),
  teacher_status VARCHAR(32) DEFAULT 'PRESENT' CHECK(teacher_status IN ('PRESENT', 'ABSENT', 'LATE', 'SUBSTITUTE')),
  classroom_photo_url TEXT,
  recording_url TEXT,
  floor_attender_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  remarks TEXT,
  finalization_status VARCHAR(32) DEFAULT 'PENDING' CHECK(finalization_status IN ('PENDING', 'COMPLETED')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lecture_concepts (
  id VARCHAR(64) PRIMARY KEY,
  lecture_session_id VARCHAR(64) NOT NULL UNIQUE REFERENCES lecture_sessions(id) ON DELETE CASCADE,
  chapter VARCHAR(255) NOT NULL,
  concept VARCHAR(255) NOT NULL,
  topic_taught TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Student Class Attendance
CREATE TABLE IF NOT EXISTS attendance_records (
  id VARCHAR(64) PRIMARY KEY,
  lecture_session_id VARCHAR(64) NOT NULL REFERENCES lecture_sessions(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL CHECK(status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'MEDICAL', 'ON_LEAVE')),
  detection_confidence DOUBLE PRECISION,
  match_status VARCHAR(32), -- 'CONFIRMED', 'UNCERTAIN', 'NOT_DETECTED', 'MANUAL'
  marked_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  verified_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lecture_session_id, student_id)
);

CREATE TABLE IF NOT EXISTS attendance_photos (
  id VARCHAR(64) PRIMARY KEY,
  lecture_session_id VARCHAR(64) NOT NULL REFERENCES lecture_sessions(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  detections_json TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Evening Study Attendance
CREATE TABLE IF NOT EXISTS evening_study_sessions (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  date VARCHAR(32) NOT NULL,
  study_hall VARCHAR(128) NOT NULL,
  floor INTEGER NOT NULL,
  start_time VARCHAR(16) NOT NULL,
  end_time VARCHAR(16) NOT NULL,
  supervisor_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evening_study_attendance (
  id VARCHAR(64) PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL REFERENCES evening_study_sessions(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  entry_time VARCHAR(16),
  exit_time VARCHAR(16),
  duration_minutes INTEGER,
  status VARCHAR(32) NOT NULL CHECK(status IN ('PRESENT', 'ABSENT', 'LATE', 'LEFT_EARLY', 'ON_LEAVE')),
  remarks TEXT,
  UNIQUE(session_id, student_id)
);

-- 11. Hostel Attendance
CREATE TABLE IF NOT EXISTS hostel_attendance (
  id VARCHAR(64) PRIMARY KEY,
  date VARCHAR(32) NOT NULL,
  time VARCHAR(16) NOT NULL,
  student_id VARCHAR(64) NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  room_id VARCHAR(64) NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL CHECK(status IN ('PRESENT', 'ABSENT', 'OUTPASS', 'LEAVE', 'MEDICAL', 'LATE_RETURN')),
  warden_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, student_id)
);

-- 12. Outpass / Gate Pass System
CREATE TABLE IF NOT EXISTS outpasses (
  id VARCHAR(64) PRIMARY KEY,
  outpass_number VARCHAR(64) NOT NULL UNIQUE,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  pickup_person_name VARCHAR(128) NOT NULL,
  pickup_person_phone VARCHAR(64) NOT NULL,
  relationship VARCHAR(64) NOT NULL,
  id_type VARCHAR(64),
  id_number VARCHAR(64),
  pickup_photo_url TEXT,
  parent_phone VARCHAR(64) NOT NULL,
  parent_otp_verified INTEGER DEFAULT 0,
  parent_verified_at TIMESTAMPTZ,
  verification_code VARCHAR(16), -- 4 digit non-predictable code
  status VARCHAR(32) DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'OUT', 'RETURNED', 'EXPIRED')),
  requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  approved_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  exit_time TIMESTAMPTZ,
  exit_gate_staff_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  return_time TIMESTAMPTZ,
  return_gate_staff_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  digital_signature_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS outpass_otps (
  id VARCHAR(64) PRIMARY KEY,
  outpass_id VARCHAR(64) NOT NULL REFERENCES outpasses(id) ON DELETE CASCADE,
  otp_code VARCHAR(16) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ
);

-- 13. Exams, Marks & Report Cards
CREATE TABLE IF NOT EXISTS exams (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL, -- 'Unit Test 1', 'Mid Term Examination', 'NEET Mock 1', 'JEE Main Practice'
  exam_type VARCHAR(64) NOT NULL, -- 'Unit Test', 'Cycle Test', 'Mid Term', 'Pre-Final', 'Board Exam', 'NEET Test', 'JEE Test', 'KCET Test'
  academic_year VARCHAR(64) NOT NULL,
  start_date VARCHAR(32) NOT NULL,
  end_date VARCHAR(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS exam_subjects (
  id VARCHAR(64) PRIMARY KEY,
  exam_id VARCHAR(64) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id VARCHAR(64) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  max_marks DOUBLE PRECISION NOT NULL DEFAULT 100,
  passing_marks DOUBLE PRECISION NOT NULL DEFAULT 35,
  exam_date VARCHAR(32)
);

CREATE TABLE IF NOT EXISTS student_marks (
  id VARCHAR(64) PRIMARY KEY,
  exam_subject_id VARCHAR(64) NOT NULL REFERENCES exam_subjects(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  marks_obtained DOUBLE PRECISION NOT NULL,
  grade VARCHAR(16),
  rank_in_class INTEGER,
  rank_in_batch INTEGER,
  teacher_remarks TEXT,
  UNIQUE(exam_subject_id, student_id)
);

CREATE TABLE IF NOT EXISTS evaluated_papers (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  exam_subject_id VARCHAR(64) NOT NULL REFERENCES exam_subjects(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  uploaded_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, exam_subject_id)
);

CREATE TABLE IF NOT EXISTS exam_remarks (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  exam_id VARCHAR(64) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  class_teacher_remarks TEXT,
  subject_teacher_remarks TEXT,
  hod_remarks TEXT,
  principal_remarks TEXT,
  UNIQUE(student_id, exam_id)
);

-- 14. Audit Logging
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(128),
  role VARCHAR(64),
  action VARCHAR(128) NOT NULL,
  entity_type VARCHAR(128) NOT NULL,
  entity_id VARCHAR(64),
  details_json TEXT,
  ip_address VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 15. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_timetable_lookup ON timetable_entries(branch_id, day_of_week, period_number);
CREATE INDEX IF NOT EXISTS idx_timetable_teacher ON timetable_entries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lecture_lookup ON lecture_sessions(branch_id, date, floor, room_id);
CREATE INDEX IF NOT EXISTS idx_attendance_lecture ON attendance_records(lecture_session_id);
CREATE INDEX IF NOT EXISTS idx_student_branch ON student_profiles(branch_id, class_id, section_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_outpass_lookup ON outpasses(branch_id, status, requested_at);
CREATE INDEX IF NOT EXISTS idx_outpass_student ON outpasses(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_student ON student_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_subject ON student_marks(exam_subject_id);
-- 16. Online / Offline Tests
CREATE TABLE IF NOT EXISTS tests (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  mode VARCHAR(32) NOT NULL CHECK(mode IN ('ONLINE', 'OFFLINE')),
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  batch_id VARCHAR(64) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  subject_id VARCHAR(64) REFERENCES subjects(id) ON DELETE SET NULL,
  scheduled_date VARCHAR(32) NOT NULL,
  start_time VARCHAR(16),
  duration_minutes INTEGER DEFAULT 60,
  total_marks DOUBLE PRECISION DEFAULT 100,
  question_paper_url TEXT, -- for OFFLINE tests
  status VARCHAR(32) DEFAULT 'SCHEDULED' CHECK(status IN ('SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED')),
  created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS test_questions (
  id VARCHAR(64) PRIMARY KEY,
  test_id VARCHAR(64) NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a VARCHAR(255) NOT NULL,
  option_b VARCHAR(255) NOT NULL,
  option_c VARCHAR(255) NOT NULL,
  option_d VARCHAR(255) NOT NULL,
  correct_option VARCHAR(8) NOT NULL CHECK(correct_option IN ('A', 'B', 'C', 'D')),
  marks DOUBLE PRECISION DEFAULT 1,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS test_submissions (
  id VARCHAR(64) PRIMARY KEY,
  test_id VARCHAR(64) NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  marks_obtained DOUBLE PRECISION,
  answers_json TEXT, -- { question_id: 'A' } for ONLINE tests
  submitted_at TIMESTAMPTZ,
  UNIQUE(test_id, student_id)
);

-- 17. Student Documents (Aadhar, Study Certificate, SSLC Marks Card, TC, Caste & Income Certificate, EWS, PWD)
CREATE TABLE IF NOT EXISTS student_documents (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  doc_type VARCHAR(64) NOT NULL CHECK(doc_type IN ('AADHAR', 'STUDY_CERTIFICATE', 'SSLC_MARKS_CARD', 'TC', 'CASTE_INCOME_CERTIFICATE', 'EWS', 'PWD')),
  file_url TEXT NOT NULL,
  category VARCHAR(64), -- caste category value shown on profile (General/OBC/SC/ST/EWS etc.)
  uploaded_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, doc_type)
);

-- Additional indexes for the new tables
CREATE INDEX IF NOT EXISTS idx_tests_lookup ON tests(branch_id, class_id, batch_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_test_questions_test ON test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_submissions_test ON test_submissions(test_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_student ON student_documents(student_id);