import { SubjectName } from './sampleData';

// Invigilation requests and notifications, kept on this device until the backend is connected.
export interface DutyRequest {
  id: string; examName: string; sectionId: string; hallName: string; classTitle: string;
  date: string; start: string; durationMin: number; sectionIds: string[];
  dept: SubjectName; status: 'pending' | 'assigned'; staffId?: string; createdAt: number; assignedAt?: number;
}
export interface Note { id: string; to: 'exam' | 'hod' | 'staff'; dept?: SubjectName; staffId?: string; text: string; ts: number; read: boolean }

const RK = 'mt-duty-requests', NK = 'mt-notes';
const read = <T,>(k: string): T[] => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T[]) : []; } catch { return []; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

export const loadRequests = () => read<DutyRequest>(RK);
export const saveRequests = (l: DutyRequest[]) => write(RK, l);
export const loadNotes = () => read<Note>(NK).sort((a, b) => b.ts - a.ts);
export const addNotes = (n: Omit<Note, 'id' | 'ts' | 'read'>[]) => {
  const now = Date.now(); write(NK, [...read<Note>(NK), ...n.map((x, i) => ({ ...x, id: `n${now}-${i}`, ts: now + i, read: false }))]);
};
export const markNotesRead = (ids: string[]) => write(NK, read<Note>(NK).map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
