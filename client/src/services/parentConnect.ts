import { apiFetch } from './api';

export interface PcContact {
  pairKey: string; userId: string; name: string; role: 'STUDENT' | 'PARENT'; gender: string | null; avatarUrl: string | null; relationship: string;
  registerNumber: string; studentName: string; parentName: string; studentUserId: string; parentUserId: string;
  studentAvatar: string | null; parentAvatar: string | null; studentGender: string | null; dob: string | null; classLabel: string; hostelite: boolean; blocked: boolean;
}
export interface PcHistory {
  id: string; student_name: string; parent_name: string; status: string; initiated_at: string; started_at: string | null; duration_seconds: number; end_reason: string | null; direction: 'in' | 'out';
}
export interface PcStudent { id: string; userId: string; name: string; registerNumber: string; gender: string | null; dob: string | null; photo: string | null; classLabel: string; level: 'I PU' | 'II PU' | ''; tab: string; talkSeconds: number; callCount: number; enabled: boolean; allowedContacts: number }
export interface PcParent { id: string; relationship: string; name: string; phone: string; authorized: boolean }
export interface PcCallRow { id: string; status: string; at: string; seconds: number; direction: 'incoming' | 'outgoing'; name: string; relationship: string; phone: string }
export interface PcDay { day_of_week: number; start_time: string; end_time: string; max_duration_minutes: number; is_active: number }
export interface PcAvailability { isAllowed: boolean; reason: string | null; schedule: PcDay | null }
export interface PcLive { id: string; student_name: string; parent_name: string; status: string; initiated_at: string; started_at: string | null }
export interface PcPoll {
  call: { id: string; status: string; isIncoming: boolean; peerUserId: string; startedAt: string | null } | null;
  known: { id: string; status: string; endReason: string | null } | null;
  signals: { id: number; callId: string; type: 'accepted' | 'offer' | 'answer' | 'ice'; payload: any }[];
}

const post = (url: string, body?: unknown) => apiFetch<any>(`/parent-connect${url}`, { method: 'POST', body: JSON.stringify(body ?? {}) });

export const pcApi = {
  contacts: () => apiFetch<{ contacts: PcContact[] }>('/parent-connect/contacts').then((r) => r.contacts),
  availability: () => apiFetch<PcAvailability>('/parent-connect/availability'),
  history: () => apiFetch<{ history: PcHistory[] }>('/parent-connect/history').then((r) => r.history),
  schedule: () => apiFetch<{ schedule: PcDay[] }>('/parent-connect/schedule').then((r) => r.schedule),
  saveSchedule: (schedule: PcDay[]) => apiFetch<any>('/parent-connect/schedule', { method: 'PUT', body: JSON.stringify({ schedule }) }),
  live: () => apiFetch<{ live: PcLive[]; stats: { calls24h: number; completed24h: number; missed24h: number; seconds24h: number } }>('/parent-connect/live'),
  register: () => apiFetch<{ students: PcStudent[] }>('/parent-connect/register').then((r) => r.students),
  dossier: (id: string) => apiFetch<{ contacts: PcParent[]; calls: PcCallRow[] }>(`/parent-connect/register/${id}`),
  addContact: (id: string, body: { relationship: string; name: string; phone: string }) => post(`/register/${id}/contacts`, body),
  editContact: (id: string, body: { name: string; phone: string }) => apiFetch<any>(`/parent-connect/contacts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  authorize: (id: string, authorized: boolean) => post(`/contacts/${id}/authorize`, { authorized }),
  block: (studentUserId: string, blocked: boolean) => post(`/students/${studentUserId}/block`, { blocked }),
  start: (toUserId: string) => post('/calls', { to_user_id: toUserId }) as Promise<{ callId: string; maxDurationMinutes: number }>,
  accept: (id: string) => post(`/calls/${id}/accept`),
  reject: (id: string) => post(`/calls/${id}/reject`),
  end: (id: string) => post(`/calls/${id}/end`),
  signal: (id: string, type: 'offer' | 'answer' | 'ice', payload: unknown) => post(`/calls/${id}/signal`, { type, payload }),
  poll: (after: number, callId?: string) => apiFetch<PcPoll>(`/parent-connect/poll?after=${after}${callId ? `&call_id=${callId}` : ''}`),
};

export const fmtDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
