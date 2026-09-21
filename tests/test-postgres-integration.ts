import { pgPool } from '../server/src/database/postgres';

interface TestCaseResult {
  tableName: string;
  queryDescription: string;
  rowsFound: number;
  sampleDataPreview: string;
  passed: boolean;
  error?: string;
}

async function runPgReadOnlyIntegrationTests() {
  console.log('===============================================================');
  console.log('🧪 RUNNING POSTGRESQL READ-ONLY INTEGRATION TEST SUITE (NEON)');
  console.log('===============================================================');

  const results: TestCaseResult[] = [];

  const runTest = async (
    tableName: string,
    queryDescription: string,
    queryText: string,
    params: any[] = [],
    validationFn: (rows: any[]) => boolean
  ) => {
    try {
      const res = await pgPool.query(queryText, params);
      const passed = validationFn(res.rows);
      const sample = res.rows.length > 0 ? JSON.stringify(res.rows[0]) : '[]';

      results.push({
        tableName,
        queryDescription,
        rowsFound: res.rows.length,
        sampleDataPreview: sample.length > 120 ? sample.substring(0, 117) + '...' : sample,
        passed
      });
    } catch (err: any) {
      results.push({
        tableName,
        queryDescription,
        rowsFound: 0,
        sampleDataPreview: 'N/A',
        passed: false,
        error: err.message
      });
    }
  };

  // 1. Branches Test
  await runTest(
    'branches',
    'Fetch all registered campuses (Davangere, Shivamogga, Ballari)',
    'SELECT id, name, code, city, principal_name FROM branches ORDER BY id ASC',
    [],
    (rows) => rows.length === 3 && rows.some(r => r.city === 'Davangere')
  );

  // 2. Users Test
  await runTest(
    'users',
    'Fetch system users with roles (Admin, Principal, Teachers, Students)',
    'SELECT id, username, role, name, email FROM users ORDER BY id ASC',
    [],
    (rows) => rows.length >= 26 && rows.some(r => r.role === 'PRINCIPAL')
  );

  // 3. Teacher Profiles & Department JOIN Test
  await runTest(
    'teacher_profiles',
    'JOIN teacher_profiles with users and departments to fetch faculty designations',
    `SELECT tp.id, tp.employee_id, tp.designation, u.name as teacher_name, d.name as department_name
     FROM teacher_profiles tp
     JOIN users u ON tp.user_id = u.id
     JOIN departments d ON tp.department_id = d.id
     ORDER BY tp.employee_id ASC`,
    [],
    (rows) => rows.length === 6 && rows.some(r => r.designation.includes('Physics'))
  );

  // 4. Student Profiles with Class, Section & Batch JOIN Test
  await runTest(
    'student_profiles',
    'JOIN student_profiles with classes, sections, and batches',
    `SELECT sp.id, sp.register_number, sp.name as student_name, c.name as class_name, s.name as section_name, b.name as batch_name, sp.parent_name
     FROM student_profiles sp
     JOIN classes c ON sp.class_id = c.id
     JOIN sections s ON sp.section_id = s.id
     JOIN batches b ON sp.batch_id = b.id
     ORDER BY sp.register_number ASC`,
    [],
    (rows) => rows.length === 8 && rows.some(r => r.register_number === '2026PUC001')
  );

  // 5. Timetable Entries with Subjects, Teachers, and Rooms Multi-JOIN Test
  await runTest(
    'timetable_entries',
    'Multi-JOIN timetable_entries with subjects, teacher_profiles, users, and rooms',
    `SELECT tt.id, tt.day_of_week, tt.period_number, tt.start_time, tt.end_time,
            sub.name as subject_name, u.name as teacher_name, r.room_number, r.floor
     FROM timetable_entries tt
     JOIN subjects sub ON tt.subject_id = sub.id
     JOIN teacher_profiles tp ON tt.teacher_id = tp.id
     JOIN users u ON tp.user_id = u.id
     JOIN rooms r ON tt.room_id = r.id
     WHERE tt.day_of_week = 'Monday'
     ORDER BY tt.period_number ASC`,
    [],
    (rows) => rows.length === 7 && rows.some(r => r.period_number === 1)
  );

  // 6. Attendance Records with Lecture Sessions JOIN Test
  await runTest(
    'attendance_records',
    'JOIN attendance_records with lecture_sessions, subjects, and student_profiles',
    `SELECT ar.id, ar.status, ar.detection_confidence, ar.match_status,
            sp.name as student_name, ls.date, sub.name as subject_name
     FROM attendance_records ar
     JOIN lecture_sessions ls ON ar.lecture_session_id = ls.id
     JOIN student_profiles sp ON ar.student_id = sp.id
     JOIN subjects sub ON ls.subject_id = sub.id
     WHERE ls.id = 'lec-session-101'
     ORDER BY sp.name ASC`,
    [],
    (rows) => rows.length === 8 && rows.some(r => r.status === 'PRESENT') && rows.some(r => r.status === 'ABSENT')
  );

  // 7. Exams & Exam Subjects JOIN Test
  await runTest(
    'exams',
    'JOIN exams with exam_subjects and classes',
    `SELECT e.id as exam_id, e.name as exam_name, e.exam_type, es.max_marks, es.passing_marks, sub.name as subject_name
     FROM exams e
     JOIN exam_subjects es ON e.id = es.exam_id
     JOIN subjects sub ON es.subject_id = sub.id
     WHERE e.id = 'exam-midterm'
     ORDER BY sub.name ASC`,
    [],
    (rows) => rows.length === 6 && rows.some(r => r.subject_name === 'Physics')
  );

  // 8. Student Marks with Exam Subjects & Student Profiles JOIN Test
  await runTest(
    'student_marks',
    'JOIN student_marks with student_profiles, exam_subjects, and subjects',
    `SELECT sm.id, sm.marks_obtained, sm.grade, sm.rank_in_class,
            sp.name as student_name, sub.name as subject_name, es.max_marks
     FROM student_marks sm
     JOIN student_profiles sp ON sm.student_id = sp.id
     JOIN exam_subjects es ON sm.exam_subject_id = es.id
     JOIN subjects sub ON es.subject_id = sub.id
     WHERE sp.id = 'sp-rahul'
     ORDER BY sub.name ASC`,
    [],
    (rows) => rows.length === 6 && rows.some(r => r.marks_obtained === 94)
  );

  // 9. Outpasses with Student Profiles & Approver Users JOIN Test
  await runTest(
    'outpasses',
    'JOIN outpasses with student_profiles, branches, and approver users',
    `SELECT op.outpass_number, op.reason, op.pickup_person_name, op.relationship,
            op.status, op.verification_code, sp.name as student_name, b.city as branch_city,
            u.name as approver_name
     FROM outpasses op
     JOIN student_profiles sp ON op.student_id = sp.id
     JOIN branches b ON op.branch_id = b.id
     LEFT JOIN users u ON op.approved_by = u.id
     ORDER BY op.outpass_number ASC`,
    [],
    (rows) => rows.length === 3 && rows.some(r => r.verification_code === '4827')
  );

  // Print Detailed Report
  console.log('\n📊 READ-ONLY INTEGRATION RESULTS:');
  console.log('-------------------------------------------------------------------------------------------------------');
  console.log('Target Table         | Rows | Status | Query Description');
  console.log('-------------------------------------------------------------------------------------------------------');

  let allPassed = true;
  for (const r of results) {
    const tbl = r.tableName.padEnd(20, ' ');
    const count = r.rowsFound.toString().padStart(4, ' ');
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${tbl} | ${count} | ${status} | ${r.queryDescription}`);
    if (!r.passed) {
      allPassed = false;
      if (r.error) console.log(`   └── Error: ${r.error}`);
    }
  }

  console.log('-------------------------------------------------------------------------------------------------------');
  console.log(`\n🛡️ Safety Check: 100% Read-Only (0 Mutations/DDL executed)`);
  console.log(`🎉 Final Result: ${results.filter(r => r.passed).length} / ${results.length} Tests Passed successfully!`);

  await pgPool.end();
  process.exit(allPassed ? 0 : 1);
}

runPgReadOnlyIntegrationTests();
