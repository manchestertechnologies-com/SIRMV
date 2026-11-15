import { accountStaff, getStaff } from '../academic/sampleData';
import { portraitUrl, type PortraitRole, type PortraitSpec } from './portrait';

const FEMALE_PREFIX = /^(mrs|ms|smt|miss|kum)\b\.?/i;
const MALE_PREFIX = /^(mr|shri|sri)\b\.?/i;
const MALE_A = new Set(['krishna', 'surya', 'arjuna', 'sudhakara', 'prasanna', 'chandra', 'bala', 'rama', 'ravindra']);

export const honorificless = (name: string) => name.replace(/\s*\((student|parent)\)\s*$/i, '').replace(/^(mr|mrs|ms|dr|smt|shri|sri|miss)\.?\s+/i, '').trim();

export const guessGender = (name: string): 'Male' | 'Female' => {
  const n = name.trim();
  if (FEMALE_PREFIX.test(n)) return 'Female';
  if (MALE_PREFIX.test(n)) return 'Male';
  const first = honorificless(n).split(/\s+/)[0].toLowerCase();
  if (MALE_A.has(first)) return 'Male';
  return /(a|i|ee|ya)$/.test(first) ? 'Female' : 'Male';
};

const ROLE: Record<string, PortraitRole> = {
  STUDENT: 'student', PARENT: 'parent', TEACHER: 'teacher', HOD: 'hod', ADMIN: 'admin', PRINCIPAL: 'admin',
  WARDEN: 'staff', HEAD_WARDEN: 'staff', FLOOR_ATTENDER: 'staff', NON_TEACHING_STAFF: 'staff', GATE_STAFF: 'staff', EXAM_DEPARTMENT: 'staff',
};
const AGE: Record<string, number> = { student: 17, parent: 46, teacher: 32, hod: 49, admin: 52, staff: 38 };

// the picture for a signed-in account: staff use their record in the staff list (same gender and age everywhere)
export function portraitForAccount(u: { name: string; email?: string; role: string; id?: string }): PortraitSpec {
  const role = ROLE[u.role] || 'staff';
  const st = role !== 'student' && role !== 'parent' ? accountStaff(u.email, u.role as any) : null;
  if (st) return { seed: st.id, gender: st.gender, age: Math.min(62, 24 + st.experience + (st.id.length % 4)), role };
  return { seed: u.id || u.email || u.name, gender: guessGender(u.name), age: AGE[role], role };
}
export const accountPortraitUrl = (u: { name: string; email?: string; role: string; id?: string }) => portraitUrl(portraitForAccount(u));
// (getStaff re-exported only so tree-shaking keeps the staff list lazily loaded with this module)
void getStaff;
