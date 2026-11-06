import { db, initDatabase } from './db';
import bcrypt from 'bcryptjs';

export function seedDatabase() {
  console.log('Seeding SIR MV PU College database...');
  initDatabase();

  const passwordHash = bcrypt.hashSync('password123', 10);

  // 1. Branches
  const insertBranch = db.prepare(`
    INSERT OR REPLACE INTO branches (id, name, code, city, address, phone, email, principal_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBranch.run('branch-dvg', 'SIR MV PU College - Davangere', 'SIRMV-DVG', 'Davangere', 'MCC ' + 'B Block, Kuvempu Road, Davangere, Karnataka 577004', '08192-234567', 'info.dvg@sirmv.edu.in', 'Dr. B. N. Vishwanath');
  insertBranch.run('branch-smg', 'SIR MV PU College - Shivamogga', 'SIRMV-SMG', 'Shivamogga', 'Jail Road, Tilak Nagar, Shivamogga, Karnataka 577201', '08182-278901', 'info.smg@sirmv.edu.in', 'Prof. K. R. Suresh');
  insertBranch.run('branch-bly', 'SIR MV PU College - Ballari', 'SIRMV-BLY', 'Ballari', 'Cantonment Area, Infotech Campus, Ballari, Karnataka 583104', '08392-256789', 'info.bly@sirmv.edu.in', 'Dr. H. M. Manjunath');

  // 2. Academic Years
  db.prepare(`INSERT OR REPLACE INTO academic_years (id, name, is_current) VALUES (?, ?, ?)`).run('ay-2026-27', '2026-27', 1);

  // 3. Classes, Sections, Batches for Davangere (and replicated for SMG & BLY)
  const branches = ['branch-dvg', 'branch-smg', 'branch-bly'];
  
  for (const bId of branches) {
    const p1 = `cls-1puc-${bId}`;
    const p2 = `cls-2puc-${bId}`;
    db.prepare(`INSERT OR REPLACE INTO classes (id, branch_id, name) VALUES (?, ?, ?)`).run(p1, bId, '1 PUC');
    db.prepare(`INSERT OR REPLACE INTO classes (id, branch_id, name) VALUES (?, ?, ?)`).run(p2, bId, '2 PUC');

    for (const [clsId, clsName] of [[p1, '1PUC'], [p2, '2PUC']]) {
      db.prepare(`INSERT OR REPLACE INTO sections (id, class_id, name) VALUES (?, ?, ?)`).run(`sec-${clsName}-A-${bId}`, clsId, 'A');
      db.prepare(`INSERT OR REPLACE INTO sections (id, class_id, name) VALUES (?, ?, ?)`).run(`sec-${clsName}-B-${bId}`, clsId, 'B');
      db.prepare(`INSERT OR REPLACE INTO sections (id, class_id, name) VALUES (?, ?, ?)`).run(`sec-${clsName}-C-${bId}`, clsId, 'C');
    }

    db.prepare(`INSERT OR REPLACE INTO batches (id, branch_id, name, code) VALUES (?, ?, ?, ?)`).run(`batch-neet-${bId}`, bId, 'NEET Batch', 'NEET');
    db.prepare(`INSERT OR REPLACE INTO batches (id, branch_id, name, code) VALUES (?, ?, ?, ?)`).run(`batch-jee-${bId}`, bId, 'JEE Batch', 'JEE');
    db.prepare(`INSERT OR REPLACE INTO batches (id, branch_id, name, code) VALUES (?, ?, ?, ?)`).run(`batch-kcet-${bId}`, bId, 'KCET Batch', 'KCET');
    db.prepare(`INSERT OR REPLACE INTO batches (id, branch_id, name, code) VALUES (?, ?, ?, ?)`).run(`batch-reg-${bId}`, bId, 'Regular PU', 'REGULAR');

    // Departments & Subjects
    const depts = [
      { id: `dept-phy-${bId}`, name: 'Physics Department', code: 'PHY', subName: 'Physics', subCode: 'PHY101' },
      { id: `dept-chem-${bId}`, name: 'Chemistry Department', code: 'CHEM', subName: 'Chemistry', subCode: 'CHE101' },
      { id: `dept-math-${bId}`, name: 'Mathematics Department', code: 'MATH', subName: 'Mathematics', subCode: 'MAT101' },
      { id: `dept-bio-${bId}`, name: 'Biology Department', code: 'BIO', subName: 'Biology', subCode: 'BIO101' },
      { id: `dept-cs-${bId}`, name: 'Computer Science Department', code: 'CS', subName: 'Computer Science', subCode: 'CS101' },
      { id: `dept-eng-${bId}`, name: 'English Department', code: 'ENG', subName: 'English', subCode: 'ENG101' },
      { id: `dept-kan-${bId}`, name: 'Kannada Department', code: 'KAN', subName: 'Kannada', subCode: 'KAN101' }
    ];

    for (const d of depts) {
      db.prepare(`INSERT OR REPLACE INTO departments (id, branch_id, name, code) VALUES (?, ?, ?, ?)`).run(d.id, bId, d.name, d.code);
      db.prepare(`INSERT OR REPLACE INTO subjects (id, department_id, name, code) VALUES (?, ?, ?, ?)`).run(`sub-${d.code.toLowerCase()}-${bId}`, d.id, d.subName, d.subCode);
    }

    // Rooms (Floor 1, 2, 3)
    const rooms = [
      { id: `rm-101-${bId}`, num: '101', floor: 1 },
      { id: `rm-102-${bId}`, num: '102', floor: 1 },
      { id: `rm-201-${bId}`, num: '201', floor: 2 },
      { id: `rm-202-${bId}`, num: '202', floor: 2 },
      { id: `rm-203-${bId}`, num: '203', floor: 2 },
      { id: `rm-204-${bId}`, num: '204', floor: 2 },
      { id: `rm-301-${bId}`, num: '301', floor: 3 },
      { id: `rm-302-${bId}`, num: '302', floor: 3 }
    ];
    for (const r of rooms) {
      db.prepare(`INSERT OR REPLACE INTO rooms (id, branch_id, room_number, floor) VALUES (?, ?, ?, ?)`).run(r.id, bId, r.num, r.floor);
    }
  }

  // 4. Seed Core Users
  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO users (id, branch_id, username, password_hash, role, name, email, phone, avatar_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Admin & Principals
  insertUser.run('usr-admin', 'branch-dvg', 'admin', passwordHash, 'ADMIN', 'System Administrator', 'admin@sirmv.edu.in', '9880011223', '/avatars/admin.png');
  insertUser.run('usr-prin-dvg', 'branch-dvg', 'principal_dvg', passwordHash, 'PRINCIPAL', 'Dr. B. N. Vishwanath (Principal)', 'principal.dvg@sirmv.edu.in', '9845011222', '/avatars/principal.png');
  insertUser.run('usr-prin-smg', 'branch-smg', 'principal_smg', passwordHash, 'PRINCIPAL', 'Prof. K. R. Suresh (Principal)', 'principal.smg@sirmv.edu.in', '9845022333', '/avatars/principal.png');
  insertUser.run('usr-prin-bly', 'branch-bly', 'principal_bly', passwordHash, 'PRINCIPAL', 'Dr. H. M. Manjunath (Principal)', 'principal.bly@sirmv.edu.in', '9845033444', '/avatars/principal.png');

  // HODs
  insertUser.run('usr-hod-phy', 'branch-dvg', 'hod_physics', passwordHash, 'HOD', 'Dr. A. S. Patil', 'patil.phy@sirmv.edu.in', '9845044555', '/avatars/hod_phy.png');
  insertUser.run('usr-hod-chem', 'branch-dvg', 'hod_chem', passwordHash, 'HOD', 'Dr. Rekha M', 'rekha.chem@sirmv.edu.in', '9845055666', '/avatars/hod_chem.png');
  insertUser.run('usr-hod-math', 'branch-dvg', 'hod_math', passwordHash, 'HOD', 'Prof. Jagadish K', 'jagadish.math@sirmv.edu.in', '9845066777', '/avatars/hod_math.png');

  // Link HODs to Departments
  db.prepare(`UPDATE departments SET hod_user_id = 'usr-hod-phy' WHERE id = 'dept-phy-branch-dvg'`).run();
  db.prepare(`UPDATE departments SET hod_user_id = 'usr-hod-chem' WHERE id = 'dept-chem-branch-dvg'`).run();
  db.prepare(`UPDATE departments SET hod_user_id = 'usr-hod-math' WHERE id = 'dept-math-branch-dvg'`).run();

  // Teachers
  insertUser.run('usr-teacher-abc', 'branch-dvg', 'teacher_abc', passwordHash, 'TEACHER', 'Mr. Anand Kumar (Mr. ABC)', 'anand.abc@sirmv.edu.in', '9845077888', '/avatars/teacher_abc.png');
  insertUser.run('usr-teacher-xyz', 'branch-dvg', 'teacher_xyz', passwordHash, 'TEACHER', 'Mrs. Sneha Hegde (Mrs. XYZ)', 'sneha.xyz@sirmv.edu.in', '9845088999', '/avatars/teacher_xyz.png');
  insertUser.run('usr-teacher-pqr', 'branch-dvg', 'teacher_pqr', passwordHash, 'TEACHER', 'Mr. Prashanth Rao (Mr. PQR)', 'prashanth.pqr@sirmv.edu.in', '9845099000', '/avatars/teacher_pqr.png');
  insertUser.run('usr-teacher-chem1', 'branch-dvg', 'teacher_chem1', passwordHash, 'TEACHER', 'Dr. Ramesh B', 'ramesh.chem@sirmv.edu.in', '9845100111', '/avatars/teacher_chem.png');
  insertUser.run('usr-teacher-bio1', 'branch-dvg', 'teacher_bio1', passwordHash, 'TEACHER', 'Mrs. Shwetha N', 'shwetha.bio@sirmv.edu.in', '9845111222', '/avatars/teacher_bio.png');

  // Floor Attenders
  insertUser.run('usr-attender-fl2', 'branch-dvg', 'attender_floor2', passwordHash, 'FLOOR_ATTENDER', 'Ramesh Kumar (Floor 2 Attender)', 'ramesh.attender@sirmv.edu.in', '9740011223', '/avatars/attender.png');
  insertUser.run('usr-attender-fl3', 'branch-dvg', 'attender_floor3', passwordHash, 'FLOOR_ATTENDER', 'Manjunath S (Floor 3 Attender)', 'manjunath.attender@sirmv.edu.in', '9740022334', '/avatars/attender.png');

  // Gate Staff
  insertUser.run('usr-gate-1', 'branch-dvg', 'gate_staff', passwordHash, 'GATE_STAFF', 'Basavarajappa K (Main Gate Security)', 'security.gate@sirmv.edu.in', '9740033445', '/avatars/security.png');

  // Warden
  insertUser.run('usr-warden-1', 'branch-dvg', 'warden_boys', passwordHash, 'WARDEN', 'Chandrashekhar M (Boys Hostel Warden)', 'warden.boys@sirmv.edu.in', '9740044556', '/avatars/warden.png');

  // 5. Teacher Profiles
  const insertTeacherProfile = db.prepare(`
    INSERT OR REPLACE INTO teacher_profiles (id, user_id, employee_id, photo_url, date_of_birth, phone, email, address, department_id, designation, joining_date, qualification, is_hod)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTeacherProfile.run('tp-hod-phy', 'usr-hod-phy', 'EMP-PHY-001', '/avatars/hod_phy.png', '1978-05-14', '9845044555', 'patil.phy@sirmv.edu.in', '#42, Sir MV Layout, Davangere', 'dept-phy-branch-dvg', 'Professor & HOD', '2015-06-01', 'M.Sc., Ph.D. in Physics', 1);
  insertTeacherProfile.run('tp-teacher-abc', 'usr-teacher-abc', 'EMP-PHY-002', '/avatars/teacher_abc.png', '1985-08-20', '9845077888', 'anand.abc@sirmv.edu.in', '#120, Vidyanagar, Davangere', 'dept-phy-branch-dvg', 'Senior Physics Lecturer', '2018-07-15', 'M.Sc. Physics, B.Ed', 0);
  insertTeacherProfile.run('tp-teacher-xyz', 'usr-teacher-xyz', 'EMP-PHY-003', '/avatars/teacher_xyz.png', '1989-11-10', '9845088999', 'sneha.xyz@sirmv.edu.in', '#88, Anjaneya Extension, Davangere', 'dept-phy-branch-dvg', 'Physics Lecturer', '2020-08-01', 'M.Sc. Physics (Gold Medalist)', 0);
  insertTeacherProfile.run('tp-teacher-pqr', 'usr-teacher-pqr', 'EMP-MAT-001', '/avatars/teacher_pqr.png', '1984-03-25', '9845099000', 'prashanth.pqr@sirmv.edu.in', '#15, PJ Extension, Davangere', 'dept-math-branch-dvg', 'Senior Mathematics Lecturer', '2017-06-10', 'M.Sc. Mathematics', 0);
  insertTeacherProfile.run('tp-teacher-chem1', 'usr-teacher-chem1', 'EMP-CHE-001', '/avatars/teacher_chem.png', '1982-12-05', '9845100111', 'ramesh.chem@sirmv.edu.in', '#54, SS Layout, Davangere', 'dept-chem-branch-dvg', 'Senior Chemistry Lecturer', '2016-05-20', 'M.Sc., Ph.D. Chemistry', 0);
  insertTeacherProfile.run('tp-teacher-bio1', 'usr-teacher-bio1', 'EMP-BIO-001', '/avatars/teacher_bio.png', '1990-04-18', '9845111222', 'shwetha.bio@sirmv.edu.in', '#31, KB Extension, Davangere', 'dept-bio-branch-dvg', 'Biology Lecturer', '2021-06-15', 'M.Sc. Biotechnology, B.Ed', 0);

  // 6. Teacher Academic Assignments
  const insertAssignment = db.prepare(`
    INSERT OR REPLACE INTO teacher_assignments (id, teacher_id, department_id, subject_id, class_id, section_id, batch_id, is_class_teacher)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAssignment.run('ta-abc-1', 'tp-teacher-abc', 'dept-phy-branch-dvg', 'sub-phy-branch-dvg', 'cls-1puc-branch-dvg', 'sec-1PUC-A-branch-dvg', 'batch-neet-branch-dvg', 1);
  insertAssignment.run('ta-abc-2', 'tp-teacher-abc', 'dept-phy-branch-dvg', 'sub-phy-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-B-branch-dvg', 'batch-jee-branch-dvg', 0);
  insertAssignment.run('ta-xyz-1', 'tp-teacher-xyz', 'dept-phy-branch-dvg', 'sub-phy-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-A-branch-dvg', 'batch-neet-branch-dvg', 1);
  insertAssignment.run('ta-pqr-1', 'tp-teacher-pqr', 'dept-math-branch-dvg', 'sub-math-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-A-branch-dvg', 'batch-jee-branch-dvg', 0);
  insertAssignment.run('ta-chem-1', 'tp-teacher-chem1', 'dept-chem-branch-dvg', 'sub-chem-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-A-branch-dvg', 'batch-neet-branch-dvg', 0);
  insertAssignment.run('ta-bio-1', 'tp-teacher-bio1', 'dept-bio-branch-dvg', 'sub-bio-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-A-branch-dvg', 'batch-neet-branch-dvg', 0);

  // 7. Students & Parent accounts
  insertUser.run('usr-parent-rahul', 'branch-dvg', 'parent_rahul', passwordHash, 'PARENT', 'Mr. Rakesh Sharma', 'rakesh.sharma@gmail.com', '9845012345', '/avatars/parent.png');
  insertUser.run('usr-parent-sneha', 'branch-dvg', 'parent_sneha', passwordHash, 'PARENT', 'Mrs. Malathi K', 'malathi.k@gmail.com', '9845012346', '/avatars/parent.png');

  const students = [
    { id: 'sp-rahul', uId: 'usr-student-rahul', uname: 'student_rahul', reg: '2026PUC001', name: 'Rahul Sharma', gender: 'MALE', pName: 'Mr. Rakesh Sharma', pPhone: '9845012345', pUser: 'usr-parent-rahul', hostelite: 1 },
    { id: 'sp-aman', uId: 'usr-student-aman', uname: 'student_aman', reg: '2026PUC002', name: 'Aman Verma', gender: 'MALE', pName: 'Mr. Suresh Verma', pPhone: '9845055443', pUser: null, hostelite: 1 },
    { id: 'sp-sneha', uId: 'usr-student-sneha', uname: 'student_sneha', reg: '2026PUC003', name: 'Sneha K', gender: 'FEMALE', pName: 'Mrs. Malathi K', pPhone: '9845012346', pUser: 'usr-parent-sneha', hostelite: 0 },
    { id: 'sp-kiran', uId: 'usr-student-kiran', uname: 'student_kiran', reg: '2026PUC004', name: 'Kiran Kumar', gender: 'MALE', pName: 'Mr. Nagaraj K', pPhone: '9845077665', pUser: null, hostelite: 1 },
    { id: 'sp-priya', uId: 'usr-student-priya', uname: 'student_priya', reg: '2026PUC005', name: 'Priya Desai', gender: 'FEMALE', pName: 'Dr. Mohan Desai', pPhone: '9845099887', pUser: null, hostelite: 0 },
    { id: 'sp-darshan', uId: 'usr-student-darshan', uname: 'student_darshan', reg: '2026PUC006', name: 'Darshan Gowda', gender: 'MALE', pName: 'Mr. Ramegowda', pPhone: '9845088776', pUser: null, hostelite: 1 },
    { id: 'sp-ananya', uId: 'usr-student-ananya', uname: 'student_ananya', reg: '2026PUC007', name: 'Ananya Rao', gender: 'FEMALE', pName: 'Mr. Srinivas Rao', pPhone: '9845044332', pUser: null, hostelite: 0 },
    { id: 'sp-vikram', uId: 'usr-student-vikram', uname: 'student_vikram', reg: '2026PUC008', name: 'Vikram Hegde', gender: 'MALE', pName: 'Mr. Ramachandra Hegde', pPhone: '9845033221', pUser: null, hostelite: 1 }
  ];

  const insertStudent = db.prepare(`
    INSERT OR REPLACE INTO student_profiles (id, user_id, branch_id, register_number, name, photo_url, date_of_birth, gender, phone, email, address, parent_user_id, parent_name, parent_phone, parent_email, class_id, section_id, batch_id, is_hostelite)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const s of students) {
    insertUser.run(s.uId, 'branch-dvg', s.uname, passwordHash, 'STUDENT', s.name, `${s.uname}@student.sirmv.edu.in`, '98860' + s.reg.slice(-5), `/avatars/${s.uname}.png`);
    insertStudent.run(
      s.id, s.uId, 'branch-dvg', s.reg, s.name, `/avatars/${s.uname}.png`, '2008-06-15', s.gender, '98860' + s.reg.slice(-5),
      `${s.uname}@student.sirmv.edu.in`, 'Davangere, Karnataka', s.pUser, s.pName, s.pPhone, `${s.pPhone}@parent.com`,
      'cls-2puc-branch-dvg', 'sec-2PUC-A-branch-dvg', 'batch-neet-branch-dvg', s.hostelite
    );
  }

  // 8. Timetable Entries
  const insertTimetable = db.prepare(`
    INSERT OR REPLACE INTO timetable_entries (id, branch_id, day_of_week, period_number, start_time, end_time, subject_id, class_id, section_id, batch_id, room_id, teacher_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Weekly timetable for Mr. ABC and others
  for (const day of days) {
    // Period 1: 08:45 - 09:30 Physics 1 PUC A (Room 204) - Mr. ABC
    insertTimetable.run(`tt-${day}-p1-abc`, 'branch-dvg', day, 1, '08:45', '09:30', 'sub-phy-branch-dvg', 'cls-1puc-branch-dvg', 'sec-1PUC-A-branch-dvg', 'batch-neet-branch-dvg', 'rm-204-branch-dvg', 'tp-teacher-abc');
    
    // Period 2: 09:30 - 10:15 Physics 2 PUC B (Room 301) - Mr. ABC
    insertTimetable.run(`tt-${day}-p2-abc`, 'branch-dvg', day, 2, '09:30', '10:15', 'sub-phy-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-B-branch-dvg', 'batch-jee-branch-dvg', 'rm-301-branch-dvg', 'tp-teacher-abc');

    // Period 2: Chemistry in Room 202 - Dr. Ramesh
    insertTimetable.run(`tt-${day}-p2-chem`, 'branch-dvg', day, 2, '09:30', '10:15', 'sub-chem-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-A-branch-dvg', 'batch-neet-branch-dvg', 'rm-202-branch-dvg', 'tp-teacher-chem1');

    // Period 3: 10:30 - 11:15 Mathematics in Room 203 - Mr. PQR
    insertTimetable.run(`tt-${day}-p3-pqr`, 'branch-dvg', day, 3, '10:30', '11:15', 'sub-math-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-A-branch-dvg', 'batch-jee-branch-dvg', 'rm-203-branch-dvg', 'tp-teacher-pqr');

    // Period 3: Physics in Room 201 - Mrs. XYZ
    insertTimetable.run(`tt-${day}-p3-xyz`, 'branch-dvg', day, 3, '10:30', '11:15', 'sub-phy-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-A-branch-dvg', 'batch-neet-branch-dvg', 'rm-201-branch-dvg', 'tp-teacher-xyz');

    // Period 4: 11:15 - 12:00 Biology in Room 204 - Mrs. Shwetha
    insertTimetable.run(`tt-${day}-p4-bio`, 'branch-dvg', day, 4, '11:15', '12:00', 'sub-bio-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-A-branch-dvg', 'batch-neet-branch-dvg', 'rm-204-branch-dvg', 'tp-teacher-bio1');

    // Period 5: 12:45 - 01:30 Physics in Room 301 - Mr. ABC
    insertTimetable.run(`tt-${day}-p5-abc`, 'branch-dvg', day, 5, '12:45', '13:30', 'sub-phy-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-B-branch-dvg', 'batch-jee-branch-dvg', 'rm-301-branch-dvg', 'tp-teacher-abc');
  }

  // 9. Teacher Absence & Substitution (Mr. ABC is absent today 2026-09-20)
  const today = '2026-09-20';
  db.prepare(`INSERT OR REPLACE INTO teacher_absences (id, teacher_id, date, reason, status) VALUES (?, ?, ?, ?, ?)`).run(
    'abs-abc-today', 'tp-teacher-abc', today, 'Medical Leave (Viral fever)', 'RECORDED'
  );

  // Substitution assignment: Mrs. XYZ substituted for Mr. ABC on Period 2
  db.prepare(`
    INSERT OR REPLACE INTO substitution_assignments (id, timetable_entry_id, date, original_teacher_id, substitute_teacher_id, assigned_by, status, acknowledged_at, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'sub-assignment-1', 'tt-Sunday-p2-abc', today, 'tp-teacher-abc', 'tp-teacher-xyz', 'usr-hod-phy', 'ASSIGNED', null, 'HOD assigned Mrs. XYZ for Period 2 Physics'
  );

  // 10. Lecture Sessions
  const insertLecture = db.prepare(`
    INSERT OR REPLACE INTO lecture_sessions (
      id, branch_id, timetable_entry_id, date, academic_year, class_id, section_id, batch_id,
      subject_id, teacher_id, substitute_teacher_id, room_id, floor, scheduled_start, scheduled_end,
      teacher_time_in, lecture_start_time, lecture_end_time, teacher_time_out, teacher_status,
      classroom_photo_url, recording_url, floor_attender_id, remarks, finalization_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLecture.run(
    'lec-session-101', 'branch-dvg', 'tt-Sunday-p2-abc', today, '2026-27',
    'cls-2puc-branch-dvg', 'sec-2PUC-A-branch-dvg', 'batch-neet-branch-dvg', 'sub-phy-branch-dvg',
    'tp-teacher-abc', 'tp-teacher-xyz', 'rm-204-branch-dvg', 2, '09:30', '10:15',
    '09:32', '09:34', '10:13', '10:15', 'SUBSTITUTE',
    '/uploads/classroom_photos/room204_20260920.jpg',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'usr-attender-fl2', 'Floor 2 Attender Ramesh verified all students in order. Substitute teacher Mrs. XYZ took the lecture smoothly.',
    'COMPLETED'
  );

  // Lecture Concept
  db.prepare(`
    INSERT OR REPLACE INTO lecture_concepts (id, lecture_session_id, chapter, concept, topic_taught)
    VALUES (?, ?, ?, ?, ?)
  `).run('concept-101', 'lec-session-101', 'Chapter 11: Thermodynamics', 'Second Law of Thermodynamics & Carnot Engine', 'Work done in isothermal and adiabatic expansion, Carnot cycle efficiency derivation');

  // Student Attendance Records for Lecture 101
  const insertAttendance = db.prepare(`
    INSERT OR REPLACE INTO attendance_records (id, lecture_session_id, student_id, status, detection_confidence, match_status, marked_by, verified_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAttendance.run('att-rec-1', 'lec-session-101', 'sp-rahul', 'PRESENT', 0.98, 'CONFIRMED', 'usr-attender-fl2', 'usr-attender-fl2');
  insertAttendance.run('att-rec-2', 'lec-session-101', 'sp-aman', 'PRESENT', 0.95, 'CONFIRMED', 'usr-attender-fl2', 'usr-attender-fl2');
  insertAttendance.run('att-rec-3', 'lec-session-101', 'sp-sneha', 'ABSENT', 0.10, 'NOT_DETECTED', 'usr-attender-fl2', 'usr-attender-fl2');
  insertAttendance.run('att-rec-4', 'lec-session-101', 'sp-kiran', 'PRESENT', 0.92, 'CONFIRMED', 'usr-attender-fl2', 'usr-attender-fl2');
  insertAttendance.run('att-rec-5', 'lec-session-101', 'sp-priya', 'LATE', 0.88, 'CONFIRMED', 'usr-attender-fl2', 'usr-attender-fl2');
  insertAttendance.run('att-rec-6', 'lec-session-101', 'sp-darshan', 'PRESENT', 0.94, 'CONFIRMED', 'usr-attender-fl2', 'usr-attender-fl2');
  insertAttendance.run('att-rec-7', 'lec-session-101', 'sp-ananya', 'ABSENT', 0.05, 'NOT_DETECTED', 'usr-attender-fl2', 'usr-attender-fl2');
  insertAttendance.run('att-rec-8', 'lec-session-101', 'sp-vikram', 'PRESENT', 0.96, 'CONFIRMED', 'usr-attender-fl2', 'usr-attender-fl2');

  // 11. Evening Study
  db.prepare(`
    INSERT OR REPLACE INTO evening_study_sessions (id, branch_id, date, study_hall, floor, start_time, end_time, supervisor_id, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('ess-20260920', 'branch-dvg', today, 'Study Hall 1 (Dr. Sir MV Block)', 2, '18:30', '21:00', 'usr-warden-1', 'Evening self-study and problem solving session for NEET batch');

  const insertEveningAtt = db.prepare(`
    INSERT OR REPLACE INTO evening_study_attendance (id, session_id, student_id, entry_time, exit_time, duration_minutes, status, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertEveningAtt.run('esa-1', 'ess-20260920', 'sp-rahul', '18:30', '21:00', 150, 'PRESENT', 'Physics problem solving');
  insertEveningAtt.run('esa-2', 'ess-20260920', 'sp-aman', '18:35', '21:00', 145, 'LATE', 'Reported 5 mins late from dinner');
  insertEveningAtt.run('esa-3', 'ess-20260920', 'sp-kiran', '18:30', '20:15', 105, 'LEFT_EARLY', 'Permission granted for clinic visit');
  insertEveningAtt.run('esa-4', 'ess-20260920', 'sp-darshan', '18:30', '21:00', 150, 'PRESENT', 'Organic chemistry practice');
  insertEveningAtt.run('esa-5', 'ess-20260920', 'sp-vikram', '18:30', '21:00', 150, 'PRESENT', 'Biology NCERT review');

  // 12. Hostel Setup
  db.prepare(`INSERT OR REPLACE INTO hostels (id, branch_id, name, type) VALUES (?, ?, ?, ?)`).run('hostel-boys-dvg', 'branch-dvg', 'Sir MV Boys Hostel (Kuvempu Block)', 'BOYS');
  db.prepare(`INSERT OR REPLACE INTO hostel_blocks (id, hostel_id, name) VALUES (?, ?, ?)`).run('block-a-boys', 'hostel-boys-dvg', 'Block A');
  db.prepare(`INSERT OR REPLACE INTO hostel_rooms (id, block_id, room_number, floor, capacity) VALUES (?, ?, ?, ?, ?)`).run('hroom-201', 'block-a-boys', '201', 2, 4);
  db.prepare(`INSERT OR REPLACE INTO hostel_rooms (id, block_id, room_number, floor, capacity) VALUES (?, ?, ?, ?, ?)`).run('hroom-202', 'block-a-boys', '202', 2, 4);

  db.prepare(`INSERT OR REPLACE INTO hostel_beds (id, room_id, bed_number, student_id) VALUES (?, ?, ?, ?)`).run('bed-201-1', 'hroom-201', 'Bed 1', 'sp-rahul');
  db.prepare(`INSERT OR REPLACE INTO hostel_beds (id, room_id, bed_number, student_id) VALUES (?, ?, ?, ?)`).run('bed-201-2', 'hroom-201', 'Bed 2', 'sp-aman');
  db.prepare(`INSERT OR REPLACE INTO hostel_beds (id, room_id, bed_number, student_id) VALUES (?, ?, ?, ?)`).run('bed-201-3', 'hroom-201', 'Bed 3', 'sp-kiran');
  db.prepare(`INSERT OR REPLACE INTO hostel_beds (id, room_id, bed_number, student_id) VALUES (?, ?, ?, ?)`).run('bed-201-4', 'hroom-201', 'Bed 4', 'sp-darshan');

  // Hostel Attendance
  const insertHostelAtt = db.prepare(`
    INSERT OR REPLACE INTO hostel_attendance (id, date, time, student_id, room_id, status, warden_id, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertHostelAtt.run('ha-1', today, '21:30', 'sp-rahul', 'hroom-201', 'PRESENT', 'usr-warden-1', 'Night roll call completed');
  insertHostelAtt.run('ha-2', today, '21:30', 'sp-aman', 'hroom-201', 'PRESENT', 'usr-warden-1', 'Present in room');
  insertHostelAtt.run('ha-3', today, '21:30', 'sp-kiran', 'hroom-201', 'PRESENT', 'usr-warden-1', 'Present');
  insertHostelAtt.run('ha-4', today, '21:30', 'sp-darshan', 'hroom-201', 'OUTPASS', 'usr-warden-1', 'Out on authorized parent outpass');

  // 13. Outpasses
  const insertOutpass = db.prepare(`
    INSERT OR REPLACE INTO outpasses (
      id, outpass_number, branch_id, student_id, reason, pickup_person_name, pickup_person_phone,
      relationship, id_type, id_number, pickup_photo_url, parent_phone, parent_otp_verified,
      parent_verified_at, verification_code, status, requested_at, approved_by, approved_at,
      rejection_reason, exit_time, exit_gate_staff_id, return_time, return_gate_staff_id, digital_signature_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Approved and Out
  insertOutpass.run(
    'op-1001', 'OP-2026-0920-001', 'branch-dvg', 'sp-darshan',
    'Attending cousin sister wedding reception in Davangere city',
    'Mr. Ramegowda', '9845088776', 'Father', 'Aadhaar Card', '9876-5432-1098',
    '/uploads/pickup_photos/pickup_darshan_father.jpg', '9845088776', 1,
    '2026-09-20 14:10:00', '4827', 'OUT', '2026-09-20 14:00:00', 'usr-prin-dvg', '2026-09-20 14:15:00',
    null, '2026-09-20 14:30:00', 'usr-gate-1', null, null, 'SIG_DIGITAL_PRINCIPAL_DVG_4827_VERIFIED'
  );

  // Pending Principal Approval
  insertOutpass.run(
    'op-1002', 'OP-2026-0920-002', 'branch-dvg', 'sp-rahul',
    'Family emergency - visiting paternal grandparents in Harihar',
    'Mr. Rakesh Sharma', '9845012345', 'Father', 'Aadhaar Card', '4532-8876-1122',
    '/uploads/pickup_photos/pickup_rahul_father.jpg', '9845012345', 1,
    '2026-09-20 16:30:00', '7391', 'PENDING', '2026-09-20 16:25:00', null, null,
    null, null, null, null, null, null
  );

  // Completed / Returned
  insertOutpass.run(
    'op-1003', 'OP-2026-0919-005', 'branch-dvg', 'sp-vikram',
    'Dental appointment at Bapuji Dental College, Davangere',
    'Mr. Ramachandra Hegde', '9845033221', 'Father', 'Driving License', 'KA-17-2015-0044',
    '/uploads/pickup_photos/pickup_vikram_father.jpg', '9845033221', 1,
    '2026-09-19 10:05:00', '1954', 'RETURNED', '2026-09-19 10:00:00', 'usr-prin-dvg', '2026-09-19 10:10:00',
    null, '2026-09-19 10:30:00', 'usr-gate-1', '2026-09-19 15:45:00', 'usr-gate-1', 'SIG_DIGITAL_PRINCIPAL_DVG_1954_VERIFIED'
  );

  // 14. Exams, Exam Subjects & Student Marks
  const insertExam = db.prepare(`
    INSERT OR REPLACE INTO exams (id, branch_id, name, exam_type, academic_year, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertExam.run('exam-ut1', 'branch-dvg', 'Unit Test 1', 'Unit Test', '2026-27', '2026-07-10', '2026-07-16');
  insertExam.run('exam-ut2', 'branch-dvg', 'Unit Test 2', 'Unit Test', '2026-27', '2026-08-18', '2026-08-24');
  insertExam.run('exam-midterm', 'branch-dvg', 'Mid Term Examination 2026', 'Mid Term', '2026-27', '2026-09-05', '2026-09-15');
  insertExam.run('exam-neet-1', 'branch-dvg', 'NEET Intensive Test 1', 'NEET Test', '2026-27', '2026-09-18', '2026-09-18');

  // Exam Subjects for Mid Term & Unit Test 1
  const insertExamSub = db.prepare(`
    INSERT OR REPLACE INTO exam_subjects (id, exam_id, subject_id, class_id, max_marks, passing_marks, exam_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const subs = [
    { code: 'phy', name: 'Physics', max: 100, pass: 35, date: '2026-09-05' },
    { code: 'chem', name: 'Chemistry', max: 100, pass: 35, date: '2026-09-07' },
    { code: 'math', name: 'Mathematics', max: 100, pass: 35, date: '2026-09-09' },
    { code: 'bio', name: 'Biology', max: 100, pass: 35, date: '2026-09-11' },
    { code: 'eng', name: 'English', max: 100, pass: 35, date: '2026-09-13' },
    { code: 'kan', name: 'Kannada', max: 100, pass: 35, date: '2026-09-15' }
  ];

  for (const s of subs) {
    insertExamSub.run(`es-mid-${s.code}`, 'exam-midterm', `sub-${s.code}-branch-dvg`, 'cls-2puc-branch-dvg', s.max, s.pass, s.date);
    insertExamSub.run(`es-ut1-${s.code}`, 'exam-ut1', `sub-${s.code}-branch-dvg`, 'cls-2puc-branch-dvg', 50, 18, '2026-07-12');
  }

  // Student Marks for Mid Term
  const insertMarks = db.prepare(`
    INSERT OR REPLACE INTO student_marks (id, exam_subject_id, student_id, marks_obtained, grade, rank_in_class, rank_in_batch, teacher_remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Rahul Sharma
  insertMarks.run('sm-rahul-phy', 'es-mid-phy', 'sp-rahul', 94, 'A+', 2, 4, 'Outstanding conceptual clarity in Thermodynamics and Optics');
  insertMarks.run('sm-rahul-chem', 'es-mid-chem', 'sp-rahul', 91, 'A+', 3, 5, 'Strong command on Organic reaction mechanisms');
  insertMarks.run('sm-rahul-math', 'es-mid-math', 'sp-rahul', 88, 'A', 4, 8, 'Good analytical approach; practice calculus integration faster');
  insertMarks.run('sm-rahul-bio', 'es-mid-bio', 'sp-rahul', 96, 'A+', 1, 2, 'Brilliant diagrams and taxonomy recall');
  insertMarks.run('sm-rahul-eng', 'es-mid-eng', 'sp-rahul', 89, 'A', 5, 10, 'Well-written essays and grammar accuracy');
  insertMarks.run('sm-rahul-kan', 'es-mid-kan', 'sp-rahul', 92, 'A+', 2, 6, 'Excellent comprehension and poetic analysis');

  // Aman Verma
  insertMarks.run('sm-aman-phy', 'es-mid-phy', 'sp-aman', 97, 'A+', 1, 1, 'Exceptional problem solver in Mechanics & Electrodynamics');
  insertMarks.run('sm-aman-chem', 'es-mid-chem', 'sp-aman', 95, 'A+', 1, 2, 'Top score in Physical Chemistry');
  insertMarks.run('sm-aman-math', 'es-mid-math', 'sp-aman', 98, 'A+', 1, 1, 'Flawless calculation and speed');
  insertMarks.run('sm-aman-bio', 'es-mid-bio', 'sp-aman', 90, 'A+', 3, 7, 'Very good; focus on genetics terminology');
  insertMarks.run('sm-aman-eng', 'es-mid-eng', 'sp-aman', 85, 'A', 8, 15, 'Good expression');
  insertMarks.run('sm-aman-kan', 'es-mid-kan', 'sp-aman', 88, 'A', 6, 12, 'Good understanding');

  // Sneha K
  insertMarks.run('sm-sneha-phy', 'es-mid-phy', 'sp-sneha', 85, 'A', 6, 12, 'Good foundation; improve numerical speed');
  insertMarks.run('sm-sneha-chem', 'es-mid-chem', 'sp-sneha', 89, 'A', 4, 9, 'Well prepared for Inorganic chemistry');
  insertMarks.run('sm-sneha-math', 'es-mid-math', 'sp-sneha', 82, 'A', 7, 14, 'Keep practicing tricky coordinate geometry');
  insertMarks.run('sm-sneha-bio', 'es-mid-bio', 'sp-sneha', 94, 'A+', 2, 3, 'Top tier botanical classification');
  insertMarks.run('sm-sneha-eng', 'es-mid-eng', 'sp-sneha', 92, 'A+', 2, 4, 'Very expressive literature answers');
  insertMarks.run('sm-sneha-kan', 'es-mid-kan', 'sp-sneha', 90, 'A+', 3, 8, 'Neat handwriting and accurate answers');

  // Kiran Kumar
  insertMarks.run('sm-kiran-phy', 'es-mid-phy', 'sp-kiran', 78, 'B+', 10, 22, 'Focus on Formula derivations');
  insertMarks.run('sm-kiran-chem', 'es-mid-chem', 'sp-kiran', 80, 'A', 9, 19, 'Good improvement in Chemistry');
  insertMarks.run('sm-kiran-math', 'es-mid-math', 'sp-kiran', 76, 'B+', 11, 24, 'Requires additional practice in vectors');
  insertMarks.run('sm-kiran-bio', 'es-mid-bio', 'sp-kiran', 84, 'A', 8, 16, 'Good knowledge in Human Physiology');
  insertMarks.run('sm-kiran-eng', 'es-mid-eng', 'sp-kiran', 82, 'A', 9, 18, 'Good effort');
  insertMarks.run('sm-kiran-kan', 'es-mid-kan', 'sp-kiran', 85, 'A', 8, 15, 'Good presentation');

  // Exam Remarks
  db.prepare(`
    INSERT OR REPLACE INTO exam_remarks (id, student_id, exam_id, class_teacher_remarks, subject_teacher_remarks, hod_remarks, principal_remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'rem-rahul-mid', 'sp-rahul', 'exam-midterm',
    'Rahul maintains excellent academic discipline and participates actively in NEET mock discussions.',
    'Consistently tops Physics numerical tests and solves difficult conceptual problems with enthusiasm.',
    'Highly potential student for Karnataka state NEET top 100 rank.',
    'Promising academic record. Keep striving for national-level excellence. - Dr. B. N. Vishwanath, Principal'
  );

  // Evaluated Papers
  db.prepare(`
    INSERT OR REPLACE INTO evaluated_papers (id, student_id, exam_subject_id, file_url, uploaded_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    'ep-rahul-phy', 'sp-rahul', 'es-mid-phy', '/uploads/evaluated_papers/rahul_phy_midterm.pdf', 'usr-teacher-abc'
  );
  db.prepare(`
    INSERT OR REPLACE INTO evaluated_papers (id, student_id, exam_subject_id, file_url, uploaded_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    'ep-rahul-bio', 'sp-rahul', 'es-mid-bio', '/uploads/evaluated_papers/rahul_bio_midterm.pdf', 'usr-teacher-bio1'
  );

  // 15. Audit Logs
  const insertAudit = db.prepare(`
    INSERT OR REPLACE INTO audit_logs (id, user_id, user_name, role, action, entity_type, entity_id, details_json, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run('audit-1', 'usr-attender-fl2', 'Ramesh Kumar', 'FLOOR_ATTENDER', 'LECTURE_STARTED', 'lecture_sessions', 'lec-session-101', JSON.stringify({ room: '204', time_in: '09:32', teacher: 'Mrs. Sneha Hegde (Substitute)' }), '192.168.1.45');
  insertAudit.run('audit-2', 'usr-attender-fl2', 'Ramesh Kumar', 'FLOOR_ATTENDER', 'ATTENDANCE_FINALIZED', 'attendance_records', 'lec-session-101', JSON.stringify({ total: 8, present: 6, absent: 2 }), '192.168.1.45');
  insertAudit.run('audit-3', 'usr-hod-phy', 'Dr. A. S. Patil', 'HOD', 'SUBSTITUTE_ASSIGNED', 'substitution_assignments', 'sub-assignment-1', JSON.stringify({ original: 'Mr. Anand Kumar', substitute: 'Mrs. Sneha Hegde', period: 2 }), '192.168.1.12');
  insertAudit.run('audit-4', 'usr-prin-dvg', 'Dr. B. N. Vishwanath', 'PRINCIPAL', 'OUTPASS_APPROVED', 'outpasses', 'op-1001', JSON.stringify({ student: 'Darshan Gowda', code: '4827', pickup: 'Mr. Ramegowda' }), '192.168.1.2');
  insertAudit.run('audit-5', 'usr-gate-1', 'Basavarajappa K', 'GATE_STAFF', 'GATE_EXIT_RECORDED', 'outpasses', 'op-1001', JSON.stringify({ student: 'Darshan Gowda', exit_time: '14:30:00' }), '192.168.1.90');

  console.log('SIR MV PU College Database seeded successfully with multi-branch data!');
}

// Run if directly executed
if (require.main === module) {
  seedDatabase();
}
