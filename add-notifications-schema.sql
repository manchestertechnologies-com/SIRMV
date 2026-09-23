-- 16. Announcements (Institutional Noticeboard & Circulars)
CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(64) NOT NULL DEFAULT 'GENERAL', -- ACADEMIC, COACHING, HOSTEL, EXAM, ADMIN, GENERAL
  target_roles TEXT, -- comma-separated role list, e.g. 'TEACHER,HOD' — NULL/empty means visible to everyone
  is_pinned INTEGER DEFAULT 0,
  attachment_url TEXT,
  posted_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  posted_by_name VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 17. Notifications (personal, actionable feed shown via the Navbar bell)
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  link_tab VARCHAR(64), -- which App.tsx tab to open on click, e.g. 'gate-pass', 'tests' — optional
  is_read INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_announcements_branch ON announcements(branch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at);
