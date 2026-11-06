// Sample data for the academic flow (Students / Classes / Staffs).
// Everything is generated deterministically so screens look the same on every
// load. Swap these functions for API calls when the database is connected.

export type Status = 'P' | 'A' | 'L' | 'H';
export type SubjectName =
  | 'Physics' | 'Chemistry' | 'Mathematics' | 'Biology' | 'Computer Science'
  | 'English' | 'Kannada' | 'Hindi' | 'Sanskrit' | 'Administration';

// ---------- helpers ----------
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
const rng = (seed: string) => {
  let a = hash(seed) || 1;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
export const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']; const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const FIRST_M = ['Adithya', 'Rahul', 'Karthik', 'Manoj', 'Pranav', 'Harsha', 'Naveen', 'Sachin', 'Darshan', 'Varun', 'Chetan', 'Mohith', 'Yashwanth', 'Sumanth', 'Abhishek', 'Rohan', 'Tejas', 'Nikhil', 'Vinay', 'Shreyas', 'Ganesh', 'Lokesh', 'Bharath', 'Kishan', 'Suhas'];
const FIRST_F = ['Ananya', 'Divya', 'Meghana', 'Pooja', 'Shreya', 'Keerthi', 'Nandini', 'Sneha', 'Bhavana', 'Chaitra', 'Deepika', 'Harshitha', 'Kavya', 'Lakshmi', 'Namratha', 'Rakshitha', 'Sahana', 'Tejaswini', 'Vaishnavi', 'Spoorthi'];
const LAST = ['S', 'N', 'R', 'K', 'M', 'G', 'B', 'H', 'P', 'V', 'Gowda', 'Naik', 'Shetty', 'Hegde', 'Patil', 'Reddy', 'Bhat', 'Rao'];

// ---------- structure: standard > class (stream) > batch > section ----------
export interface SectionDef {
  id: string; std: string; stream: string; batch: string; code: string;
  title: string;            // "12th - PCMB - FTB"
  subjects: SubjectName[];
  classTeacherId: string;
  count: number;
}
export interface BatchDef { name: string; sections: SectionDef[] }
export interface StreamDef { stream: string; label: string; subjects: SubjectName[]; batches: BatchDef[] }
export interface StandardDef { id: string; label: string; full: string; streams: StreamDef[] }

const PCMB: SubjectName[] = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];
const PCMC: SubjectName[] = ['Physics', 'Chemistry', 'Mathematics', 'Computer Science'];

const plan: { id: string; label: string; full: string; streams: { stream: string; label: string; batches: { name: string; secs: [string, number][] }[] }[] }[] = [
  { id: '11', label: '11th', full: '11th - Standard', streams: [
    { stream: 'PCMB', label: 'Physics, Chemistry, Maths, Biology', batches: [
      { name: 'NEET Foundation', secs: [['FTB', 30], ['ATB', 28]] },
      { name: 'KCET Regular', secs: [['KTB', 27]] } ] },
    { stream: 'PCMC', label: 'Physics, Chemistry, Maths, Computer Science', batches: [
      { name: 'JEE Foundation', secs: [['JTB', 29]] } ] } ] },
  { id: '12', label: '12th', full: '12th - Standard', streams: [
    { stream: 'PCMB', label: 'Physics, Chemistry, Maths, Biology', batches: [
      { name: 'NEET Achievers', secs: [['FTB', 30], ['ATB', 29]] },
      { name: 'KCET Regular', secs: [['KTB', 26]] } ] },
    { stream: 'PCMC', label: 'Physics, Chemistry, Maths, Computer Science', batches: [
      { name: 'JEE Achievers', secs: [['JTB', 27]] } ] } ] },
  { id: 'LT', label: 'LT', full: 'LT - Long Term', streams: [
    { stream: 'PCMB', label: 'Physics, Chemistry, Maths, Biology', batches: [
      { name: 'NEET Repeaters', secs: [['LTB', 24], ['LTC', 22]] } ] },
    { stream: 'PCMC', label: 'Physics, Chemistry, Maths, Computer Science', batches: [
      { name: 'JEE Repeaters', secs: [['LTJ', 20]] } ] } ] },
];

