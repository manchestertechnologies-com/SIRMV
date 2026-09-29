import React from 'react';
import { getBatchColor, batchKey } from '../../utils/batchColor';

// ---------------------------------------------------------------------------
// The one shared "desk + seats" design used by every 3D scene in the app —
// the per-room seating/attendance view (ExamSeatingView3D) and the
// exam-building overview (ExamFloor3D) both render benches through this
// module, so a real bench always looks the same and is colored the same
// way wherever it appears, instead of the two scenes drifting apart (the
// overview used to draw a single plain wood box per bench with no seats).
//
// A real classroom bench seats at most 3 students side by side — never
// more, however the room is configured. If a room's seatsPerBench is
// higher than that (e.g. an old/odd config), the extra seats wrap onto an
// additional bench row placed just behind the first, rather than a single
// unrealistically long desk.
// ---------------------------------------------------------------------------

export const MAX_SEATS_PER_BENCH_ROW = 3;

// A real classroom is laid out in 3 columns of benches (a center and two
// side aisles) — used as the target bench-grid width by every 3D scene
// that lays out a room's benches, rather than each one guessing a column
// count from the total bench count.
export const TARGET_BENCH_COLUMNS = 3;

export interface SeatInfo {
  allocationId?: string;
  benchNumber: number;
  seatNumber: number;
  studentId?: string | null;
  studentName?: string | null;
  registerNumber?: string | null;
  classId?: string | null;
  sectionId?: string | null;
  className?: string | null;
  sectionName?: string | null;
  attendanceStatus?: 'PENDING' | 'PRESENT' | 'ABSENT' | null;
  markedByName?: string | null;
  markedAt?: string | null;
}

export const EMPTY_SEAT_COLOR = '#cbd5e1';
export const ABSENT_SEAT_COLOR = '#dc2626';
export const UNBATCHED_SEAT_COLOR = '#7c3aed';
const DESK_COLOR = '#8a5a2b';
const DESK_LEG_COLOR = '#4b3312';

export function seatFillColor(seat: SeatInfo | undefined, showAttendance: boolean): string {
  if (!seat || !seat.studentId) return EMPTY_SEAT_COLOR;
  if (showAttendance && seat.attendanceStatus === 'ABSENT') return ABSENT_SEAT_COLOR;
  if (seat.classId || seat.sectionId) return getBatchColor(batchKey(seat.classId, seat.sectionId));
  return UNBATCHED_SEAT_COLOR;
}

// Splits a bench's seats into rows of at most MAX_SEATS_PER_BENCH_ROW,
// keyed by seat number 1..seatsPerBench. Almost always a single row (real
// configs use 2-3 seats/bench); a config above the cap gets a second desk
// row instead of one oversized desk.
function chunkSeatRows(seatsPerBench: number, seatsByNumber: Map<number, SeatInfo>): (SeatInfo | undefined)[][] {
  const capped = Math.max(1, seatsPerBench);
  const rows: (SeatInfo | undefined)[][] = [];
  for (let start = 1; start <= capped; start += MAX_SEATS_PER_BENCH_ROW) {
    const row: (SeatInfo | undefined)[] = [];
    for (let n = start; n < start + MAX_SEATS_PER_BENCH_ROW && n <= capped; n++) {
      row.push(seatsByNumber.get(n));
    }
    rows.push(row);
  }
  return rows;
}

// --- Full-detail seat: a small chair (pan + backrest + 4 legs), used by the
// dedicated per-room seating view where there's room to actually see it. ---
export function Seat({
  seat, x, z, size, showAttendance, onClick
}: {
  seat: SeatInfo | undefined; x: number; z: number; size: number;
  showAttendance: boolean; onClick?: (seat: SeatInfo) => void;
}) {
  const color = seatFillColor(seat, showAttendance);
  const clickable = !!(seat && seat.studentId && onClick);
  const seatH = size * 0.4;
  return (
    <group
      position={[x, 0, z]}
      onClick={(e) => { if (clickable) { e.stopPropagation(); onClick!(seat!); } }}
      onPointerOver={(e) => { if (clickable) { e.stopPropagation(); document.body.style.cursor = 'pointer'; } }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      <mesh position={[0, seatH / 2, 0]} castShadow>
        <boxGeometry args={[size * 0.82, seatH, size * 0.78]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, seatH * 1.55, -size * 0.34]}>
        <boxGeometry args={[size * 0.82, seatH * 1.5, size * 0.08]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * size * 0.34, seatH * 0.25, sz * size * 0.3]}>
          <boxGeometry args={[size * 0.07, seatH * 0.5, size * 0.07]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      ))}
    </group>
  );
}

