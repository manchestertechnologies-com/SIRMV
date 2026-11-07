import { Classroom } from './classrooms';
import { SectionDef, Student } from './sampleData';

// Seating rules (benches normally have 3 seats):
//  - papers for two syllabuses (1st PU and 2nd PU): the two classes sit on alternate seats, so every seat is used
//  - one syllabus only: 2 students per bench, the middle seat stays empty; the rest sit in the next room
export type Group = '1st' | '2nd';
export const groupOf = (std: string): Group => (std === '11' ? '1st' : '2nd'); // LT (repeaters) write the 2nd PU paper
export const groupName = (g: Group) => (g === '1st' ? '1st PU' : '2nd PU');

export interface Seat { bench: number; side: number; row: number; col: number; label: string; student?: Student; group?: Group }
export interface RoomPlan { room: Classroom; cols: number; seats: Seat[]; count: number }

export const benchCols = (room: Classroom) => Math.min(Math.max(room.benches, 1), room.benches > 24 ? 6 : room.benches > 12 ? 5 : 4);
export const seatsFor = (room: Classroom, twoGroups: boolean) => room.benches * (twoGroups || room.perBench === 1 ? room.perBench : Math.ceil(room.perBench / 2));

export const buildSeating = (rooms: Classroom[], secs: SectionDef[], studentsOf: (sectionId: string) => Student[]) => {
  const q: Record<Group, Student[]> = { '1st': [], '2nd': [] };
  secs.forEach((s) => studentsOf(s.id).filter((x) => x.active).forEach((x) => q[groupOf(s.std)].push(x)));
  const total = q['1st'].length + q['2nd'].length;
  const two = q['1st'].length > 0 && q['2nd'].length > 0; const only: Group = q['1st'].length ? '1st' : '2nd';
  const plans: RoomPlan[] = rooms.map((room) => {
    const cols = benchCols(room); const seats: Seat[] = [];
    for (let b = 0; b < room.benches; b++) {
      const row = Math.floor(b / cols), col = b % cols;
      for (let s = 0; s < room.perBench; s++) seats.push({ bench: b, side: s, row, col, label: `${row + 1}-${col + 1}${room.perBench > 1 ? 'LMR'[s] || String(s + 1) : ''}` });
    }
    // fill benches row by row, snaking left-right then right-left
    const order = [...seats].sort((a, b) => a.row - b.row || (a.row % 2 ? b.col - a.col : a.col - b.col) || a.side - b.side);
    order.forEach((seat) => {
      let g: Group | null;
      if (two) g = (seat.row + seat.col + seat.side) % 2 === 0 ? '1st' : '2nd';
      else g = room.perBench === 1 || seat.side % 2 === 0 ? only : null;
      if (!g || !q[g].length) return;
      seat.student = q[g].shift(); seat.group = g;
    });
    return { room, cols, seats, count: seats.filter((x) => x.student).length };
  });
  return { plans, unplaced: q['1st'].length + q['2nd'].length, total, two };
};

// add rooms (largest first) until everyone has a seat
export const autoRooms = (all: Classroom[], secs: SectionDef[], studentsOf: (sectionId: string) => Student[]) => {
  const sorted = [...all].sort((a, b) => a.floor - b.floor || a.name.localeCompare(b.name, undefined, { numeric: true }));
  const chosen: Classroom[] = [];
  for (const r of sorted) { if (chosen.length && buildSeating(chosen, secs, studentsOf).unplaced === 0) break; chosen.push(r); }
  return chosen.map((r) => r.id);
};