// ---------- staff ----------
export interface Staff {
  id: string; name: string; gender: 'Male' | 'Female'; role: 'HOD' | 'Teacher' | 'Non-Teaching';
  designation: string; subject: SubjectName; mobile: string; email: string; empId: string;
  qualification: string; experience: number; region: string; joined: string;
}
export const TEACHING_SUBJECTS: SubjectName[] = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Computer Science', 'English', 'Kannada', 'Hindi', 'Sanskrit'];
export const ALL_DEPTS: SubjectName[] = [...TEACHING_SUBJECTS, 'Administration'];

const TEACHER_COUNT: Record<string, number> = { Physics: 5, Chemistry: 5, Mathematics: 5, Biology: 4, 'Computer Science': 3, English: 3, Kannada: 2, Hindi: 2, Sanskrit: 2, Administration: 0 };
const NT_ROLES: Record<string, string[]> = {
  Physics: ['Physics Lab Assistant'], Chemistry: ['Chemistry Lab Assistant', 'Lab Attender'], Mathematics: ['Department Assistant'],
  Biology: ['Biology Lab Assistant', 'Lab Attender'], 'Computer Science': ['Computer Lab Technician'], English: ['Department Assistant'],
  Kannada: [], Hindi: [], Sanskrit: [],
  Administration: ['Office Superintendent', 'Accountant', 'Admissions Clerk', 'Librarian', 'Front Office Executive', 'Floor Attender', 'Gate Keeper'],
};
const QUAL: Record<string, string> = { Physics: 'M.Sc Physics, B.Ed', Chemistry: 'M.Sc Chemistry, B.Ed', Mathematics: 'M.Sc Mathematics, B.Ed', Biology: 'M.Sc Zoology, B.Ed', 'Computer Science': 'MCA, B.Ed', English: 'M.A English, B.Ed', Kannada: 'M.A Kannada, B.Ed', Hindi: 'M.A Hindi, B.Ed', Sanskrit: 'M.A Sanskrit, B.Ed', Administration: 'B.Com / MBA' };

let staffCache: Staff[] | null = null;
export const getStaff = (): Staff[] => {
  if (staffCache) return staffCache;
  const out: Staff[] = [];
  const regions = ['Shivamogga', 'Davangere', 'Ballari', 'Bhadravati', 'Hassan', 'Tumakuru'];
  ALL_DEPTS.forEach((dept) => {
    const r = rng('staff-' + dept);
    const mk = (idx: number, role: Staff['role'], designation: string) => {
      const female = r() > 0.55;
      const name = `${female ? 'Mrs.' : 'Mr.'} ${pick(r, female ? FIRST_F : FIRST_M)} ${pick(r, LAST)}`;
      const slug = name.toLowerCase().replace(/[^a-z]/g, '');
      out.push({
        id: `stf-${dept.replace(/\s/g, '').toLowerCase()}-${idx}`, name, gender: female ? 'Female' : 'Male', role, designation, subject: dept,
        mobile: `9${Math.floor(r() * 900000000 + 100000000)}`, email: `${slug.slice(3, 14)}@sirmv.edu.in`,
        empId: `EMP${1000 + out.length}`, qualification: QUAL[dept], experience: 2 + Math.floor(r() * 18), region: pick(r, regions),
        joined: `${2008 + Math.floor(r() * 16)}-0${1 + Math.floor(r() * 8)}-${10 + Math.floor(r() * 15)}`,
      });
    };
    if (dept !== 'Administration') {
      mk(0, 'HOD', `HOD - ${dept}`);
      for (let i = 1; i <= TEACHER_COUNT[dept]; i++) mk(i, 'Teacher', `${i % 2 ? 'Senior ' : ''}Lecturer - ${dept}`);
    }
    (NT_ROLES[dept] || []).forEach((d, i) => mk(50 + i, 'Non-Teaching', d));
  });
  // admin head
  const admin = out.find((s) => s.subject === 'Administration');
  if (admin) { admin.role = 'HOD'; admin.designation = 'Office Superintendent (Head)'; }
  staffCache = out;
  return out;
};
export const staffOf = (dept: SubjectName) => {
  const all = getStaff().filter((s) => s.subject === dept);
  return {
    hod: all.find((s) => s.role === 'HOD') || null,
    teaching: all.filter((s) => s.role === 'Teacher'),
    nonTeaching: all.filter((s) => s.role === 'Non-Teaching'),
  };
};

