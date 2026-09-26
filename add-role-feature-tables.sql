-- Run this against your Neon database. It adds every table this batch of
-- fixes needs, in one shot. Most importantly, it fixes Announcements and
-- Notifications, which were already fully coded (server/src/routes/
-- announcements.ts and notifications.ts) but had NO backing tables in the
-- database at all — every role's noticeboard/notification-bell has been
-- silently failing, not just the roles this specific audit was about.
-- Safe to run even if some of these already exist.

-- Announcements (Noticeboard storage)
CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(64) DEFAULT 'GENERAL',
  target_roles VARCHAR(255),
  is_pinned INTEGER DEFAULT 0,
  attachment_url TEXT,
  posted_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  posted_by_name VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Notifications (Navbar bell inbox)
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  link_tab VARCHAR(64),
  is_read INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- Web Push device subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  user_agent TEXT,
  platform VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- College Calendar (new feature — Teacher's "College Calendar")
CREATE TABLE IF NOT EXISTS calendar_events (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date VARCHAR(32) NOT NULL,
  end_date VARCHAR(32),
  event_type VARCHAR(32) DEFAULT 'EVENT' CHECK(event_type IN ('HOLIDAY', 'EXAM', 'EVENT', 'MEETING')),
  created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_calendar_events_branch_date ON calendar_events(branch_id, event_date);

-- Student Counselling (new feature — Teacher's "Counselling", was a placeholder tab)
CREATE TABLE IF NOT EXISTS counselling_records (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  counsellor_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_date VARCHAR(32) NOT NULL,
  reason VARCHAR(255),
  notes TEXT,
  follow_up_date VARCHAR(32),
  status VARCHAR(32) DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'FOLLOW_UP', 'RESOLVED')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_counselling_student ON counselling_records(student_id);

-- Student Discipline (new feature — Hostel Warden's "Student Discipline")
CREATE TABLE IF NOT EXISTS discipline_records (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  incident_date VARCHAR(32) NOT NULL,
  category VARCHAR(64),
  description TEXT NOT NULL,
  action_taken TEXT,
  reported_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(32) DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'RESOLVED')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_discipline_student ON discipline_records(student_id);

-- Floor Issues (new feature — Floor In-Charge's "Reporting Issues")
CREATE TABLE IF NOT EXISTS floor_issues (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  floor INTEGER,
  room_id VARCHAR(64) REFERENCES rooms(id) ON DELETE SET NULL,
  category VARCHAR(64) DEFAULT 'MAINTENANCE',
  description TEXT NOT NULL,
  status VARCHAR(32) DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
  reported_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_floor_issues_branch ON floor_issues(branch_id, status);
