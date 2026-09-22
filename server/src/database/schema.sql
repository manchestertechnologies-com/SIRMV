-- SIR MV PU College Database Schema
-- Multi-branch support: Davangere, Shivamogga, Ballari

PRAGMA foreign_keys = ON;

-- 1. Branches
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  logo_url TEXT,
  principal_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER', 'FLOOR_ATTENDER', 'GATE_STAFF', 'WARDEN', 'STUDENT', 'PARENT')),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Academic Structure
CREATE TABLE IF NOT EXISTS academic_years (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_current INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  hod_user_id TEXT REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL -- e.g. '1 PUC', '2 PUC'
);

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL -- e.g. 'A', 'B', 'C'
);

CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. 'NEET', 'JEE', 'KCET', 'Regular PU'
  code TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Physics, Chemistry, Mathematics, Biology, Computer Science, English, Kannada, Hindi
  code TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  floor INTEGER NOT NULL,
  building TEXT DEFAULT 'Main Academic Block',
  capacity INTEGER DEFAULT 60
);

-- 4. Teacher Profiles & Academic Assignments
CREATE TABLE IF NOT EXISTS teacher_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL UNIQUE,
  photo_url TEXT,
  date_of_birth TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  designation TEXT NOT NULL,
  joining_date TEXT,
  qualification TEXT,
  is_hod INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teacher_assignments (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  is_class_teacher INTEGER DEFAULT 0
);

-- 5. Student Profiles
CREATE TABLE IF NOT EXISTS student_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  register_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  photo_url TEXT,
  date_of_birth TEXT,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  parent_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  is_hostelite INTEGER DEFAULT 0,
  hostel_room_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Timetable, Absences & Substitution System