// ---------- sections ----------
let stdCache: StandardDef[] | null = null;
export const getStandards = (): StandardDef[] => {
  if (stdCache) return stdCache;
  const teachers = getStaff().filter((s) => s.role !== 'Non-Teaching' && s.subject !== 'Administration');
  let n = 0;
  stdCache = plan.map((p) => ({
    id: p.id, label: p.label, full: p.full,
    streams: p.streams.map((st) => {
      const subjects = st.stream === 'PCMB' ? PCMB : PCMC;
      return {
        stream: st.stream, label: st.label, subjects,
        batches: st.batches.map((b) => ({
          name: b.name,
          sections: b.secs.map(([code, count]) => {
            const ct = teachers[(n++ * 3 + 1) % teachers.length];
            return {
              id: `${p.id}-${st.stream}-${code}`, std: p.id, stream: st.stream, batch: b.name, code,
              title: `${p.label} - ${st.stream} - ${code}`, subjects, classTeacherId: ct.id, count,
            } as SectionDef;
          }),
        })),
      } as StreamDef;
    }),
  }));
  return stdCache;
};
export const allSections = (): SectionDef[] => getStandards().flatMap((s) => s.streams.flatMap((st) => st.batches.flatMap((b) => b.sections)));
export const sectionById = (id: string) => allSections().find((s) => s.id === id) || null;
export const staffById = (id: string) => getStaff().find((s) => s.id === id) || null;
export const standardTotals = (std: StandardDef) => {
  const secs = std.streams.flatMap((st) => st.batches.flatMap((b) => b.sections));
  return { classes: secs.length, students: secs.reduce((a, s) => a + s.count, 0) };
};

// ---------- students ----------
export interface DocItem { name: string; status: 'Verified' | 'Pending' | 'Missing'; size: string; updated: string }
export interface Student {
  id: string; sectionId: string; no: number; name: string; roll: string; gender: 'Male' | 'Female';
  sslc: string; hostel: null | { block: string; floor: string; room: string; bed: string };
  warden: null | { name: string; phone: string };
  fatherName: string; fatherOccupation: string; phone: string; dob: string; blood: string; active: boolean;
  ability: number; docs: DocItem[];
}
const SSLC = ['ICSE', 'CBSE', 'State', 'State', 'CBSE'];
const OCC = ['Farmer', 'Business', 'Government Employee', 'Teacher', 'Engineer', 'Doctor', 'Driver', 'Shopkeeper', 'Bank Employee'];
const WARDENS = [{ name: 'Mr. Basavaraj K', phone: '9448012345' }, { name: 'Mrs. Shobha R', phone: '9886023456' }, { name: 'Mr. Manjunath G', phone: '9845034567' }];
const BLOCKS = ['NEW CAMPUS - D-BLOCK - 2026-27', 'MAIN CAMPUS - A-BLOCK - 2026-27', 'NEW CAMPUS - C-BLOCK - 2026-27'];
const FLOORS = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor'];
const BEDS = ['Bunk Upper Bed', 'Bunk Lower Bed', 'Single Cot'];

