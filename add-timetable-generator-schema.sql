-- Timetable Generator (Campus Administrator) — additive schema only.
-- Reuses existing branches, academic_years, departments, classes, sections,
-- batches, subjects, rooms, teacher_profiles, teacher_assignments, users
-- and existing timetable_entries (the live/published schedule teachers already read).
-- Nothing here redefines or duplicates any existing table.

-- 18. A named generation run's settings (working days, hours, period length, breaks).
--     One branch/academic year can have several configs over time (e.g. re-run each term).
CREATE TABLE IF NOT EXISTS timetable_configs (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  academic_year_id VARCHAR(64) NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  working_days TEXT NOT NULL, -- comma-separated, e.g. 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY'
  college_start_time VARCHAR(16) NOT NULL, -- '09:00'
  college_end_time VARCHAR(16) NOT NULL,   -- '16:00'
  period_duration_minutes INTEGER NOT NULL DEFAULT 45,
  breaks_json TEXT, -- JSON array: [{"after_period":2,"label":"Short Break","duration_minutes":15}, ...]
  use_room_allocation INTEGER DEFAULT 1, -- whether room-conflict (hard constraint 7) is enforced
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 19. Required weekly periods for a subject in a specific class/section, for a given config.
--     (batch_id intentionally omitted — a subject requirement applies at the section level;
--     the generator resolves which batch via teacher_assignments when a subject is batch-split.)
CREATE TABLE IF NOT EXISTS subject_requirements (
  id VARCHAR(64) PRIMARY KEY,
  config_id VARCHAR(64) NOT NULL REFERENCES timetable_configs(id) ON DELETE CASCADE,
  subject_id VARCHAR(64) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id VARCHAR(64) NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  periods_per_week INTEGER NOT NULL,
  avoid_repeat_same_day INTEGER DEFAULT 1, -- hard constraint 8, per-subject override
  UNIQUE(config_id, subject_id, class_id, section_id)
);

-- 20. Per-config teacher availability (days) + weekly hour cap. Teacher identity itself
--     stays on teacher_profiles/teacher_assignments — this only stores generator inputs.
CREATE TABLE IF NOT EXISTS teacher_availability (
  id VARCHAR(64) PRIMARY KEY,
  config_id VARCHAR(64) NOT NULL REFERENCES timetable_configs(id) ON DELETE CASCADE,
  teacher_id VARCHAR(64) NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  available_days TEXT NOT NULL, -- comma-separated subset of the config's working_days
  max_hours_per_week INTEGER NOT NULL,
  UNIQUE(config_id, teacher_id)
);

-- 21. Specific day+period a teacher is unavailable within a config (hard constraint 9),
--     e.g. a fixed weekly commitment outside the college. Finer-grained than available_days.
CREATE TABLE IF NOT EXISTS teacher_unavailable_periods (
  id VARCHAR(64) PRIMARY KEY,
  config_id VARCHAR(64) NOT NULL REFERENCES timetable_configs(id) ON DELETE CASCADE,
  teacher_id VARCHAR(64) NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  day_of_week VARCHAR(32) NOT NULL,
  period_number INTEGER NOT NULL,
  UNIQUE(config_id, teacher_id, day_of_week, period_number)
);

-- 22. One generation run's lifecycle: Draft -> Generated -> Conflicts Found ->
--     Ready for Approval -> Published. Only a Published draft's entries are copied
--     into the live timetable_entries table (see timetable_draft_entries below) —
--     this is what the existing Teacher "My Timetable" page and substitution center
--     keep reading, unchanged.
CREATE TABLE IF NOT EXISTS timetable_drafts (
  id VARCHAR(64) PRIMARY KEY,
  config_id VARCHAR(64) NOT NULL REFERENCES timetable_configs(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'GENERATED', 'CONFLICTS_FOUND', 'READY_FOR_APPROVAL', 'PUBLISHED')),
  issues_json TEXT, -- generator-time issues: [{"type":"MISSING_TEACHER"|"UNFULFILLED_SUBJECT_HOURS", ...}]
  generated_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  published_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 23. The draft's own working copy of the schedule — same shape as timetable_entries
--     so publishing is a straight copy. Lives entirely separately from the live table
--     until published, so in-progress edits/conflicts never affect what teachers see.
--     room_id is nullable: room-conflict checking is optional per config (hard constraint 7
--     only applies "if room allocation is being used").
CREATE TABLE IF NOT EXISTS timetable_draft_entries (
  id VARCHAR(64) PRIMARY KEY,
  draft_id VARCHAR(64) NOT NULL REFERENCES timetable_drafts(id) ON DELETE CASCADE,
  day_of_week VARCHAR(32) NOT NULL,
  period_number INTEGER NOT NULL,
  start_time VARCHAR(16) NOT NULL,
  end_time VARCHAR(16) NOT NULL,
  subject_id VARCHAR(64) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id VARCHAR(64) NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  batch_id VARCHAR(64) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  room_id VARCHAR(64) REFERENCES rooms(id) ON DELETE SET NULL,
  teacher_id VARCHAR(64) NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subject_requirements_config ON subject_requirements(config_id);
CREATE INDEX IF NOT EXISTS idx_teacher_availability_config ON teacher_availability(config_id);
CREATE INDEX IF NOT EXISTS idx_teacher_unavailable_config ON teacher_unavailable_periods(config_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_timetable_drafts_config ON timetable_drafts(config_id);
CREATE INDEX IF NOT EXISTS idx_draft_entries_draft ON timetable_draft_entries(draft_id, day_of_week, period_number);
CREATE INDEX IF NOT EXISTS idx_draft_entries_teacher ON timetable_draft_entries(draft_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_draft_entries_class ON timetable_draft_entries(draft_id, class_id, section_id);
