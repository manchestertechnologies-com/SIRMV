-- Exam Management Phase 2 — HOD invigilator-request workflow.
-- Additive on top of add-exam-management-schema.sql (apply that one first).
--
-- exam_invigilator_requests / exam_invigilator_assignments already exist
-- (Phase 1 schema, unused until now). This adds the "pool" of teachers an
-- HOD has approved for a request — not yet tied to a specific room, since
-- the HOD picks people, not rooms. The Exam Department then assigns each
-- approved teacher to an actual room (exam_invigilator_assignments),
-- either automatically or manually, same as any other invigilator.
--
-- Apply with: psql "$DATABASE_URL" -f add-exam-invigilator-pool-schema.sql

CREATE TABLE IF NOT EXISTS exam_invigilator_request_selections (
  id VARCHAR(64) PRIMARY KEY,
  request_id VARCHAR(64) NOT NULL REFERENCES exam_invigilator_requests(id) ON DELETE CASCADE,
  teacher_id VARCHAR(64) NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  selected_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  selected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(request_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_invig_req_selections_request ON exam_invigilator_request_selections(request_id);