const studentCache = new Map<string, Student[]>();
export const getStudents = (sectionId: string): Student[] => {
  const hit = studentCache.get(sectionId); if (hit) return hit;
  const sec = sectionById(sectionId); if (!sec) return [];
  const r = rng('students-' + sectionId);
  const base = 440000 + (hash(sectionId) % 40) * 1000;
  const list: Student[] = [];
  for (let i = 0; i < sec.count; i++) {
    const female = r() > 0.45;
    const name = `${pick(r, female ? FIRST_F : FIRST_M)} ${pick(r, LAST)}`;
    const hosteler = r() > 0.3;
    const wd = pick(r, WARDENS);
    const d = (n: string, ok: number): DocItem => {
      const x = r(); return { name: n, status: x < ok ? 'Verified' : x < ok + 0.12 ? 'Pending' : 'Missing', size: `${120 + Math.floor(r() * 900)} KB`, updated: `2026-0${1 + Math.floor(r() * 9)}-${10 + Math.floor(r() * 18)}` };
    };
    list.push({
      id: `${sectionId}-${i + 1}`, sectionId, no: i + 1, name, roll: String(base + Math.floor(r() * 900) + i * 7), gender: female ? 'Female' : 'Male',
      sslc: pick(r, SSLC),
      hostel: hosteler ? { block: pick(r, BLOCKS), floor: pick(r, FLOORS), room: `Room ${1 + Math.floor(r() * 60)}`, bed: pick(r, BEDS) } : null,
      warden: hosteler ? wd : null,
      fatherName: `${pick(r, FIRST_M)} ${pick(r, LAST)}`, fatherOccupation: pick(r, OCC), phone: `9${Math.floor(r() * 900000000 + 100000000)}`,
      dob: `200${7 + Math.floor(r() * 2)}-${String(1 + Math.floor(r() * 12)).padStart(2, '0')}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')}`,
      blood: pick(r, ['A+', 'B+', 'O+', 'AB+', 'O-', 'B-']), active: r() > 0.06,
      ability: 0.45 + r() * 0.5,
      docs: [d('SSLC Marks Card', 0.85), d('Aadhaar Card', 0.8), d('Transfer Certificate', 0.7), d('Caste / Income Certificate', 0.6), d('Passport Photo', 0.9), d('Hostel Agreement', hosteler ? 0.75 : 0.2)],
    });
  }
  studentCache.set(sectionId, list);
  return list;
};
export const findStudent = (id: string): Student | null => {
  const sid = id.slice(0, id.lastIndexOf('-'));
  return getStudents(sid).find((s) => s.id === id) || null;
};
export const standardStudents = (stdId: string) => allSections().filter((s) => s.std === stdId).flatMap((s) => getStudents(s.id));

// ---------- tests ----------
export interface QResult { n: number; subject: SubjectName; chapter: string; status: 'correct' | 'wrong' | 'skipped'; marked: string; key: string; secs: number }
export interface SubjectResult { subject: SubjectName; total: number; correct: number; wrong: number; skipped: number; marks: number; max: number; mins: number }
export interface TestResult {
  id: string; name: string; date: string; kind: string; marks: number; max: number; percent: number; rank: number; classSize: number;
  percentile: number; correct: number; wrong: number; skipped: number; accuracy: number; mins: number; subjects: SubjectResult[]; questions: QResult[];
}
export const CHAPTERS: Record<string, string[]> = {
  Physics: ['Kinematics', 'Laws of Motion', 'Work Energy Power', 'Rotational Motion', 'Gravitation', 'Thermodynamics', 'Electrostatics', 'Current Electricity'],
  Chemistry: ['Mole Concept', 'Atomic Structure', 'Chemical Bonding', 'Equilibrium', 'Thermodynamics', 'Organic Basics', 'Hydrocarbons', 'Electrochemistry'],
  Mathematics: ['Sets & Relations', 'Trigonometry', 'Complex Numbers', 'Sequences', 'Limits', 'Derivatives', 'Integrals', 'Probability'],
  Biology: ['Cell Biology', 'Plant Kingdom', 'Animal Kingdom', 'Genetics', 'Human Physiology', 'Ecology', 'Biotechnology', 'Evolution'],
  'Computer Science': ['Number Systems', 'Python Basics', 'Data Structures', 'Boolean Logic', 'Networking', 'Databases', 'Algorithms', 'Web Basics'],
};
const TESTS = [
  ['Unit Test 1', 'Unit', '2026-06-20'], ['Weekly Test 2', 'Weekly', '2026-07-04'], ['Unit Test 2', 'Unit', '2026-07-25'], ['Weekly Test 4', 'Weekly', '2026-08-08'],
  ['Part Test 1', 'Part', '2026-08-22'], ['Weekly Test 6', 'Weekly', '2026-09-05'], ['Grand Test 1', 'Grand', '2026-09-19'], ['Part Test 2', 'Part', '2026-10-03'],
  ['Weekly Test 8', 'Weekly', '2026-10-10'], ['Grand Test 2', 'Grand', '2026-10-17'], ['Unit Test 3', 'Unit', '2026-10-24'], ['Grand Test 3', 'Grand', '2026-10-31'],
];
const QPS = 25;

