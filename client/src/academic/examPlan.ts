import { SLOTS, Staff, WEEKDAYS, allSections, getStaff, getTimetables } from './sampleData';

// One exam plan saved on this device until the database is connected.
export type Syllabus = '1st' | '2nd'; // the paper LT (repeater) classes write; 11th and 12th follow their own class
export interface ExamPlan {
  name: string; date: string; start: string; durationMin: number;
  syllabus: Syllabus; /* LT paper */ pattern?: 'zigzag' | 'ushape'; sectionIds: string[]; roomIds: string[]; demand: Record<string, number>; // demand = faculty wanted from each department
}
export const sectionsFor = () => allSections();
const KEY = 'mt-exam-plan';
// Old saved plans may miss fields; fill them in so a screen never crashes on them.
export const fixPlan = (p: any): ExamPlan => ({
  name: typeof p?.name === 'string' ? p.name : 'Exam', date: typeof p?.date === 'string' ? p.date : todayIso(),
  start: typeof p?.start === 'string' ? p.start : '09:00', durationMin: Number(p?.durationMin) || 180,
  syllabus: p?.syllabus === '1st' ? '1st' : '2nd',
  pattern: p?.pattern === 'ushape' ? 'ushape' : 'zigzag', sectionIds: Array.isArray(p?.sectionIds) ? p.sectionIds : [], roomIds: Array.isArray(p?.roomIds) ? p.roomIds : [],
  demand: p?.demand && typeof p.demand === 'object' ? p.demand : {},
});
export const loadPlan = (): ExamPlan | null => { try { const v = localStorage.getItem(KEY); return v ? fixPlan(JSON.parse(v)) : null; } catch { return null; } };
export const savePlan = (p: ExamPlan) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ } };
export const clearPlan = () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } };

export const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const toMin = (t: string) => { // "08:30 AM" or "13:05"
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(t.trim()); if (!m) return 0;
  let h = +m[1]; const ap = m[3]?.toUpperCase(); if (ap === 'PM' && h < 12) h += 12; if (ap === 'AM' && h === 12) h = 0; return h * 60 + +m[2];
};
export const fmtTime = (t: string) => { const m = toMin(t); const h = Math.floor(m / 60); return `${String(h % 12 || 12).padStart(2, '0')}:${String(m % 60).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
export const planStart = (p: ExamPlan) => new Date(`${p.date}T${p.start}:00`);

export const isTeacher = (s: Staff) => s.role !== 'Non-Teaching' && s.subject !== 'Administration';

// Faculty who have no lecture during the exam hours (lectures of the exam classes themselves are cancelled)
export const freeFaculty = (date: string, start: string, durationMin: number, examSections: string[], taken: string[] = []): Staff[] => {
  const day = new Date(`${date}T00:00:00`).getDay(); const d = (day + 6) % 7; // Mon = 0
  const from = toMin(start), to = from + durationMin; const busy = new Set<string>();
  if (d < WEEKDAYS.length) {
    const classSlots = SLOTS.filter((s) => s.kind === 'class');
    getTimetables().forEach((grid, sid) => {
      if (examSections.includes(sid)) return;
      grid[d].forEach((cell, p) => { const sl = classSlots[p]; if (sl && toMin(sl.start) < to && toMin(sl.end) > from) busy.add(cell.staffId); });
    });
  }
  return getStaff().filter((s) => isTeacher(s) && !busy.has(s.id) && !taken.includes(s.id));
};

export const sectionsAll = () => allSections();