// A full bench: a wood desk plus its (at most 3-per-row) seats, used by the
// dedicated per-room seating view.
export function Bench({
  seatsPerBench, seatsByNumber, x, z, seatSize, rowGap, onSeatClick, showAttendance
}: {
  seatsPerBench: number; seatsByNumber: Map<number, SeatInfo>; x: number; z: number;
  seatSize: number; rowGap: number; showAttendance: boolean; onSeatClick?: (seat: SeatInfo) => void;
}) {
  const rows = chunkSeatRows(seatsPerBench, seatsByNumber);
  const width = Math.min(seatsPerBench, MAX_SEATS_PER_BENCH_ROW) * seatSize;
  const deskH = seatSize * 0.4;
  return (
    <group position={[x, 0, z]}>
      {rows.map((row, rIdx) => {
        const rz = rIdx * rowGap;
        return (
          <group key={rIdx} position={[0, 0, rz]}>
            {/* desk top for this row */}
            <mesh position={[0, deskH * 1.75, seatSize * 0.26]} castShadow>
              <boxGeometry args={[width - seatSize * 0.07, seatSize * 0.08, seatSize * 0.5]} />
              <meshStandardMaterial color={DESK_COLOR} />
            </mesh>
            {/* desk legs */}
            {[-1, 1].map((sx, i) => (
              <mesh key={i} position={[sx * (width / 2 - seatSize * 0.1), deskH * 0.9, seatSize * 0.26]}>
                <boxGeometry args={[seatSize * 0.08, deskH * 1.7, seatSize * 0.08]} />
                <meshStandardMaterial color={DESK_LEG_COLOR} />
              </mesh>
            ))}
            {row.map((seat, i) => {
              const rowLen = row.length;
              const sx = -width / 2 + seatSize / 2 + i * seatSize + (MAX_SEATS_PER_BENCH_ROW - rowLen) * 0; // left-aligned
              return (
                <Seat
                  key={seat?.seatNumber ?? i}
                  seat={seat}
                  x={sx}
                  z={0}
                  size={seatSize}
                  showAttendance={showAttendance}
                  onClick={onSeatClick}
                />
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

// --- Compact bench block: same desk + per-seat coloring, but simplified
// geometry (no chair backrests/legs — just the desk and flat seat-color
// tabs) for the exam-building overview, where many small rooms are drawn
// at once and full chair detail per seat would be both invisible at that
// scale and needlessly heavy to render. Same colors, same "one seat = one
// visible unit" design, same 3-seats-per-row cap — just lighter. ---
export function SeatBlock({
  seatsPerBench, seatsByNumber, x, z, seatSize, rowGap, showAttendance
}: {
  seatsPerBench: number; seatsByNumber: Map<number, SeatInfo>; x: number; z: number;
  seatSize: number; rowGap: number; showAttendance: boolean;
}) {
  const rows = chunkSeatRows(seatsPerBench, seatsByNumber);
  const width = Math.min(seatsPerBench, MAX_SEATS_PER_BENCH_ROW) * seatSize;
  return (
    <group position={[x, 0, z]}>
      {rows.map((row, rIdx) => (
        <group key={rIdx} position={[0, 0, rIdx * rowGap]}>
          {/* desk strip for this row */}
          <mesh position={[0, seatSize * 0.22, 0]}>
            <boxGeometry args={[width - seatSize * 0.05, seatSize * 0.07, seatSize * 0.62]} />
            <meshStandardMaterial color={DESK_COLOR} />
          </mesh>
          {/* one flat colored tab per seat, sitting just behind the desk edge */}
          {row.map((seat, i) => (
            <mesh key={seat?.seatNumber ?? i} position={[-width / 2 + seatSize / 2 + i * seatSize, seatSize * 0.28, -seatSize * 0.22]}>
              <boxGeometry args={[seatSize * 0.72, seatSize * 0.09, seatSize * 0.3]} />
              <meshStandardMaterial color={seatFillColor(seat, showAttendance)} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
