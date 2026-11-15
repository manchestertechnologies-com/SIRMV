-- Parent Connect (student <-> parent voice calls). The server also creates these tables
-- automatically on first use, so running this file is optional.
CREATE TABLE IF NOT EXISTS pc_schedule (
  day_of_week INTEGER PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),
  start_time VARCHAR(5) NOT NULL DEFAULT '06:00',
  end_time VARCHAR(5) NOT NULL DEFAULT '22:00',
  max_duration_minutes INTEGER NOT NULL DEFAULT 15,
  is_active INTEGER NOT NULL DEFAULT 1
);
INSERT INTO pc_schedule (day_of_week) SELECT g FROM generate_series(0, 6) g ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS pc_calls (
  id VARCHAR(64) PRIMARY KEY,
  student_user_id VARCHAR(64) NOT NULL,
  parent_user_id VARCHAR(64) NOT NULL,
  caller_user_id VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ringing',
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  end_reason VARCHAR(64)
);
CREATE TABLE IF NOT EXISTS pc_signals (
  id BIGSERIAL PRIMARY KEY,
  call_id VARCHAR(64) NOT NULL,
  to_user_id VARCHAR(64) NOT NULL,
  type VARCHAR(16) NOT NULL,
  payload TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS pc_blocked (student_user_id VARCHAR(64) PRIMARY KEY, reason TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_pc_signals_to ON pc_signals(to_user_id, id);
CREATE INDEX IF NOT EXISTS idx_pc_calls_users ON pc_calls(student_user_id, parent_user_id);