const resCache = new Map<string, Map<string, TestResult[]>>();
export const sectionResults = (sectionId: string): Map<string, TestResult[]> => {
  const hit = resCache.get(sectionId); if (hit) return hit;
  const sec = sectionById(sectionId)!; const studs = getStudents(sectionId);
  const map = new Map<string, TestResult[]>();
  studs.forEach((st) => {
    const r = rng('res-' + st.id);
    const rows: TestResult[] = TESTS.map(([name, kind, date], ti) => {
      const trend = 1 + (ti - 6) * 0.008;
      const questions: QResult[] = [];
      const subjects: SubjectResult[] = sec.subjects.map((sub) => {
        let correct = 0, wrong = 0, skipped = 0, mins = 0;
        const subAbility = Math.min(0.97, Math.max(0.12, st.ability * trend + (hash(st.id + sub) % 21 - 10) / 100));
        for (let q = 0; q < QPS; q++) {
          const diff = r() * 0.6; const x = r();
          const pc = subAbility * (1 - diff * 0.35);
          const key = 'ABCD'[Math.floor(r() * 4)];
          let status: QResult['status']; let marked = '-';
          if (x < pc) { status = 'correct'; marked = key; correct++; }
          else if (x < pc + (1 - pc) * 0.62) { status = 'wrong'; marked = 'ABCD'.replace(key, '')[Math.floor(r() * 3)]; wrong++; }
          else { status = 'skipped'; skipped++; }
          const secs = 25 + Math.floor(r() * 110); mins += secs / 60;
          questions.push({ n: questions.length + 1, subject: sub, chapter: CHAPTERS[sub][(q + ti) % 8], status, marked, key, secs });
        }
        return { subject: sub, total: QPS, correct, wrong, skipped, marks: correct * 4 - wrong, max: QPS * 4, mins: Math.round(mins) };
      });
      const marks = subjects.reduce((a, s) => a + s.marks, 0); const max = QPS * 4 * subjects.length;
      const correct = subjects.reduce((a, s) => a + s.correct, 0); const wrong = subjects.reduce((a, s) => a + s.wrong, 0);
      return {
        id: `${st.id}-t${ti + 1}`, name, kind, date, marks, max, percent: Math.max(0, Math.round((marks / max) * 100)), rank: 0, classSize: studs.length, percentile: 0,
        correct, wrong, skipped: QPS * subjects.length - correct - wrong, accuracy: pct(correct, correct + wrong), mins: subjects.reduce((a, s) => a + s.mins, 0), subjects, questions,
      };
    });
    map.set(st.id, rows);
  });
  TESTS.forEach((_, ti) => {
    const order = studs.map((s) => ({ id: s.id, m: map.get(s.id)![ti].marks })).sort((a, b) => b.m - a.m);
    order.forEach((o, idx) => { const t = map.get(o.id)![ti]; t.rank = idx + 1; t.percentile = Math.round(((studs.length - idx - 1) / Math.max(1, studs.length - 1)) * 1000) / 10; });
  });
  resCache.set(sectionId, map);
  return map;
};
export const studentTests = (st: Student) => sectionResults(st.sectionId).get(st.id) || [];
export interface Standing { st: Student; avg: number; tests: number; absents: number; rank: number }
export const leaderboard = (sectionId: string): Standing[] => {
  const res = sectionResults(sectionId);
  const rows = getStudents(sectionId).map((st) => {
    const t = res.get(st.id)!; const avg = Math.round(t.reduce((a, x) => a + x.percent, 0) / t.length);
    return { st, avg, tests: t.length, absents: hash(st.id + 'abs') % 6, rank: 0 };
  }).sort((a, b) => b.avg - a.avg);
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
};
export const sectionTestSummary = (sectionId: string) => {
  const res = sectionResults(sectionId);
  return TESTS.map(([name], ti) => {
    const all = Array.from(res.values()).map((v) => v[ti]);
    const avg = Math.round(all.reduce((a, t) => a + t.percent, 0) / all.length);
    const pass = all.filter((t) => t.percent >= 35).length;
    return { name, avg, appeared: all.length, pass, top: Math.max(...all.map((t) => t.percent)) };
  });
};
export const chapterReport = (st: Student, subject: SubjectName) => {
  const tests = studentTests(st);
  return CHAPTERS[subject].map((ch) => {
    let c = 0, w = 0, s = 0, secs = 0;
    tests.forEach((t) => t.questions.filter((q) => q.subject === subject && q.chapter === ch).forEach((q) => { if (q.status === 'correct') c++; else if (q.status === 'wrong') w++; else s++; secs += q.secs; }));
    const n = c + w + s;
    return { chapter: ch, correct: c, wrong: w, skipped: s, total: n, accuracy: pct(c, c + w), avgSecs: n ? Math.round(secs / n) : 0 };
  });
};

