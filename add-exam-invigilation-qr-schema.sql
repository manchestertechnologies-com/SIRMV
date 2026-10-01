-- Additive migration: QR-based exam invigilation attendance.
-- Safe to run multiple times.
-- Run with:  psql "$DATABASE_URL" -f add-exam-invigilation-qr-schema.sql

ALTER TABLE exam_invigilator_assignments ADD COLUMN IF NOT EXISTS qr_token VARCHAR(64);
ALTER TABLE exam_invigilator_assignments ADD COLUMN IF NOT EXISTS qr_token_generated_at TIMESTAMPTZ;
ALTER TABLE exam_invigilator_assignments ADD COLUMN IF NOT EXISTS duty_attendance_status VARCHAR(16) NOT NULL DEFAULT 'PENDING';
ALTER TABLE exam_invigilator_assignments ADD COLUMN IF NOT EXISTS duty_marked_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE exam_invigilator_assignments ADD COLUMN IF NOT EXISTS duty_marked_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_invigilator_assignments_qr_token ON exam_invigilator_assignments(qr_token) WHERE qr_token IS NOT NULL;
