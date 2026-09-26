-- Run this against your Neon database to enable assigning a classroom
-- (room number) to each section on the Classes & Sections admin page.
-- Safe to run even if it was already added manually.

ALTER TABLE sections ADD COLUMN IF NOT EXISTS room_id VARCHAR(64) REFERENCES rooms(id) ON DELETE SET NULL;
