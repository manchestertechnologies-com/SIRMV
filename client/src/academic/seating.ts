import { Classroom } from './classrooms';

export type SeatingMode = 'zigzag' | 'straight';
export interface Seat { bench: number; side: number; label: string; pass: 0 | 1; student: number | null } // student = index in the class list

// Lay benches out in rows of `cols`. Zig-zag fills every other seat first (checkerboard, snake order),
// so neighbours are never seated side by side or front to back until the hall is nearly full.
export const benchCols = (room: Classroom) => Math.min(room.benches, room.benches > 24 ? 6 : room.benches > 12 ? 5 : 4);
export const layoutSeats = (room: Classroom, students: number, mode: SeatingMode): Seat[] => {
  const cols = benchCols(room); const seats: Seat[] = [];
  for (let b = 0; b < room.benches; b++) {
    const row = Math.floor(b / cols); const col0 = b % cols; const col = row % 2 ? cols - 1 - col0 : col0; // snake through the rows
    for (let s = 0; s < room.perBench; s++) seats.push({ bench: b, side: s, label: `${row + 1}-${col + 1}${room.perBench > 1 ? 'LRM'[s] || s + 1 : ''}`, pass: ((row + col + s) % 2) as 0 | 1, student: null });
  }
  const order = mode === 'zigzag' ? [...seats.filter((x) => x.pass === 0), ...seats.filter((x) => x.pass === 1)] : seats;
  order.slice(0, students).forEach((seat, i) => { seat.student = i; });
  return seats;
};
