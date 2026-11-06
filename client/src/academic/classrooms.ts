// Classroom blueprint: floors > rooms > benches. Saved on this device until the database is connected.
export interface Classroom { id: string; floor: number; name: string; benches: number; perBench: number }
export const FLOOR_NAMES = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor'];
const KEY = 'mt-classrooms';

const defaults = (): Classroom[] => {
  const out: Classroom[] = [];
  FLOOR_NAMES.forEach((_, f) => { for (let n = 1; n <= 6; n++) out.push({ id: `r${f}${n}`, floor: f, name: `Room ${(f + 1) * 100 + n}`, benches: 12 + ((f * 3 + n * 2) % 7), perBench: 2 }); });
  return out;
};
export const loadClassrooms = (): Classroom[] => {
  try { const v = localStorage.getItem(KEY); if (v) return JSON.parse(v) as Classroom[]; } catch { /* ignore */ }
  return defaults();
};
export const saveClassrooms = (list: Classroom[]) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ } };
export const roomCapacity = (r: Classroom) => r.benches * r.perBench;
export const totalCapacity = (list: Classroom[]) => list.reduce((a, r) => a + roomCapacity(r), 0);