// ---------- attendance (students) ----------
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const dayName = (d: Date) => DAYS[d.getDay()];
export const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
export const sectionAttendance = (sectionId: string, days = 14) => {
  const sec = sectionById(sectionId)!; const rows: { sl: number; date: Date; day: string; pct: number; present: number; absent: number; leave: number }[] = [];
  const d = new Date(); let sl = 1;
  while (rows.length < days) {
    if (d.getDay() !== 0) {
      const r = rng(`att-${sectionId}-${iso(d)}`);
      const leave = Math.floor(r() * 3); const absent = Math.floor(r() * 4); const present = sec.count - leave - absent;
      rows.push({ sl: sl++, date: new Date(d), day: dayName(d), pct: pct(present, sec.count), present, absent, leave });
    }
    d.setDate(d.getDate() - 1);
  }
  return rows;
};

// ---------- staff attendance ----------
export const staffStatus = (id: string, d: Date): Status => {
  if (d.getDay() === 0) return 'H';
  const x = rng(`sa-${id}-${iso(d)}`)();
  return x < 0.91 ? 'P' : x < 0.95 ? 'L' : 'A';
};
export type Period = 'day' | 'week' | 'month' | 'year';
export interface Bucket { label: string; present: number; absent: number; leave: number; total: number }
export const attendanceSeries = (staff: Staff[], period: Period): Bucket[] => {
  const today = new Date(); const out: Bucket[] = [];
  const count = (d: Date): Bucket => {
    let p = 0, a = 0, l = 0;
    staff.forEach((s) => { const st = staffStatus(s.id, d); if (st === 'P') p++; else if (st === 'A') a++; else if (st === 'L') l++; });
    return { label: '', present: p, absent: a, leave: l, total: staff.length };
  };
  if (period === 'day' || period === 'week') {
    const n = period === 'day' ? 7 : 7;
    for (let i = n - 1; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); const b = count(d); b.label = d.getDate() + ' ' + dayName(d); out.push(b); }
  } else if (period === 'month') {
    for (let i = 29; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); const b = count(d); b.label = String(d.getDate()); out.push(b); }
  } else {
    for (let m = 11; m >= 0; m--) {
      const first = new Date(today.getFullYear(), today.getMonth() - m, 1); const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
      let p = 0, a = 0, l = 0, tot = 0;
      for (let dd = 1; dd <= last.getDate(); dd++) {
        const d = new Date(first.getFullYear(), first.getMonth(), dd); if (d > today) break; if (d.getDay() === 0) continue;
        const b = count(d); p += b.present; a += b.absent; l += b.leave; tot += b.total;
      }
      out.push({ label: first.toLocaleDateString('en-GB', { month: 'short' }), present: p, absent: a, leave: l, total: tot });
    }
  }
  return out;
};
export const periodRange = (period: Period): Date[] => {
  const today = new Date(); const n = period === 'day' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 365; const out: Date[] = [];
  for (let i = 0; i < n; i++) { const d = new Date(today); d.setDate(d.getDate() - i); if (d.getDay() !== 0 || period === 'day') out.push(d); }
  return out;
};
export const staffPeriodStats = (s: Staff, period: Period) => {
  let p = 0, a = 0, l = 0;
  periodRange(period).forEach((d) => { const st = staffStatus(s.id, d); if (st === 'P') p++; else if (st === 'A') a++; else if (st === 'L') l++; });
  return { present: p, absent: a, leave: l, percent: pct(p, p + a + l) };
};
export const checkIn = (id: string) => { const r = rng('ci-' + id + iso(new Date())); const m = 15 + Math.floor(r() * 40); return `08:${String(m).padStart(2, '0')} AM`; };

