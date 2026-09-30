-- Standardizes every exam room on 3 seats per bench (the institution's
-- chosen exam-seating arrangement: 3 students per bench, alternating
-- batches seat-by-seat — the alternation itself is already handled by the
-- seat-allocation engine's "separate same class" option, which defaults to
-- on; this migration only fixes the seats-per-bench count).
--
-- Safe to run more than once. Updates:
--   1. Every existing exam_room_configs row to seats_per_bench = 3.
--   2. rooms.capacity for any room that has an exam_room_configs row, so
--      it stays in sync with benches * 3 (capacity was originally set at
--      room-creation time as benches * seats_per_bench).
--
-- New rooms created from now on already default to 3 seats/bench (server
-- code change shipped alongside this migration) — this file only needs to
-- run once to bring existing rooms in line with that new default.

ALTER TABLE exam_room_configs ALTER COLUMN seats_per_bench SET DEFAULT 3;

UPDATE exam_room_configs
SET seats_per_bench = 3,
    updated_at = CURRENT_TIMESTAMP
WHERE seats_per_bench IS DISTINCT FROM 3;

UPDATE rooms r
SET capacity = c.benches * c.seats_per_bench
FROM exam_room_configs c
WHERE c.room_id = r.id
  AND r.capacity IS DISTINCT FROM c.benches * c.seats_per_bench;
