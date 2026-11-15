// Standard college calendar for 2026-27: state/national holidays, tests, exams and college events.
// Holiday dates follow the Karnataka government list; confirm each year's circular for any change.
export type CalType = 'HOLIDAY' | 'EXAM' | 'TEST' | 'EVENT' | 'MEETING';
export interface CalEvent { id: string; title: string; event_date: string; end_date?: string; event_type: CalType; description?: string; builtin?: boolean }

const H = (d: string, title: string, description = 'Government holiday', end?: string): [string, string | undefined, string, CalType, string] => [d, end, title, 'HOLIDAY', description];
const rows: [string, string | undefined, string, CalType, string][] = [
  // 2026 – reopening and first term
  ['2026-06-01', undefined, 'College reopens (2nd PUC)', 'EVENT', 'Classes begin for 2nd PUC and long-term batches'],
  ['2026-06-15', undefined, '1st PUC classes begin', 'EVENT', 'Orientation and induction for 1st PUC admissions'],
  H('2026-06-26', 'Muharram'),
  ['2026-07-04', undefined, 'Parent-teacher meeting (1st PUC)', 'MEETING', 'Admission-batch parents meet class teachers'],
  ['2026-07-20', '2026-07-24', 'Diagnostic test – NEET / JEE batches', 'TEST', 'Entry-level assessment for all batches'],
  ['2026-08-03', '2026-08-07', 'Unit Test 1', 'TEST', 'Physics, Chemistry, Mathematics / Biology – first unit test'],
  H('2026-08-15', 'Independence Day', 'National holiday · flag hoisting at 8:00 AM'),
  ['2026-08-26', undefined, 'Eid Milad', 'HOLIDAY', 'Government holiday'],
  ['2026-09-05', undefined, "Teachers' Day", 'EVENT', 'Celebration and student cultural programme'],
  H('2026-09-14', 'Ganesh Chaturthi'),
  ['2026-09-07', '2026-09-11', 'Monthly Test (September)', 'TEST', 'Chapter-wise test for all sections'],
  ['2026-09-28', '2026-10-09', 'Quarterly Examination', 'EXAM', '1st and 2nd PUC · full syllabus covered so far'],
  H('2026-10-02', 'Gandhi Jayanti', 'National holiday'),
  ['2026-10-03', undefined, 'Parent-teacher meeting (2nd PUC)', 'MEETING', 'Quarterly progress discussion'],
  ['2026-10-12', '2026-10-25', 'Dasara vacation', 'HOLIDAY', 'Classes resume on Monday 26 October (hostel closes 11 October)'],
  H('2026-10-20', 'Mahanavami / Vijayadashami', 'Government holiday during Dasara vacation'),
  H('2026-10-26', 'Maharshi Valmiki Jayanti'),
  H('2026-11-01', 'Kannada Rajyotsava', 'State holiday · flag hoisting and cultural programme'),
  H('2026-11-08', 'Deepavali (Naraka Chaturdashi)', 'Government holiday', '2026-11-10'),
  ['2026-11-14', undefined, "Children's Day", 'EVENT', 'Inter-class quiz and games'],
  H('2026-11-26', 'Kanakadasa Jayanti'),
  ['2026-11-23', '2026-11-27', 'Unit Test 2', 'TEST', 'Second unit test · portion announced by HODs'],
  ['2026-12-05', undefined, 'Parent-teacher meeting (all classes)', 'MEETING', 'Unit test 2 results and attendance review'],
  ['2026-12-07', '2026-12-18', 'Half-yearly Examination', 'EXAM', '1st and 2nd PUC · timetable on the Exam Management page'],
  ['2026-12-12', undefined, 'College Annual Day', 'EVENT', 'Prize distribution and cultural programme'],
  H('2026-12-25', 'Christmas', 'Government holiday'),
  ['2026-12-28', '2026-12-31', 'Winter break (hostel open)', 'HOLIDAY', 'Day scholars off; revision classes for 2nd PUC'],
  // 2027 – board preparation and exams
  H('2027-01-01', "New Year's Day"),
  ['2027-01-09', undefined, 'Sports Day', 'EVENT', 'Track and field, team games and prize distribution'],
  H('2027-01-15', 'Makara Sankranti'),
  ['2027-01-18', '2027-01-29', 'Preparatory Examination 1 (2nd PUC)', 'EXAM', 'Board-pattern full syllabus papers'],
  ['2027-01-22', '2027-01-31', 'JEE Main – Session 1', 'EXAM', 'National exam window; college holiday for JEE batch students'],
  H('2027-01-26', 'Republic Day', 'National holiday · flag hoisting at 8:00 AM'),
  ['2027-02-01', '2027-02-12', 'Practical examinations (2nd PUC)', 'EXAM', 'Physics, Chemistry, Biology and Computer Science labs'],
  ['2027-02-15', '2027-02-26', 'Preparatory Examination 2 (2nd PUC)', 'EXAM', 'Final board-pattern rehearsal'],
  ['2027-03-01', '2027-03-20', '2nd PUC Board Examination', 'EXAM', 'State board public examination (dates as per KSEAB timetable)'],
  ['2027-03-22', '2027-04-05', '1st PUC Annual Examination', 'EXAM', 'Annual exam for all 1st PUC sections'],
  ['2027-04-01', '2027-04-08', 'JEE Main – Session 2', 'EXAM', 'National exam window'],
  H('2027-04-14', 'Dr. B. R. Ambedkar Jayanti'),
  ['2027-04-15', '2027-04-16', 'KCET', 'EXAM', 'Karnataka Common Entrance Test'],
  ['2027-04-20', undefined, '2nd PUC results (expected)', 'EVENT', 'Results as announced by the PU Department'],
  H('2027-05-01', 'Labour Day'),
  ['2027-05-02', undefined, 'NEET (UG)', 'EXAM', 'National Eligibility cum Entrance Test'],
  ['2027-05-15', undefined, 'Admissions open for 2027-28', 'EVENT', 'Applications for 1st PUC and long-term batches'],
];

export const baseCalendar = (): CalEvent[] => rows.map(([d, end, title, type, description], i) => ({ id: `std-${i}`, event_date: d, end_date: end, title, event_type: type, description, builtin: true }));