CREATE TABLE IF NOT EXISTS timetable_entries (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL, -- Monday, Tuesday, Wednesday, Thursday, Friday, Saturday
  period_number INTEGER NOT NULL,
  start_time TEXT NOT NULL, -- e.g. '08:45'
  end_time TEXT NOT NULL,   -- e.g. '09:30'
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teacher_absences (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'RECORDED', -- RECORDED, CANCELLED
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS substitution_assignments (
  id TEXT PRIMARY KEY,
  timetable_entry_id TEXT NOT NULL REFERENCES timetable_entries(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  original_teacher_id TEXT NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  substitute_teacher_id TEXT NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  assigned_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT DEFAULT 'ASSIGNED' CHECK(status IN ('ASSIGNED', 'ACKNOWLEDGED', 'REJECTED')),
  acknowledged_at DATETIME,
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Floor Attender & Lecture Sessions
CREATE TABLE IF NOT EXISTS lecture_sessions (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  timetable_entry_id TEXT REFERENCES timetable_entries(id) ON DELETE SET NULL,
  date TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  teacher_id TEXT NOT NULL REFERENCES teacher_profiles(id) ON DELETE RESTRICT,
  substitute_teacher_id TEXT REFERENCES teacher_profiles(id) ON DELETE SET NULL,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  floor INTEGER NOT NULL,
  scheduled_start TEXT NOT NULL,
  scheduled_end TEXT NOT NULL,
  teacher_time_in TEXT,
  lecture_start_time TEXT,
  lecture_end_time TEXT,
  teacher_time_out TEXT,
  teacher_status TEXT DEFAULT 'PRESENT' CHECK(teacher_status IN ('PRESENT', 'ABSENT', 'LATE', 'SUBSTITUTE')),
  classroom_photo_url TEXT,
  recording_url TEXT,
  floor_attender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  remarks TEXT,
  finalization_status TEXT DEFAULT 'PENDING' CHECK(finalization_status IN ('PENDING', 'COMPLETED')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lecture_concepts (
  id TEXT PRIMARY KEY,
  lecture_session_id TEXT NOT NULL UNIQUE REFERENCES lecture_sessions(id) ON DELETE CASCADE,
  chapter TEXT NOT NULL,
  concept TEXT NOT NULL,
  topic_taught TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Student Class Attendance
CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  lecture_session_id TEXT NOT NULL REFERENCES lecture_sessions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'MEDICAL', 'ON_LEAVE')),
  detection_confidence REAL,
  match_status TEXT, -- 'CONFIRMED', 'UNCERTAIN', 'NOT_DETECTED', 'MANUAL'
  marked_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lecture_session_id, student_id)
);

CREATE TABLE IF NOT EXISTS attendance_photos (
  id TEXT PRIMARY KEY,
  lecture_session_id TEXT NOT NULL REFERENCES lecture_sessions(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  detections_json TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Evening Study Attendance
CREATE TABLE IF NOT EXISTS evening_study_sessions (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  study_hall TEXT NOT NULL,
  floor INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  supervisor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evening_study_attendance (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES evening_study_sessions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  entry_time TEXT,
  exit_time TEXT,
  duration_minutes INTEGER,
  status TEXT NOT NULL CHECK(status IN ('PRESENT', 'ABSENT', 'LATE', 'LEFT_EARLY', 'ON_LEAVE')),
  remarks TEXT,
  UNIQUE(session_id, student_id)
);

-- 10. Hostel & Hostel Attendance
CREATE TABLE IF NOT EXISTS hostels (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('BOYS', 'GIRLS'))
);

CREATE TABLE IF NOT EXISTS hostel_blocks (
  id TEXT PRIMARY KEY,
  hostel_id TEXT NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hostel_rooms (
  id TEXT PRIMARY KEY,
  block_id TEXT NOT NULL REFERENCES hostel_blocks(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  floor INTEGER NOT NULL,
  capacity INTEGER DEFAULT 4
);

CREATE TABLE IF NOT EXISTS hostel_beds (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
  bed_number TEXT NOT NULL,
  student_id TEXT UNIQUE REFERENCES student_profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS hostel_attendance (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('PRESENT', 'ABSENT', 'OUTPASS', 'LEAVE', 'MEDICAL', 'LATE_RETURN')),
  warden_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, student_id)
);

-- 11. Outpass / Gate Pass System
CREATE TABLE IF NOT EXISTS outpasses (
  id TEXT PRIMARY KEY,
  outpass_number TEXT NOT NULL UNIQUE,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  pickup_person_name TEXT NOT NULL,
  pickup_person_phone TEXT NOT NULL,
  relationship TEXT NOT NULL,
  id_type TEXT,
  id_number TEXT,
  pickup_photo_url TEXT,
  parent_phone TEXT NOT NULL,
  parent_otp_verified INTEGER DEFAULT 0,
  parent_verified_at DATETIME,
  verification_code TEXT, -- 4 digit non-predictable code
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'OUT', 'RETURNED', 'EXPIRED')),
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_at DATETIME,
  rejection_reason TEXT,
  exit_time DATETIME,
  exit_gate_staff_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  return_time DATETIME,
  return_gate_staff_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  digital_signature_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS outpass_otps (
  id TEXT PRIMARY KEY,
  outpass_id TEXT NOT NULL REFERENCES outpasses(id) ON DELETE CASCADE,
  otp_code TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  verified_at DATETIME
);

-- 12. Exams, Marks & Report Cards
CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 'Unit Test 1', 'Mid Term Examination', 'NEET Mock 1', 'JEE Main Practice'
  exam_type TEXT NOT NULL, -- 'Unit Test', 'Cycle Test', 'Mid Term', 'Pre-Final', 'Board Exam', 'NEET Test', 'JEE Test', 'KCET Test'
  academic_year TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exam_subjects (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  max_marks REAL NOT NULL DEFAULT 100,
  passing_marks REAL NOT NULL DEFAULT 35,
  exam_date TEXT
);

CREATE TABLE IF NOT EXISTS student_marks (
  id TEXT PRIMARY KEY,
  exam_subject_id TEXT NOT NULL REFERENCES exam_subjects(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  marks_obtained REAL NOT NULL,
  grade TEXT,
  rank_in_class INTEGER,
  rank_in_batch INTEGER,
  teacher_remarks TEXT,
  UNIQUE(exam_subject_id, student_id)
);

CREATE TABLE IF NOT EXISTS evaluated_papers (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  exam_subject_id TEXT NOT NULL REFERENCES exam_subjects(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, exam_subject_id)
);

CREATE TABLE IF NOT EXISTS exam_remarks (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  class_teacher_remarks TEXT,
  subject_teacher_remarks TEXT,
  hod_remarks TEXT,
  principal_remarks TEXT,
  UNIQUE(student_id, exam_id)
);

-- 13. Audit Logging
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details_json TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 14. Non-Teaching Staff (Floor In-Charge, Cleaning, Bus, Warden, Mess, etc.)
CREATE TABLE IF NOT EXISTS staff_profiles (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  employee_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  photo_url TEXT,
  date_of_birth TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  category TEXT NOT NULL CHECK(category IN ('FLOOR_INCHARGE', 'CLEANING', 'BUS', 'WARDEN', 'MESS')),
  assigned_area TEXT, -- e.g. 'Floor 2', 'Bus Route 4', 'Boys Hostel Block A', 'Mess Hall 1'
  shift TEXT, -- 'MORNING', 'AFTERNOON', 'EVENING', 'FULL_DAY'
  joining_date TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_leaves (
  id TEXT PRIMARY KEY,
  staff_type TEXT NOT NULL CHECK(staff_type IN ('TEACHING', 'NON_TEACHING')),
  teacher_id TEXT REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  staff_id TEXT REFERENCES staff_profiles(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'RECORDED' CHECK(status IN ('RECORDED', 'APPROVED', 'REJECTED', 'CANCELLED')),
  approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 15. Student Documents (Aadhar, Study Certificate, SSLC Marks Card, TC, Caste & Income Certificate, EWS, PWD)
CREATE TABLE IF NOT EXISTS student_documents (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK(doc_type IN ('AADHAR', 'STUDY_CERTIFICATE', 'SSLC_MARKS_CARD', 'TC', 'CASTE_INCOME_CERTIFICATE', 'EWS', 'PWD')),
  file_url TEXT NOT NULL,
  category TEXT, -- caste category value shown on profile (General/OBC/SC/ST/EWS etc.)
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, doc_type)
);

-- NOTE: additional student_profiles columns (category, sslc_result, residence_status,
-- admission_type) are added safely via the migration step in database/db.ts, since
-- SQLite's ALTER TABLE ADD COLUMN is not idempotent and can't sit inside this
-- CREATE-TABLE-IF-NOT-EXISTS schema file (it re-runs on every server start).

-- 16. Online / Offline Tests
CREATE TABLE IF NOT EXISTS tests (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('ONLINE', 'OFFLINE')),
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  scheduled_date TEXT NOT NULL,
  start_time TEXT,
  duration_minutes INTEGER DEFAULT 60,
  total_marks REAL DEFAULT 100,
  question_paper_url TEXT, -- for OFFLINE tests
  status TEXT DEFAULT 'SCHEDULED' CHECK(status IN ('SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS test_questions (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL CHECK(correct_option IN ('A', 'B', 'C', 'D')),
  marks REAL DEFAULT 1,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS test_submissions (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  marks_obtained REAL,
  answers_json TEXT, -- { question_id: 'A' } for ONLINE tests
  submitted_at DATETIME,
  UNIQUE(test_id, student_id)
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_timetable_lookup ON timetable_entries(branch_id, day_of_week, period_number);
CREATE INDEX IF NOT EXISTS idx_timetable_teacher ON timetable_entries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lecture_lookup ON lecture_sessions(branch_id, date, floor, room_id);
CREATE INDEX IF NOT EXISTS idx_attendance_lecture ON attendance_records(lecture_session_id);
CREATE INDEX IF NOT EXISTS idx_student_branch ON student_profiles(branch_id, class_id, section_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_outpass_lookup ON outpasses(branch_id, status, requested_at);
CREATE INDEX IF NOT EXISTS idx_outpass_student ON outpasses(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_student ON student_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_subject ON student_marks(exam_subject_id);
