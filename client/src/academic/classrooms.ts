// Classroom blueprint: floors > rooms > benches. Saved on this device until the database is connected.
export interface Classroom { id: string; floor: number; name: string; benches: number; perBench: number }
export const floorName = (i: number) => (i === 0 ? 'Ground Floor' : `${i}${['th', 'st', 'nd', 'rd'][i % 10 > 3 || Math.floor(i / 10) === 1 ? 0 : i % 10]} Floor`);
export const FLOOR_NAMES = [0, 1, 2, 3].map(floorName);
const KEY = 'mt-classrooms';

export interface ClassroomSetup { floors: number; roomsPerFloor: number; benches: number; perBench: number; prefix: string }
export const generateClassrooms = (c: ClassroomSetup): Classroom[] => {
  const out: Classroom[] = [];
  for (let f = 0; f < c.floors; f++) for (let n = 1; n <= c.roomsPerFloor; n++) out.push({ id: `r${f}-${n}-${Date.now() % 100000}`, floor: f, name: `${c.prefix} ${(f + 1) * 100 + n}`.trim(), benches: c.benches, perBench: c.perBench });
  return out;
};
const defaults = (): Classroom[] => {
  const out: Classroom[] = [];
  for (let f = 0; f < 4; f++) for (let n = 1; n <= 6; n++) out.push({ id: `r${f}${n}`, floor: f, name: `Room ${(f + 1) * 100 + n}`, benches: 12 + ((f * 3 + n * 2) % 7), perBench: 2 });
  return out;
};
export const hasSavedClassrooms = () => { try { return localStorage.getItem(KEY) !== null; } catch { return false; } };
export const loadClassrooms = (): Classroom[] => {
  try { const v = localStorage.getItem(KEY); if (v) return JSON.parse(v) as Classroom[]; } catch { /* ignore */ }
  return defaults();
};
export const saveClassrooms = (list: Classroom[]) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ } };
export const roomCapacity = (r: Classroom) => r.benches * r.perBench;
export const totalCapacity = (list: Classroom[]) => list.reduce((a, r) => a + roomCapacity(r), 0);
