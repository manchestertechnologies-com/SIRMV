-- Lets exam staff explicitly specify which class/section a classroom belongs
-- to (rather than relying only on the timetable-derived guess), so the 3D
-- exam building view always shows a class/section label per room and
-- automatic room allocation can reliably prioritize a batch's own room even
-- when the regular teaching timetable hasn't been generated yet.
--
-- Safe to run whether or not exam_room_configs already exists on this
-- database (IF EXISTS / IF NOT EXISTS guards make this idempotent).

ALTER TABLE IF EXISTS exam_room_configs
  ADD COLUMN IF NOT EXISTS assigned_class_id VARCHAR(64) REFERENCES classes(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS exam_room_configs
  ADD COLUMN IF NOT EXISTS assigned_section_id VARCHAR(64) REFERENCES sections(id) ON DELETE SET NULL;
