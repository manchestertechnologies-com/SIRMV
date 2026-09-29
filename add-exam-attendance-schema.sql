-- Exam attendance tracking — additive migration for the Exam Management
-- module. Adds the ability to mark PRESENT/ABSENT for each student's seat
-- allocation, recorded by whoever marked it (the invigilating teacher, or
-- Exam Dept/Admin/Principal) and when.
--
-- Batch colors for the 3D seating visualization are deliberately NOT stored
-- here — they're derived on the fly (deterministically, from class_id +
-- section_id) by server/src/utils/batchColor.ts and its client-side twin
-- client/src/utils/batchColor.ts, so there is nothing to migrate for that.
--
-- Apply with: psql "$DATABASE_URL" -f add-exam-attendance-schema.sql

ALTER TABLE exam_student_allocations
  ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(16) NOT NULL DEFAULT 'PENDING'
    CHECK (attendance_status IN ('PENDING', 'PRESENT', 'ABSENT'));

ALTER TABLE exam_student_allocations
  ADD COLUMN IF NOT EXISTS marked_by VARCHAR(64) REFERENCES teacher_profiles(id) ON DELETE SET NULL;

ALTER TABLE exam_student_allocations
  ADD COLUMN IF NOT EXISTS marked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_exam_student_allocations_attendance ON exam_student_allocations(exam_session_id, attendance_status);