// ---------- timetable ----------
export interface Slot { key: string; label: string; start: string; end: string; kind: 'class' | 'break' }
export const SLOTS: Slot[] = [
  { key: 'P1', label: 'Period 1', start: '08:30 AM', end: '09:20 AM', kind: 'class' },
  { key: 'P2', label: 'Period 2', start: '09:20 AM', end: '10:10 AM', kind: 'class' },
  { key: 'B1', label: 'Tea Break', start: '10:10 AM', end: '10:30 AM', kind: 'break' },
  { key: 'P3', label: 'Period 3', start: '10:30 AM', end: '11:20 AM', kind: 'class' },
  { key: 'P4', label: 'Period 4', start: '11:20 AM', end: '12:10 PM', kind: 'class' },
  { key: 'B2', label: 'Lunch', start: '12:10 PM', end: '01:00 PM', kind: 'break' },
  { key: 'P5', label: 'Period 5', start: '01:00 PM', end: '01:50 PM', kind: 'class' },
  { key: 'P6', label: 'Period 6', start: '01:50 PM', end: '02:40 PM', kind: 'class' },
  { key: 'P7', label: 'Period 7', start: '02:40 PM', end: '03:30 PM', kind: 'class' },
];
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export interface Cell { subject: SubjectName; staffId: string; room: string }
let ttCache: Map<string, Cell[][]> | null = null; // sectionId -> [day][classPeriod]
export const getTimetables = () => {
  if (ttCache) return ttCache;
  ttCache = new Map();
  const busy = new Set<string>();
  const load = new Map<string, number>();
  const secs = allSections();
  secs.forEach((sec, si) => {
    const pool: SubjectName[] = [...sec.subjects, 'English', sec.std === 'LT' ? 'Physics' : (si % 2 ? 'Kannada' : 'Hindi')];
    const grid: Cell[][] = [];
    WEEKDAYS.forEach((_, d) => {
      const row: Cell[] = [];
      for (let p = 0; p < 7; p++) {
        let subject = pool[(p + d * 2 + si) % pool.length];
        let teacher: Staff | undefined;
        for (const sub of [pool[(p + d * 2 + si) % pool.length], ...pool]) {
          const t = getStaff().filter((s) => s.subject === sub && s.role !== 'Non-Teaching');
          const free = t.filter((x) => !busy.has(`${x.id}|${d}|${p}`)).sort((a, b) => (load.get(a.id) || 0) - (load.get(b.id) || 0))[0];
          if (free) { teacher = free; subject = sub; break; }
        }
        const t = teacher || getStaff().find((s) => s.role === 'Teacher')!;
        busy.add(`${t.id}|${d}|${p}`); load.set(t.id, (load.get(t.id) || 0) + 1);
        row.push({ subject, staffId: t.id, room: `Room ${100 + (si * 7 + p) % 30}` });
      }
      grid.push(row);
    });
    ttCache!.set(sec.id, grid);
  });
  return ttCache;
};
export const classSlots = SLOTS.filter((s) => s.kind === 'class');
export const staffWeekLoad = (staffId: string) => {
  const tt = getTimetables(); const grid: ({ sectionId: string } | null)[][] = WEEKDAYS.map(() => Array(7).fill(null));
  tt.forEach((g, sid) => g.forEach((row, d) => row.forEach((c, p) => { if (c.staffId === staffId) grid[d][p] = { sectionId: sid }; })));
  return grid;
};
