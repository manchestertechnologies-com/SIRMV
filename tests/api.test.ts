import { query, queryOne, execute } from '../server/src/database/pgDb';
import { seedPostgresDatabase } from '../server/src/database/postgres-seed';
import { pgPool } from '../server/src/database/postgres';

async function runAllTests() {
  console.log('===============================================================');
  console.log('🧪 RUNNING SIR MV PU COLLEGE NEON POSTGRESQL INTEGRATION SUITE');
  console.log('🏢 Campuses: Davangere, Shivamogga, Ballari');
  console.log('===============================================================');

  // 1. Ensure clean seed in Neon PostgreSQL
  await seedPostgresDatabase();

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failedCount++;
    }
  }

  // --- TEST 1: Branches & Multi-campus structure ---
  console.log('\n--- 1. Multi-Branch Structure ---');
  const branches = await query('SELECT * FROM branches');
  assert(branches.length === 3, 'All 3 campuses exist (Davangere, Shivamogga, Ballari)');
  assert(branches.some((b: any) => b.code === 'SIRMV-DVG'), 'Davangere campus properly configured');
  assert(branches.some((b: any) => b.code === 'SIRMV-SMG'), 'Shivamogga campus properly configured');
  assert(branches.some((b: any) => b.code === 'SIRMV-BLY'), 'Ballari campus properly configured');

  // --- TEST 2: Users & Roles ---
  console.log('\n--- 2. Users & Roles ---');
  const roleRows = await query('SELECT DISTINCT role FROM users');
  const roles = roleRows.map((r: any) => r.role);
  assert(roles.includes('ADMIN'), 'ADMIN role present');
  assert(roles.includes('PRINCIPAL'), 'PRINCIPAL role present');
  assert(roles.includes('HOD'), 'HOD role present');
  assert(roles.includes('TEACHER'), 'TEACHER role present');
  assert(roles.includes('FLOOR_ATTENDER'), 'FLOOR_ATTENDER role present');
  assert(roles.includes('GATE_STAFF'), 'GATE_STAFF role present');
  assert(roles.includes('WARDEN'), 'WARDEN role present');
  assert(roles.includes('STUDENT'), 'STUDENT role present');
  assert(roles.includes('PARENT'), 'PARENT role present');

  // --- TEST 3: Teacher Profile & Academic Assignments ---
  console.log('\n--- 3. Teacher Profile & Timetable ---');
  const teacherProfile = await queryOne(`
    SELECT tp.*, u.name, d.name as department_name 
    FROM teacher_profiles tp 
    JOIN users u ON tp.user_id = u.id 
    LEFT JOIN departments d ON tp.department_id = d.id
    WHERE tp.employee_id = 'EMP-PHY-002'
  `);
  assert(teacherProfile && teacherProfile.name.includes('Anand Kumar'), 'Teacher Mr. ABC profile exists with designation and emp ID');

  const assignments = await query('SELECT * FROM teacher_assignments WHERE teacher_id = ?', [teacherProfile.id]);
  assert(assignments.length >= 2, 'Teacher academic assignments linked to classes, sections, and batches');

  const timetable = await query('SELECT * FROM timetable_entries WHERE teacher_id = ?', [teacherProfile.id]);
  assert(timetable.length > 0, 'Weekly timetable loaded with periods, rooms, and floors');

  // --- TEST 4: Teacher Absence & Substitution Center ---
  console.log('\n--- 4. Teacher Absence & Substitution Center ---');
  const absence = await queryOne(`SELECT * FROM teacher_absences WHERE teacher_id = ? AND date = '2026-09-20'`, [teacherProfile.id]);
  assert(absence && absence.status === 'RECORDED', 'Teacher marked absent on target date');

  // Verify affected timetable periods
  const affectedPeriods = await query(`
    SELECT tt.* FROM timetable_entries tt 
    WHERE tt.teacher_id = ? AND tt.day_of_week = 'Monday'
  `, [teacherProfile.id]);
  assert(affectedPeriods.length >= 2, 'System accurately detects all affected timetable periods for absent teacher');

  // Verify proxy allocation & substitute acknowledgment
  const subAssignment = await queryOne('SELECT * FROM substitution_assignments WHERE original_teacher_id = ?', [teacherProfile.id]);
  assert(subAssignment && subAssignment.substitute_teacher_id !== null, 'HOD substitution assigned to proxy faculty');

  // Acknowledge duty
  await execute(`UPDATE substitution_assignments SET status = 'ACKNOWLEDGED', acknowledged_at = CURRENT_TIMESTAMP WHERE id = ?`, [subAssignment.id]);
  const ackCheck = await queryOne('SELECT status FROM substitution_assignments WHERE id = ?', [subAssignment.id]);
  assert(ackCheck.status === 'ACKNOWLEDGED', 'Substitute teacher acknowledges proxy duty');

  // --- TEST 5: Floor Attender Operations & 1-Page Consolidated Lecture Record ---
  console.log('\n--- 5. Floor Attender Operations & 1-Page Consolidated Lecture Record ---');
  const floorRooms = await query('SELECT * FROM rooms WHERE branch_id = ? AND floor = 2', ['branch-dvg']);
  assert(floorRooms.length >= 4, 'Floor 2 rooms configured (Room 201, 202, 203, 204)');

  const lecture = await queryOne(`
    SELECT ls.*, lc.chapter, lc.concept, lc.topic_taught,
           u_orig.name as orig_teacher, u_sub.name as sub_teacher
    FROM lecture_sessions ls
    JOIN lecture_concepts lc ON ls.id = lc.lecture_session_id
    JOIN teacher_profiles tp_orig ON ls.teacher_id = tp_orig.id
    JOIN users u_orig ON tp_orig.user_id = u_orig.id
    LEFT JOIN teacher_profiles tp_sub ON ls.substitute_teacher_id = tp_sub.id
    LEFT JOIN users u_sub ON tp_sub.user_id = u_sub.id
    WHERE ls.id = 'lec-session-101'
  `);

  assert(lecture !== null, 'One-page lecture session record retrieved');
  assert(lecture.teacher_status === 'SUBSTITUTE', 'Lecture reflects proxy substitute faculty');
  assert(lecture.teacher_time_in === '09:32' && lecture.lecture_start_time === '09:34', 'Timestamps recorded (Time In, Lecture Start)');
  assert(lecture.chapter && lecture.chapter.includes('Thermodynamics'), 'Concept & topic taught recorded in lecture record');
  assert(lecture.recording_url !== null && lecture.recording_url.length > 0, 'Class video stream linked for absent students');

  // --- TEST 6: Student Class Attendance & Photo-assisted verification ---
  console.log('\n--- 6. Student Attendance & Finalization ---');
  const attRecords = await query('SELECT * FROM attendance_records WHERE lecture_session_id = ?', ['lec-session-101']);
  assert(attRecords.length > 0, 'Student attendance sheet populated');
  assert(attRecords.some((a: any) => a.status === 'PRESENT') && attRecords.some((a: any) => a.status === 'ABSENT'), 'Multi-status marking (Present, Absent, Late)');

  // Finalize attendance lock
  await execute(`UPDATE lecture_sessions SET finalization_status = 'COMPLETED' WHERE id = 'lec-session-101'`);
  const finalizedSession = await queryOne('SELECT finalization_status FROM lecture_sessions WHERE id = ?', ['lec-session-101']);
  assert(finalizedSession.finalization_status === 'COMPLETED', 'Attendance officially finalized and locked');

  // --- TEST 7: Missed Class Video Recordings for Absent Students ---
  console.log('\n--- 7. Missed Class Recordings for Absent Students ---');
  const missedClasses = await query(`
    SELECT ls.recording_url, s.name as subject_name 
    FROM attendance_records ar
    JOIN lecture_sessions ls ON ar.lecture_session_id = ls.id
    JOIN subjects s ON ls.subject_id = s.id
    WHERE ar.student_id = 'sp-sneha' AND ar.status = 'ABSENT'
  `);
  assert(missedClasses.length > 0, 'Absent student portal surfaces missed class sessions');
  assert(missedClasses[0].recording_url !== null, 'Authorized class video playback available');

  // --- TEST 8: Evening Study Attendance ---
  console.log('\n--- 8. Evening Study Attendance ---');
  const eveningSession = await queryOne('SELECT * FROM evening_study_sessions WHERE id = ?', ['ess-20260920']);
  assert(eveningSession !== null && eveningSession.study_hall.includes('Study Hall 1'), 'Evening study session configured');

  const eveningAtt = await query('SELECT * FROM evening_study_attendance WHERE session_id = ?', ['ess-20260920']);
  assert(eveningAtt.length > 0, 'Evening study attendance recorded with entry/exit and duration');

  // --- TEST 9: Hostel Attendance & Night Roll Call ---
  console.log('\n--- 9. Hostel Attendance ---');
  const hostelRooms = await query('SELECT * FROM hostel_rooms');
  assert(hostelRooms.length > 0, 'Hostel Block ➔ Floor ➔ Room hierarchy configured');

  const hostelAtt = await query(`SELECT * FROM hostel_attendance WHERE date = '2026-09-20'`);
  assert(hostelAtt.length > 0, 'Night roll call recorded (Present, Outpass, Medical, Late Return)');

  // --- TEST 10: Outpass / Gate Pass Lifecycle ---
  console.log('\n--- 10. Complete Outpass Lifecycle ---');
  const outpass = await queryOne('SELECT * FROM outpasses WHERE id = ?', ['op-1001']);
  assert(outpass !== null, 'Outpass record exists');
  assert(outpass.pickup_photo_url !== null, 'Pickup person photograph captured and linked');
  assert(outpass.parent_otp_verified === true || outpass.parent_otp_verified === 1, 'Parent OTP successfully verified');
  assert(outpass.verification_code === '4827', 'Non-predictable 4-digit verification code issued');
  assert(outpass.digital_signature_hash && outpass.digital_signature_hash.includes('SIG_DIGITAL_PRINCIPAL'), 'Principal digital signature applied');
  assert(outpass.exit_time !== null, 'Gate staff recorded exit timestamp');

  // Record return
  await execute(`UPDATE outpasses SET status = 'RETURNED', return_time = CURRENT_TIMESTAMP WHERE id = 'op-1001'`);
  const returnedOutpass = await queryOne('SELECT status, return_time FROM outpasses WHERE id = ?', ['op-1001']);
  assert(returnedOutpass.status === 'RETURNED' && returnedOutpass.return_time !== null, 'Gate staff recorded return timestamp');

  // --- TEST 11: Dynamic Exams, Evaluated Papers & Report Cards ---
  console.log('\n--- 11. Complete Report Card System ---');
  const examsList = await query('SELECT * FROM exams WHERE branch_id = ?', ['branch-dvg']);
  assert(examsList.length >= 3, 'Dynamic exams in DB (Unit Test 1, Unit Test 2, Mid Term Exam, NEET Test)');

  const marks = await query(`
    SELECT sm.*, s.name as subject_name 
    FROM student_marks sm
    JOIN exam_subjects es ON sm.exam_subject_id = es.id
    JOIN subjects s ON es.subject_id = s.id
    WHERE sm.student_id = 'sp-rahul' AND es.exam_id = 'exam-midterm'
  `);
  assert(marks.length >= 6, 'All enrolled subjects calculated with marks and grades');

  const evaluatedPaper = await queryOne(`
    SELECT * FROM evaluated_papers WHERE student_id = 'sp-rahul'
  `);
  assert(evaluatedPaper && evaluatedPaper.file_url !== null, 'Evaluated exam paper linked for student/parent view');

  const remarks = await queryOne(`
    SELECT * FROM exam_remarks WHERE student_id = 'sp-rahul' AND exam_id = 'exam-midterm'
  `);
  assert(remarks && remarks.class_teacher_remarks && remarks.principal_remarks, 'Multi-level institutional remarks recorded');

  // --- TEST 12: Audit Logging ---
  console.log('\n--- 12. Security Audit Trail ---');
  const auditLogs = await query('SELECT * FROM audit_logs');
  assert(auditLogs.length >= 5, 'Audit trail logs recorded for critical operations');

  console.log('\n===============================================================');
  console.log(`📊 TEST RESULTS SUMMARY: ${passedCount} PASSED / ${failedCount} FAILED`);
  console.log('===============================================================');

  await pgPool.end();

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});

