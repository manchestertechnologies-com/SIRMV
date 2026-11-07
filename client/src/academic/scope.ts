import { getTimetables, getStaff, staffById, SubjectName } from './sampleData';
import { TEACHING_SUBJECTS, staffOf } from './sampleData';

// What each role is allowed to see: null means everything.
export const deptOfHod = (staffId?: string): SubjectName | null => TEACHING_SUBJECTS.find((d) => staffOf(d).hod?.id === staffId) || null;

// sections a person teaches (or is class teacher of); a HOD sees the sections their department teaches
export const sectionsFor = (role?: string, staffId?: string): string[] | null => {
  if (role !== 'HOD' && role !== 'TEACHER') return null;
  const me = staffById(staffId || '');
  const ids = new Set<string>();
  getTimetables().forEach((grid, sid) => grid.forEach((row) => row.forEach((c) => {
    if (role === 'TEACHER' ? c.staffId === staffId : staffById(c.staffId)?.subject === me?.subject) ids.add(sid);
  })));
  return [...ids];
};
void getStaff;
