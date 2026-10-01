-- Additive migration: SMS notification workflow.
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- Run with:  psql "$DATABASE_URL" -f add-sms-workflow-schema.sql

-- Every SMS the system has "sent" (simulated — see server/src/services/smsService.ts),
-- whether triggered automatically by a workflow or sent manually by staff.
CREATE TABLE IF NOT EXISTS sms_logs (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  recipient_phone VARCHAR(32) NOT NULL,
  recipient_name VARCHAR(255),
  trigger_type VARCHAR(64) NOT NULL, -- e.g. ATTENDANCE_ABSENT, OUTPASS_APPROVED, MANUAL, ...
  message TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'FAILED')),
  related_entity_type VARCHAR(64), -- e.g. 'student', 'outpass'
  related_entity_id VARCHAR(64),
  sent_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL, -- NULL = automated workflow
  sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sms_logs_branch ON sms_logs(branch_id, sent_at DESC);

-- Per-branch on/off toggle for each automated SMS trigger.
CREATE TABLE IF NOT EXISTS sms_workflow_settings (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  trigger_key VARCHAR(64) NOT NULL,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  UNIQUE(branch_id, trigger_key)
);

-- Default rows: every known trigger, enabled, for every existing branch.
INSERT INTO sms_workflow_settings (id, branch_id, trigger_key, is_enabled)
SELECT b.id || '-' || t.trigger_key, b.id, t.trigger_key, 1
FROM branches b
CROSS JOIN (VALUES
  ('ATTENDANCE_ABSENT'),
  ('OUTPASS_APPROVED'),
  ('OUTPASS_REJECTED'),
  ('OUTPASS_STUDENT_EXIT'),
  ('OUTPASS_STUDENT_RETURN'),
  ('GRIEVANCE_RESPONDED'),
  ('TEST_SCHEDULED')
) AS t(trigger_key)
ON CONFLICT (branch_id, trigger_key) DO NOTHING;
