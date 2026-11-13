import { Classroom } from './classrooms';
import { SectionDef, Student } from './sampleData';

// Seating rules (benches normally have 3 seats):
//  - papers for two syllabuses (1st PU and 2nd PU): the two classes sit on alternate seats, so every seat is used
//  - one syllabus only: 2 students per bench, the middle seat stays empty; the rest sit in the next room
export type Group = '1st' | '2nd';
// 11th = 1st PU paper, 12th = 2nd PU paper. LT (repeaters) can write either, so the exam says which (lt).
export const groupOf = (std: string, lt: Group = '2nd'): Group => (std === '11' ? '1st' : std === 'LT' ? lt : '2nd');
export const groupName = (g: Group) => (g === '1st' ? '1st PU' : '2nd PU');

export type SeatPattern = 'zigzag' | 'ushape';
export const PATTERNS: [SeatPattern, string, string][] = [['zigzag', 'Zig-zag', 'By roll number: 1st on the left, 2nd on the right, 3rd next to the 1st, 4th next to the 2nd'], ['ushape', 'U shape', 'By roll number: one after another down the left column, then up the next column on the right']];
export interface Seat { bench: number; side: number; row: number; col: number; label: string; student?: Student; group?: Group; lt?: boolean }
export interface RoomPlan { room: Classroom; cols: number; seats: Seat[]; count: number }

export const benchCols = (room: Classroom) => Math.min(Math.max(room.benches, 1), 3); // 3 columns of benches
export const seatsFor = (room: Classroom, twoGroups: boolean) => room.benches * (twoGroups || room.perBench === 1 ? room.perBench : Math.ceil(room.perBench / 2));

export const buildSeating = (rooms: Classroom[], secs: SectionDef[], studentsOf: (sectionId: string) => Student[], lt: Group = '2nd', pattern: SeatPattern = 'zigzag') => {
  const q: Record<Group, Student[]> = { '1st': [], '2nd': [] };
  const ltSecs = new Set(secs.filter((x) => x.std === 'LT').map((x) => x.id));
  secs.forEach((s) => studentsOf(s.id).filter((x) => x.active).forEach((x) => q[groupOf(s.std, lt)].push(x)));
  const total = q['1st'].length + q['2nd'].length;
  const two = q['1st'].length > 0 && q['2nd'].length > 0; const only: Group = q['1st'].length ? '1st' : '2nd';
  const plans: RoomPlan[] = rooms.map((room) => {
    const cols = benchCols(room); const seats: Seat[] = [];
    for (let b = 0; b < room.benches; b++) {
      const row = Math.floor(b / cols), col = b % cols;
      for (let s = 0; s < room.perBench; s++) seats.push({ bench: b, side: s, row, col, label: `${row + 1}-${col + 1}${room.perBench > 1 ? 'LMR'[s] || String(s + 1) : ''}` });
    }
    // Students go in roll-number order; the pattern decides where the next roll number sits.
    let order: Seat[];
    if (pattern === 'ushape') {
      // U: one after another down the left column, then over to the next column on the right and back up, and so on
      order = [...seats].sort((a, b) => a.col - b.col || (a.col % 2 ? b.row - a.row : a.row - b.row) || a.side - b.side);
    } else {
      // zig-zag: 1st on the far left, 2nd on the far right, 3rd next in from the left, 4th next in from the right ...
      const seatsPerRow = cols * room.perBench; const pos = (x: Seat) => x.col * room.perBench + x.side;
      const rank = (x: Seat) => { const p = pos(x); const fromLeft = p, fromRight = seatsPerRow - 1 - p; return fromLeft <= fromRight ? fromLeft * 2 : fromRight * 2 + 1; };
      order = [...seats].sort((a, b) => a.row - b.row || rank(a) - rank(b));
    }
    order.forEach((seat) => {
      let g: Group | null;
      if (two) g = (seat.row + seat.col + seat.side) % 2 === 0 ? '1st' : '2nd';
      else g = room.perBench === 1 || seat.side % 2 === 0 ? only : null;
      if (!g || !q[g].length) return;
      seat.student = q[g].shift(); seat.group = g; seat.lt = ltSecs.has(seat.student!.sectionId);
    });
    return { room, cols, seats, count: seats.filter((x) => x.student).length };
  });
  return { plans, unplaced: q['1st'].length + q['2nd'].length, total, two };
};

// add rooms (largest first) until everyone has a seat
export const autoRooms = (all: Classroom[], secs: SectionDef[], studentsOf: (sectionId: string) => Student[], lt: Group = '2nd', pattern: SeatPattern = 'zigzag') => {
  const sorted = [...all].sort((a, b) => a.floor - b.floor || a.name.localeCompare(b.name, undefined, { numeric: true }));
  const chosen: Classroom[] = [];
  for (const r of sorted) { if (chosen.length && buildSeating(chosen, secs, studentsOf, lt, pattern).unplaced === 0) break; chosen.push(r); }
  return chosen.map((r) => r.id);
};
