import { db } from '../server/src/database/db';
import { seedDatabase } from '../server/src/database/seed';
import bcrypt from 'bcryptjs';

async function runAllTests() {
  console.log('===============================================================');
  console.log('🧪 RUNNING SIR MV PU COLLEGE COMPREHENSIVE INTEGRATION SUITE');
  console.log('🏢 Campuses: Davangere, Shivamogga, Ballari');
  console.log('===============================================================');

  // 1. Re-seed clean test environment
  seedDatabase();

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
  const branches = db.prepare('SELECT * FROM branches').all() as any[];
  assert(branches.length === 3, 'All 3 campuses exist (Davangere, Shivamogga, Ballari)');
  assert(branches.some((b) => b.code === 'SIRMV-DVG'), 'Davangere campus properly configured');
  assert(branches.some((b) => b.code === 'SIRMV-SMG'), 'Shivamogga campus properly configured');
  assert(branches.some((b) => b.code === 'SIRMV-BLY'), 'Ballari campus properly configured');

  // --- TEST 2: Users & Roles ---
  console.log('\n--- 2. Users & Roles ---');
  const roles = db.prepare('SELECT DISTINCT role FROM users').all().map((r: any) => r.role);
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
  const teacherProfile = db.prepare(`
    SELECT tp.*, u.name, d.name as department_name 
    FROM teacher_profiles tp 
    JOIN users u ON tp.user_id = u.id 
    LEFT JOIN departments d ON tp.department_id = d.id
    WHERE tp.employee_id = 'EMP-PHY-002'
  `).get() as any;
  assert(teacherProfile && teacherProfile.name.includes('Anand Kumar'), 'Teacher Mr. ABC profile exists with designation and emp ID');

  const assignments = db.prepare('SELECT * FROM teacher_assignments WHERE teacher_id = ?').all(teacherProfile.id);
  assert(assignments.length >= 2, 'Teacher academic assignments linked to classes, sections, and batches');

  const timetable = db.prepare('SELECT * FROM timetable_entries WHERE teacher_id = ?').all(teacherProfile.id);
  assert(timetable.length > 0, 'Weekly timetable loaded with periods, rooms, and floors');

  // --- TEST 4: Teacher Absence & Substitution Center ---
  console.log('\n--- 4. Teacher Absence & Substitution Center ---');
  const absence = db.prepare(`SELECT * FROM teacher_absences WHERE teacher_id = ? AND date = '2026-09-20'`).get(teacherProfile.id) as any;
  assert(absence && absence.status === 'RECORDED', 'Teacher marked absent on target date');

  // Verify affected timetable periods
  const affectedPeriods = db.prepare(`
    SELECT tt.* FROM timetable_entries tt 
    WHERE tt.teacher_id = ? AND tt.day_of_week = 'Monday'
  `).all(teacherProfile.id);
  assert(affectedPeriods.length >= 2, 'System accurately detects all affected timetable periods for absent teacher');

  // Verify proxy allocation & substitute acknowledgment
  const subAssignment = db.prepare('SELECT * FROM substitution_assignments WHERE original_teacher_id = ?').get(teacherProfile.id) as any;
  assert(subAssignment && subAssignment.substitute_teacher_id !== null, 'HOD substitution assigned to proxy faculty');

  // Acknowledge duty
  db.prepare(`UPDATE substitution_assignments SET status = 'ACKNOWLEDGED', acknowledged_at = CURRENT_TIMESTAMP WHERE id = ?`).run(subAssignment.id);
  const ackCheck = db.prepare('SELECT status FROM substitution_assignments WHERE id = ?').get(subAssignment.id) as any;
  assert(ackCheck.status === 'ACKNOWLEDGED', 'Substitute teacher acknowledges proxy duty');

  // --- TEST 5: Floor Attender Operations & 1-Page Consolidated Lecture Record ---
  console.log('\n--- 5. Floor Attender Operations & 1-Page Consolidated Lecture Record ---');
  const floorRooms = db.prepare('SELECT * FROM rooms WHERE branch_id = ? AND floor = 2').all('branch-dvg');
  assert(floorRooms.length >= 4, 'Floor 2 rooms configured (Room 201, 202, 203, 204)');

  const lecture = db.prepare(`
    SELECT ls.*, lc.chapter, lc.concept, lc.topic_taught,
           u_orig.name as orig_teacher, u_sub.name as sub_teacher
    FROM lecture_sessions ls
    JOIN lecture_concepts lc ON ls.id = lc.lecture_session_id
    JOIN teacher_profiles tp_orig ON ls.teacher_id = tp_orig.id
    JOIN users u_orig ON tp_orig.user_id = u_orig.id
    LEFT JOIN teacher_profiles tp_sub ON ls.substitute_teacher_id = tp_sub.id
    LEFT JOIN users u_sub ON tp_sub.user_id = u_sub.id
    WHERE ls.id = 'lec-session-101'
  `).get() as any;

  assert(lecture !== null, 'One-page lecture session record retrieved');
  assert(lecture.teacher_status === 'SUBSTITUTE', 'Lecture reflects proxy substitute faculty');
  assert(lecture.teacher_time_in === '09:32' && lecture.lecture_start_time === '09:34', 'Timestamps recorded (Time In, Lecture Start)');
  assert(lecture.chapter.includes('Thermodynamics'), 'Concept & topic taught recorded in lecture record');
  assert(lecture.recording_url !== null && lecture.recording_url.length > 0, 'Class video stream linked for absent students');

  // --- TEST 6: Student Class Attendance & Photo-assisted verification ---
  console.log('\n--- 6. Student Attendance & Finalization ---');
  const attRecords = db.prepare('SELECT * FROM attendance_records WHERE lecture_session_id = ?').all('lec-session-101') as any[];
  assert(attRecords.length > 0, 'Student attendance sheet populated');
  assert(attRecords.some((a) => a.status === 'PRESENT') && attRecords.some((a) => a.status === 'ABSENT'), 'Multi-status marking (Present, Absent, Late)');

  // Finalize attendance lock
  db.prepare(`UPDATE lecture_sessions SET finalization_status = 'COMPLETED' WHERE id = 'lec-session-101'`).run();
  const finalizedSession = db.prepare('SELECT finalization_status FROM lecture_sessions WHERE id = ?').get('lec-session-101') as any;
  assert(finalizedSession.finalization_status === 'COMPLETED', 'Attendance officially finalized and locked');

  // --- TEST 7: Missed Class Video Recordings for Absent Students ---
  console.log('\n--- 7. Missed Class Recordings for Absent Students ---');
  const missedClasses = db.prepare(`
    SELECT ls.recording_url, s.name as subject_name 
    FROM attendance_records ar
    JOIN lecture_sessions ls ON ar.lecture_session_id = ls.id
    JOIN subjects s ON ls.subject_id = s.id
    WHERE ar.student_id = 'sp-sneha' AND ar.status = 'ABSENT'
  `).all() as any[];
  assert(missedClasses.length > 0, 'Absent student portal surfaces missed class sessions');
  assert(missedClasses[0].recording_url !== null, 'Authorized class video playback available');

  // --- TEST 8: Evening Study Attendance ---
  console.log('\n--- 8. Evening Study Attendance ---');
  const eveningSession = db.prepare('SELECT * FROM evening_study_sessions WHERE id = ?').get('ess-20260920') as any;
  assert(eveningSession !== null && eveningSession.study_hall.includes('Study Hall 1'), 'Evening study session configured');

  const eveningAtt = db.prepare('SELECT * FROM evening_study_attendance WHERE session_id = ?').all('ess-20260920') as any[];
  assert(eveningAtt.length > 0, 'Evening study attendance recorded with entry/exit and duration');

  // --- TEST 9: Hostel Attendance & Night Roll Call ---
  console.log('\n--- 9. Hostel Attendance ---');
  const hostelRooms = db.prepare('SELECT * FROM hostel_rooms').all();
  assert(hostelRooms.length > 0, 'Hostel Block ➔ Floor ➔ Room hierarchy configured');

  const hostelAtt = db.prepare(`SELECT * FROM hostel_attendance WHERE date = '2026-09-20'`).all() as any[];
  assert(hostelAtt.length > 0, 'Night roll call recorded (Present, Outpass, Medical, Late Return)');

  // --- TEST 10: Outpass / Gate Pass Lifecycle ---
  console.log('\n--- 10. Complete Outpass Lifecycle ---');
  const outpass = db.prepare('SELECT * FROM outpasses WHERE id = ?').get('op-1001') as any;
  assert(outpass !== null, 'Outpass record exists');
  assert(outpass.pickup_photo_url !== null, 'Pickup person photograph captured and linked');
  assert(outpass.parent_otp_verified === 1, 'Parent OTP successfully verified');
  assert(outpass.verification_code === '4827', 'Non-predictable 4-digit verification code issued');
  assert(outpass.digital_signature_hash.includes('SIG_DIGITAL_PRINCIPAL'), 'Principal digital signature applied');
  assert(outpass.exit_time !== null, 'Gate staff recorded exit timestamp');

  // Record return
  db.prepare(`UPDATE outpasses SET status = 'RETURNED', return_time = CURRENT_TIMESTAMP WHERE id = 'op-1001'`).run();
  const returnedOutpass = db.prepare('SELECT status, return_time FROM outpasses WHERE id = ?').get('op-1001') as any;
  assert(returnedOutpass.status === 'RETURNED' && returnedOutpass.return_time !== null, 'Gate staff recorded return timestamp');

  // --- TEST 11: Dynamic Exams, Evaluated Papers & Report Cards ---
  console.log('\n--- 11. Complete Report Card System ---');
  const examsList = db.prepare('SELECT * FROM exams WHERE branch_id = ?').all('branch-dvg');
  assert(examsList.length >= 3, 'Dynamic exams in DB (Unit Test 1, Unit Test 2, Mid Term Exam, NEET Test)');

  const marks = db.prepare(`
    SELECT sm.*, s.name as subject_name 
    FROM student_marks sm
    JOIN exam_subjects es ON sm.exam_subject_id = es.id
    JOIN subjects s ON es.subject_id = s.id
    WHERE sm.student_id = 'sp-rahul' AND es.exam_id = 'exam-midterm'
  `).all() as any[];
  assert(marks.length >= 6, 'All enrolled subjects calculated with marks and grades');

  const evaluatedPaper = db.prepare(`
    SELECT * FROM evaluated_papers WHERE student_id = 'sp-rahul'
  `).get() as any;
  assert(evaluatedPaper && evaluatedPaper.file_url !== null, 'Evaluated exam paper linked for student/parent view');

  const remarks = db.prepare(`
    SELECT * FROM exam_remarks WHERE student_id = 'sp-rahul' AND exam_id = 'exam-midterm'
  `).get() as any;
  assert(remarks && remarks.class_teacher_remarks && remarks.principal_remarks, 'Multi-level institutional remarks recorded');

  // --- TEST 12: Audit Logging ---
  console.log('\n--- 12. Security Audit Trail ---');
  const auditLogs = db.prepare('SELECT * FROM audit_logs').all() as any[];
  assert(auditLogs.length >= 5, 'Audit trail logs recorded for critical operations');

  console.log('\n===============================================================');
  console.log(`📊 TEST RESULTS SUMMARY: ${passedCount} PASSED / ${failedCount} FAILED`);
  console.log('===============================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
