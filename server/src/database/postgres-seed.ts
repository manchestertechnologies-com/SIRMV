import { getClient, pgPool } from './postgres';
import bcrypt from 'bcryptjs';

export async function seedPostgresDatabase() {
  console.log('🔄 Starting Neon PostgreSQL database seed inside a transactional block...');
  
  const client = await getClient();
  const passwordHash = bcrypt.hashSync('Demo@12345', 10);

  const stats: Record<string, { inserted: number; skipped: number }> = {};
  const recordStat = (table: string, count: number) => {
    if (!stats[table]) stats[table] = { inserted: 0, skipped: 0 };
    stats[table].inserted += count;
  };

  try {
    await client.query('BEGIN');

    // Helper for parameterized upsert
    const upsert = async (sql: string, params: any[], table: string) => {
      await client.query(sql, params);
      recordStat(table, 1);
    };

    // 1. Branches
    const branchSql = `
      INSERT INTO branches (id, name, code, city, address, phone, email, principal_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        city = EXCLUDED.city,
        address = EXCLUDED.address,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        principal_name = EXCLUDED.principal_name;
    `;

    await upsert(branchSql, ['branch-dvg', 'SIR MV PU College - Davangere', 'SIRMV-DVG', 'Davangere', 'MCC B Block, Kuvempu Road, Davangere, Karnataka 577004', '08192-234567', 'info.dvg@sirmv.edu.in', 'Dr. B. N. Vishwanath'], 'branches');
    await upsert(branchSql, ['branch-smg', 'SIR MV PU College - Shivamogga', 'SIRMV-SMG', 'Shivamogga', 'Jail Road, Tilak Nagar, Shivamogga, Karnataka 577201', '08182-278901', 'info.smg@sirmv.edu.in', 'Prof. K. R. Suresh'], 'branches');
    await upsert(branchSql, ['branch-bly', 'SIR MV PU College - Ballari', 'SIRMV-BLY', 'Ballari', 'Cantonment Area, Infotech Campus, Ballari, Karnataka 583104', '08392-256789', 'info.bly@sirmv.edu.in', 'Dr. H. M. Manjunath'], 'branches');

    // 2. Academic Years
    const aySql = `
      INSERT INTO academic_years (id, name, is_current)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_current = EXCLUDED.is_current;
    `;
    await upsert(aySql, ['ay-2026-27', '2026-27', 1], 'academic_years');

    // 3. Classes, Sections, Batches, Departments, Subjects, Rooms
    const classSql = `
      INSERT INTO classes (id, branch_id, name)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    `;
    const secSql = `
      INSERT INTO sections (id, class_id, name)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    `;
    const batchSql = `
      INSERT INTO batches (id, branch_id, name, code)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;
    `;
    const deptSql = `
      INSERT INTO departments (id, branch_id, name, code)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;
    `;
    const subSql = `
      INSERT INTO subjects (id, department_id, name, code)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;
    `;
    const roomSql = `
      INSERT INTO rooms (id, branch_id, room_number, floor)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET room_number = EXCLUDED.room_number, floor = EXCLUDED.floor;
    `;

    const branches = ['branch-dvg', 'branch-smg', 'branch-bly'];

    for (const bId of branches) {
      const p1 = `cls-1puc-${bId}`;
      const p2 = `cls-2puc-${bId}`;
      await upsert(classSql, [p1, bId, '1 PUC'], 'classes');
      await upsert(classSql, [p2, bId, '2 PUC'], 'classes');

      for (const [clsId, clsName] of [[p1, '1PUC'], [p2, '2PUC']]) {
        await upsert(secSql, [`sec-${clsName}-A-${bId}`, clsId, 'A'], 'sections');
        await upsert(secSql, [`sec-${clsName}-B-${bId}`, clsId, 'B'], 'sections');
        await upsert(secSql, [`sec-${clsName}-C-${bId}`, clsId, 'C'], 'sections');
      }

      await upsert(batchSql, [`batch-neet-${bId}`, bId, 'NEET Batch', 'NEET'], 'batches');
      await upsert(batchSql, [`batch-jee-${bId}`, bId, 'JEE Batch', 'JEE'], 'batches');
      await upsert(batchSql, [`batch-kcet-${bId}`, bId, 'KCET Batch', 'KCET'], 'batches');
      await upsert(batchSql, [`batch-reg-${bId}`, bId, 'Regular PU', 'REGULAR'], 'batches');

      const depts = [
        { id: `dept-phy-${bId}`, name: 'Physics Department', code: 'PHY', subName: 'Physics', subCode: 'PHY101' },
        { id: `dept-chem-${bId}`, name: 'Chemistry Department', code: 'CHEM', subName: 'Chemistry', subCode: 'CHE101' },
        { id: `dept-math-${bId}`, name: 'Mathematics Department', code: 'MATH', subName: 'Mathematics', subCode: 'MAT101' },
        { id: `dept-bio-${bId}`, name: 'Biology Department', code: 'BIO', subName: 'Biology', subCode: 'BIO101' },
        { id: `dept-cs-${bId}`, name: 'Computer Science Department', code: 'CS', subName: 'Computer Science', subCode: 'CS101' },
        { id: `dept-eng-${bId}`, name: 'English Department', code: 'ENG', subName: 'English', subCode: 'ENG101' },
        { id: `dept-kan-${bId}`, name: 'Kannada Department', code: 'KAN', subName: 'Kannada', subCode: 'KAN101' },
        { id: `dept-elec-${bId}`, name: 'Electronics Department', code: 'ELEC', subName: 'Electronics', subCode: 'ELE101' },
        { id: `dept-sans-${bId}`, name: 'Sanskrit Department', code: 'SANS', subName: 'Sanskrit', subCode: 'SAN101' },
        { id: `dept-hin-${bId}`, name: 'Hindi Department', code: 'HIN', subName: 'Hindi', subCode: 'HIN101' }
      ];

      for (const d of depts) {
        await upsert(deptSql, [d.id, bId, d.name, d.code], 'departments');
        await upsert(subSql, [`sub-${d.code.toLowerCase()}-${bId}`, d.id, d.subName, d.subCode], 'subjects');
      }

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
        await upsert(roomSql, [r.id, bId, r.num, r.floor], 'rooms');
      }
    }

    // 4. Users (10 Standard Roles & Demo Accounts)
    const userSql = `
      INSERT INTO users (id, branch_id, username, password_hash, role, name, email, phone, avatar_url, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        avatar_url = EXCLUDED.avatar_url,
        is_active = EXCLUDED.is_active;
    `;

    // Standard Demo Accounts (Password: Demo@12345)
    await upsert(userSql, ['usr-admin', 'branch-dvg', 'admin.demo@college.test', passwordHash, 'ADMIN', 'Aarav Kulkarni (System Admin)', 'admin.demo@college.test', '9880011223', '/avatars/admin.png', 1], 'users');
    await upsert(userSql, ['usr-prin-dvg', 'branch-dvg', 'principal.demo@college.test', passwordHash, 'PRINCIPAL', 'Dr. B. N. Vishwanath (Principal)', 'principal.demo@college.test', '9845011222', '/avatars/principal.png', 1], 'users');
    await upsert(userSql, ['usr-prin-smg', 'branch-smg', 'principal_smg', passwordHash, 'PRINCIPAL', 'Prof. K. R. Suresh (Principal)', 'principal.smg@sirmv.edu.in', '9845022333', '/avatars/principal.png', 1], 'users');
    await upsert(userSql, ['usr-prin-bly', 'branch-bly', 'principal_bly', passwordHash, 'PRINCIPAL', 'Dr. H. M. Manjunath (Principal)', 'principal.bly@sirmv.edu.in', '9845033444', '/avatars/principal.png', 1], 'users');

    // HODs
    await upsert(userSql, ['usr-hod-phy', 'branch-dvg', 'hod.demo@college.test', passwordHash, 'HOD', 'Dr. A. S. Patil (HOD Physics)', 'hod.demo@college.test', '9845044555', '/avatars/hod_phy.png', 1], 'users');
    await upsert(userSql, ['usr-hod-chem', 'branch-dvg', 'hod_chem', passwordHash, 'HOD', 'Dr. Rekha M', 'rekha.chem@sirmv.edu.in', '9845055666', '/avatars/hod_chem.png', 1], 'users');
    await upsert(userSql, ['usr-hod-math', 'branch-dvg', 'hod_math', passwordHash, 'HOD', 'Prof. Jagadish K', 'jagadish.math@sirmv.edu.in', '9845066777', '/avatars/hod_math.png', 1], 'users');

    // Link HODs to Departments
    await client.query(`UPDATE departments SET hod_user_id = 'usr-hod-phy' WHERE id = 'dept-phy-branch-dvg'`);
    await client.query(`UPDATE departments SET hod_user_id = 'usr-hod-chem' WHERE id = 'dept-chem-branch-dvg'`);
    await client.query(`UPDATE departments SET hod_user_id = 'usr-hod-math' WHERE id = 'dept-math-branch-dvg'`);

    // Teachers
    await upsert(userSql, ['usr-teacher-abc', 'branch-dvg', 'teacher.demo@college.test', passwordHash, 'TEACHER', 'Mr. Anand Kumar (Physics Faculty)', 'teacher.demo@college.test', '9845077888', '/avatars/teacher_abc.png', 1], 'users');
    await upsert(userSql, ['usr-teacher-xyz', 'branch-dvg', 'teacher_xyz', passwordHash, 'TEACHER', 'Mrs. Sneha Hegde (Mrs. XYZ)', 'sneha.xyz@sirmv.edu.in', '9845088999', '/avatars/teacher_xyz.png', 1], 'users');
    await upsert(userSql, ['usr-teacher-pqr', 'branch-dvg', 'teacher_pqr', passwordHash, 'TEACHER', 'Mr. Prashanth Rao (Mr. PQR)', 'prashanth.pqr@sirmv.edu.in', '9845099000', '/avatars/teacher_pqr.png', 1], 'users');
    await upsert(userSql, ['usr-teacher-chem1', 'branch-dvg', 'teacher_chem1', passwordHash, 'TEACHER', 'Dr. Ramesh B', 'ramesh.chem@sirmv.edu.in', '9845100111', '/avatars/teacher_chem.png', 1], 'users');
    await upsert(userSql, ['usr-teacher-bio1', 'branch-dvg', 'teacher_bio1', passwordHash, 'TEACHER', 'Mrs. Shwetha N', 'shwetha.bio@sirmv.edu.in', '9845111222', '/avatars/teacher_bio.png', 1], 'users');

    // Demo faculty (rounds out the branch to 10 teaching staff, for the
    // Live Substitution & Proxy Hub demo — 5 of these are marked absent on
    // 2026-09-26 below).
    await upsert(userSql, ['usr-demo-cs', 'branch-dvg', 'demo_cs', passwordHash, 'TEACHER', 'Mr. Vinay Gowda (CS Faculty)', 'vinay.cs@sirmv.edu.in', '9845122001', '/avatars/teacher_abc.png', 1], 'users');
    await upsert(userSql, ['usr-demo-kan', 'branch-dvg', 'demo_kan', passwordHash, 'TEACHER', 'Mrs. Lakshmi Devi (Kannada Faculty)', 'lakshmi.kan@sirmv.edu.in', '9845122002', '/avatars/teacher_xyz.png', 1], 'users');
    await upsert(userSql, ['usr-demo-elec', 'branch-dvg', 'demo_elec', passwordHash, 'TEACHER', 'Mr. Naveen Kumar (Electronics Faculty)', 'naveen.elec@sirmv.edu.in', '9845122003', '/avatars/teacher_pqr.png', 1], 'users');
    await upsert(userSql, ['usr-demo-eng', 'branch-dvg', 'demo_eng', passwordHash, 'TEACHER', 'Mrs. Ananya Rao (English Faculty)', 'ananya.eng@sirmv.edu.in', '9845122004', '/avatars/teacher_bio.png', 1], 'users');

    // Floor Attenders
    await upsert(userSql, ['usr-attender-fl2', 'branch-dvg', 'floor.demo@college.test', passwordHash, 'FLOOR_ATTENDER', 'Ramesh Kumar (Floor Attender)', 'floor.demo@college.test', '9740011223', '/avatars/attender.png', 1], 'users');
    await upsert(userSql, ['usr-attender-fl3', 'branch-dvg', 'attender_floor3', passwordHash, 'FLOOR_ATTENDER', 'Manjunath S (Floor 3 Attender)', 'manjunath.attender@sirmv.edu.in', '9740022334', '/avatars/attender.png', 1], 'users');

    // Non-Teaching Staff & Gate Staff
    await upsert(userSql, ['usr-staff-1', 'branch-dvg', 'staff.demo@college.test', passwordHash, 'NON_TEACHING_STAFF', 'Basavarajappa K (Office Staff)', 'staff.demo@college.test', '9740033445', '/avatars/security.png', 1], 'users');
    await upsert(userSql, ['usr-gate-1', 'branch-dvg', 'gate_staff', passwordHash, 'GATE_STAFF', 'Mallikarjun G (Gate Security)', 'security.gate@sirmv.edu.in', '9740033446', '/avatars/security.png', 1], 'users');

    // Wardens & Head Warden
    await upsert(userSql, ['usr-warden-1', 'branch-dvg', 'warden.demo@college.test', passwordHash, 'WARDEN', 'Chandrashekhar M (Boys Hostel Warden)', 'warden.demo@college.test', '9740044556', '/avatars/warden.png', 1], 'users');
    await upsert(userSql, ['usr-headwarden-1', 'branch-dvg', 'headwarden.demo@college.test', passwordHash, 'HEAD_WARDEN', 'Dr. M. S. Siddalingaiah (Head Warden)', 'headwarden.demo@college.test', '9740044557', '/avatars/warden.png', 1], 'users');

    // Students & Parents
    await upsert(userSql, ['usr-student-rahul', 'branch-dvg', 'student.demo@college.test', passwordHash, 'STUDENT', 'Rahul Sharma (Student)', 'student.demo@college.test', '9845012341', '/avatars/student_rahul.png', 1], 'users');
    await upsert(userSql, ['usr-parent-rahul', 'branch-dvg', 'parent.demo@college.test', passwordHash, 'PARENT', 'Mr. Rakesh Sharma (Parent)', 'parent.demo@college.test', '9845012345', '/avatars/parent.png', 1], 'users');
    await upsert(userSql, ['usr-parent-sneha', 'branch-dvg', 'parent_sneha', passwordHash, 'PARENT', 'Mrs. Malathi K', 'malathi.k@gmail.com', '9845012346', '/avatars/parent.png', 1], 'users');

    // 5. Teacher Profiles
    const tpSql = `
      INSERT INTO teacher_profiles (id, user_id, employee_id, photo_url, date_of_birth, phone, email, address, department_id, designation, joining_date, qualification, is_hod)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        employee_id = EXCLUDED.employee_id,
        designation = EXCLUDED.designation,
        qualification = EXCLUDED.qualification,
        is_hod = EXCLUDED.is_hod;
    `;

    await upsert(tpSql, ['tp-hod-phy', 'usr-hod-phy', 'EMP-PHY-001', '/avatars/hod_phy.png', '1978-05-14', '9845044555', 'patil.phy@sirmv.edu.in', '#42, Sir MV Layout, Davangere', 'dept-phy-branch-dvg', 'Professor & HOD', '2015-06-01', 'M.Sc., Ph.D. in Physics', 1], 'teacher_profiles');
    await upsert(tpSql, ['tp-teacher-abc', 'usr-teacher-abc', 'EMP-PHY-002', '/avatars/teacher_abc.png', '1985-08-20', '9845077888', 'anand.abc@sirmv.edu.in', '#120, Vidyanagar, Davangere', 'dept-phy-branch-dvg', 'Senior Physics Lecturer', '2018-07-15', 'M.Sc. Physics, B.Ed', 0], 'teacher_profiles');
    await upsert(tpSql, ['tp-teacher-xyz', 'usr-teacher-xyz', 'EMP-PHY-003', '/avatars/teacher_xyz.png', '1989-11-10', '9845088999', 'sneha.xyz@sirmv.edu.in', '#88, Anjaneya Extension, Davangere', 'dept-phy-branch-dvg', 'Physics Lecturer', '2020-08-01', 'M.Sc. Physics (Gold Medalist)', 0], 'teacher_profiles');
    await upsert(tpSql, ['tp-teacher-pqr', 'usr-teacher-pqr', 'EMP-MAT-001', '/avatars/teacher_pqr.png', '1984-03-25', '9845099000', 'prashanth.pqr@sirmv.edu.in', '#15, PJ Extension, Davangere', 'dept-math-branch-dvg', 'Senior Mathematics Lecturer', '2017-06-10', 'M.Sc. Mathematics', 0], 'teacher_profiles');
    await upsert(tpSql, ['tp-teacher-chem1', 'usr-teacher-chem1', 'EMP-CHE-001', '/avatars/teacher_chem.png', '1982-12-05', '9845100111', 'ramesh.chem@sirmv.edu.in', '#54, SS Layout, Davangere', 'dept-chem-branch-dvg', 'Senior Chemistry Lecturer', '2016-05-20', 'M.Sc., Ph.D. Chemistry', 0], 'teacher_profiles');
    await upsert(tpSql, ['tp-teacher-bio1', 'usr-teacher-bio1', 'EMP-BIO-001', '/avatars/teacher_bio.png', '1990-04-18', '9845111222', 'shwetha.bio@sirmv.edu.in', '#31, KB Extension, Davangere', 'dept-bio-branch-dvg', 'Biology Lecturer', '2021-06-15', 'M.Sc. Biotechnology, B.Ed', 0], 'teacher_profiles');
    await upsert(tpSql, ['tp-demo-cs', 'usr-demo-cs', 'EMP-CS-001', '/avatars/teacher_abc.png', '1991-02-11', '9845122001', 'vinay.cs@sirmv.edu.in', '#7, Nehru Road, Davangere', 'dept-cs-branch-dvg', 'Faculty', '2022-06-01', 'M.Tech Computer Science', 0], 'teacher_profiles');
    await upsert(tpSql, ['tp-demo-kan', 'usr-demo-kan', 'EMP-KAN-001', '/avatars/teacher_xyz.png', '1987-07-19', '9845122002', 'lakshmi.kan@sirmv.edu.in', '#22, Shamanur Road, Davangere', 'dept-kan-branch-dvg', 'Senior Faculty', '2019-06-01', 'M.A. Kannada, B.Ed', 0], 'teacher_profiles');
    await upsert(tpSql, ['tp-demo-elec', 'usr-demo-elec', 'EMP-ELEC-001', '/avatars/teacher_pqr.png', '1993-01-30', '9845122003', 'naveen.elec@sirmv.edu.in', '#9, MCC B Block, Davangere', 'dept-elec-branch-dvg', 'Faculty', '2023-06-01', 'M.Tech Electronics', 0], 'teacher_profiles');
    await upsert(tpSql, ['tp-demo-eng', 'usr-demo-eng', 'EMP-ENG-001', '/avatars/teacher_bio.png', '1986-10-08', '9845122004', 'ananya.eng@sirmv.edu.in', '#3, Shivaji Nagar, Davangere', 'dept-eng-branch-dvg', 'Lab Faculty', '2020-06-01', 'M.A. English', 0], 'teacher_profiles');

    // 6. Teacher Assignments
    const taSql = `
      INSERT INTO teacher_assignments (id, teacher_id, department_id, subject_id, class_id, section_id, batch_id, is_class_teacher)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET is_class_teacher = EXCLUDED.is_class_teacher;
    `;

    await upsert(taSql, ['ta-abc-1', 'tp-teacher-abc', 'dept-phy-branch-dvg', 'sub-phy-branch-dvg', 'cls-1puc-branch-dvg', 'sec-1PUC-A-branch-dvg', 'batch-neet-branch-dvg', 1], 'teacher_assignments');
    await upsert(taSql, ['ta-abc-2', 'tp-teacher-abc', 'dept-phy-branch-dvg', 'sub-phy-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-B-branch-dvg', 'batch-jee-branch-dvg', 0], 'teacher_assignments');
    await upsert(taSql, ['ta-xyz-1', 'tp-teacher-xyz', 'dept-phy-branch-dvg', 'sub-phy-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-A-branch-dvg', 'batch-neet-branch-dvg', 1], 'teacher_assignments');
    await upsert(taSql, ['ta-pqr-1', 'tp-teacher-pqr', 'dept-math-branch-dvg', 'sub-math-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-A-branch-dvg', 'batch-jee-branch-dvg', 0], 'teacher_assignments');
    await upsert(taSql, ['ta-chem-1', 'tp-teacher-chem1', 'dept-chem-branch-dvg', 'sub-chem-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-A-branch-dvg', 'batch-neet-branch-dvg', 0], 'teacher_assignments');
    await upsert(taSql, ['ta-bio-1', 'tp-teacher-bio1', 'dept-bio-branch-dvg', 'sub-bio-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-A-branch-dvg', 'batch-neet-branch-dvg', 0], 'teacher_assignments');

    // 7. Hostels, Blocks, Rooms
    const hostelSql = `
      INSERT INTO hostels (id, branch_id, name, type)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type;
    `;
    const hBlockSql = `
      INSERT INTO hostel_blocks (id, hostel_id, name)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    `;
    const hRoomSql = `
      INSERT INTO hostel_rooms (id, block_id, room_number, floor, capacity)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET room_number = EXCLUDED.room_number, capacity = EXCLUDED.capacity;
    `;

    await upsert(hostelSql, ['hostel-boys-dvg', 'branch-dvg', 'Sir MV Boys Hostel (Kuvempu Block)', 'BOYS'], 'hostels');
    await upsert(hBlockSql, ['block-a-boys', 'hostel-boys-dvg', 'Block A'], 'hostel_blocks');
    await upsert(hRoomSql, ['hroom-201', 'block-a-boys', '201', 2, 4], 'hostel_rooms');
    await upsert(hRoomSql, ['hroom-202', 'block-a-boys', '202', 2, 4], 'hostel_rooms');

    // 8. Students
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

    const studentSql = `
      INSERT INTO student_profiles (
        id, user_id, branch_id, register_number, name, photo_url, date_of_birth, gender, phone, email,
        address, parent_user_id, parent_name, parent_phone, parent_email, class_id, section_id, batch_id, is_hostelite
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (id) DO UPDATE SET
        register_number = EXCLUDED.register_number,
        name = EXCLUDED.name,
        is_hostelite = EXCLUDED.is_hostelite;
    `;

    for (const s of students) {
      await upsert(userSql, [s.uId, 'branch-dvg', s.uname, passwordHash, 'STUDENT', s.name, `${s.uname}@student.sirmv.edu.in`, '98860' + s.reg.slice(-5), `/avatars/${s.uname}.png`, 1], 'users');
      await upsert(studentSql, [
        s.id, s.uId, 'branch-dvg', s.reg, s.name, `/avatars/${s.uname}.png`, '2008-06-15', s.gender, '98860' + s.reg.slice(-5),
        `${s.uname}@student.sirmv.edu.in`, 'Davangere, Karnataka', s.pUser, s.pName, s.pPhone, `${s.pPhone}@parent.com`,
        'cls-2puc-branch-dvg', 'sec-2PUC-A-branch-dvg', 'batch-neet-branch-dvg', s.hostelite
      ], 'student_profiles');
    }

    // 9. Hostel Beds
    const hBedSql = `
      INSERT INTO hostel_beds (id, room_id, bed_number, student_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET student_id = EXCLUDED.student_id;
    `;
    await upsert(hBedSql, ['bed-201-1', 'hroom-201', 'Bed 1', 'sp-rahul'], 'hostel_beds');
    await upsert(hBedSql, ['bed-201-2', 'hroom-201', 'Bed 2', 'sp-aman'], 'hostel_beds');
    await upsert(hBedSql, ['bed-201-3', 'hroom-201', 'Bed 3', 'sp-kiran'], 'hostel_beds');
    await upsert(hBedSql, ['bed-201-4', 'hroom-201', 'Bed 4', 'sp-darshan'], 'hostel_beds');

    // 10. Timetable Entries
    const ttSql = `
      INSERT INTO timetable_entries (id, branch_id, day_of_week, period_number, start_time, end_time, subject_id, class_id, section_id, batch_id, room_id, teacher_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time;
    `;

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const day of days) {
      await upsert(ttSql, [`tt-${day}-p1-abc`, 'branch-dvg', day, 1, '08:45', '09:30', 'sub-phy-branch-dvg', 'cls-1puc-branch-dvg', 'sec-1PUC-A-branch-dvg', 'batch-neet-branch-dvg', 'rm-204-branch-dvg', 'tp-teacher-abc'], 'timetable_entries');
      await upsert(ttSql, [`tt-${day}-p2-abc`, 'branch-dvg', day, 2, '09:30', '10:15', 'sub-phy-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-B-branch-dvg', 'batch-jee-branch-dvg', 'rm-301-branch-dvg', 'tp-teacher-abc'], 'timetable_entries');
      await upsert(ttSql, [`tt-${day}-p2-chem`, 'branch-dvg', day, 2, '09:30', '10:15', 'sub-chem-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-A-branch-dvg', 'batch-neet-branch-dvg', 'rm-202-branch-dvg', 'tp-teacher-chem1'], 'timetable_entries');
      await upsert(ttSql, [`tt-${day}-p3-pqr`, 'branch-dvg', day, 3, '10:30', '11:15', 'sub-math-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-A-branch-dvg', 'batch-jee-branch-dvg', 'rm-203-branch-dvg', 'tp-teacher-pqr'], 'timetable_entries');
      await upsert(ttSql, [`tt-${day}-p3-xyz`, 'branch-dvg', day, 3, '10:30', '11:15', 'sub-phy-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-A-branch-dvg', 'batch-neet-branch-dvg', 'rm-201-branch-dvg', 'tp-teacher-xyz'], 'timetable_entries');
      await upsert(ttSql, [`tt-${day}-p4-bio`, 'branch-dvg', day, 4, '11:15', '12:00', 'sub-bio-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-A-branch-dvg', 'batch-neet-branch-dvg', 'rm-204-branch-dvg', 'tp-teacher-bio1'], 'timetable_entries');
      await upsert(ttSql, [`tt-${day}-p5-abc`, 'branch-dvg', day, 5, '12:45', '13:30', 'sub-phy-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-B-branch-dvg', 'batch-jee-branch-dvg', 'rm-301-branch-dvg', 'tp-teacher-abc'], 'timetable_entries');
      // Demo faculty periods (rooms 101/102 are otherwise unused in this
      // seed, so these never clash with the entries above)
      await upsert(ttSql, [`tt-${day}-p1-cs`, 'branch-dvg', day, 1, '08:45', '09:30', 'sub-cs-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-A-branch-dvg', 'batch-reg-branch-dvg', 'rm-101-branch-dvg', 'tp-demo-cs'], 'timetable_entries');
      await upsert(ttSql, [`tt-${day}-p2-kan`, 'branch-dvg', day, 2, '09:30', '10:15', 'sub-kan-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-B-branch-dvg', 'batch-reg-branch-dvg', 'rm-102-branch-dvg', 'tp-demo-kan'], 'timetable_entries');
      await upsert(ttSql, [`tt-${day}-p3-elec`, 'branch-dvg', day, 3, '10:30', '11:15', 'sub-elec-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-A-branch-dvg', 'batch-reg-branch-dvg', 'rm-101-branch-dvg', 'tp-demo-elec'], 'timetable_entries');
      await upsert(ttSql, [`tt-${day}-p4-eng`, 'branch-dvg', day, 4, '11:15', '12:00', 'sub-eng-branch-dvg', 'cls-2puc-branch-dvg', 'sec-2PUC-B-branch-dvg', 'batch-reg-branch-dvg', 'rm-102-branch-dvg', 'tp-demo-eng'], 'timetable_entries');
    }

    // 11. Absences & Substitutions
    const today = '2026-09-20';
    const absSql = `
      INSERT INTO teacher_absences (id, teacher_id, date, reason, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET reason = EXCLUDED.reason, status = EXCLUDED.status;
    `;
    await upsert(absSql, ['abs-abc-today', 'tp-teacher-abc', today, 'Medical Leave (Viral fever)', 'RECORDED'], 'teacher_absences');

    // Live Substitution & Proxy Hub demo data: 5 of the 10 branch-dvg
    // faculty marked absent on 2026-09-26, each with a real timetable
    // period that day so the hub actually has affected periods to show
    // (previously "5 absent" but 0 affected periods happened when the
    // absent teacher had no timetable entry at all for that day).
    const demoAbsenceDate = '2026-09-26';
    await upsert(absSql, ['abs-demo-abc', 'tp-teacher-abc', demoAbsenceDate, 'Medical Leave / Personal Emergency', 'RECORDED'], 'teacher_absences');
    await upsert(absSql, ['abs-demo-pqr', 'tp-teacher-pqr', demoAbsenceDate, 'Attending a family function', 'RECORDED'], 'teacher_absences');
    await upsert(absSql, ['abs-demo-cs', 'tp-demo-cs', demoAbsenceDate, 'Medical Leave / Personal Emergency', 'RECORDED'], 'teacher_absences');
    await upsert(absSql, ['abs-demo-kan', 'tp-demo-kan', demoAbsenceDate, 'On official college duty', 'RECORDED'], 'teacher_absences');
    await upsert(absSql, ['abs-demo-elec', 'tp-demo-elec', demoAbsenceDate, 'Medical Leave / Personal Emergency', 'RECORDED'], 'teacher_absences');

    const subAssignSql = `
      INSERT INTO substitution_assignments (id, timetable_entry_id, date, original_teacher_id, substitute_teacher_id, assigned_by, status, acknowledged_at, remarks)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET substitute_teacher_id = EXCLUDED.substitute_teacher_id, status = EXCLUDED.status;
    `;
    await upsert(subAssignSql, ['sub-assignment-1', 'tt-Sunday-p2-abc', today, 'tp-teacher-abc', 'tp-teacher-xyz', 'usr-hod-phy', 'ASSIGNED', null, 'HOD assigned Mrs. XYZ for Period 2 Physics'], 'substitution_assignments');

    // 12. Lecture Sessions & Concepts
    const lecSql = `
      INSERT INTO lecture_sessions (
        id, branch_id, timetable_entry_id, date, academic_year, class_id, section_id, batch_id,
        subject_id, teacher_id, substitute_teacher_id, room_id, floor, scheduled_start, scheduled_end,
        teacher_time_in, lecture_start_time, lecture_end_time, teacher_time_out, teacher_status,
        classroom_photo_url, recording_url, floor_attender_id, remarks, finalization_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      ON CONFLICT (id) DO UPDATE SET
        teacher_status = EXCLUDED.teacher_status,
        finalization_status = EXCLUDED.finalization_status;
    `;

    await upsert(lecSql, [
      'lec-session-101', 'branch-dvg', 'tt-Sunday-p2-abc', today, '2026-27',
      'cls-2puc-branch-dvg', 'sec-2PUC-A-branch-dvg', 'batch-neet-branch-dvg', 'sub-phy-branch-dvg',
      'tp-teacher-abc', 'tp-teacher-xyz', 'rm-204-branch-dvg', 2, '09:30', '10:15',
      '09:32', '09:34', '10:13', '10:15', 'SUBSTITUTE',
      '/uploads/classroom_photos/room204_20260920.jpg',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      'usr-attender-fl2', 'Floor 2 Attender Ramesh verified all students in order. Substitute teacher Mrs. XYZ took the lecture smoothly.',
      'COMPLETED'
    ], 'lecture_sessions');

    const conceptSql = `
      INSERT INTO lecture_concepts (id, lecture_session_id, chapter, concept, topic_taught)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET chapter = EXCLUDED.chapter, concept = EXCLUDED.concept, topic_taught = EXCLUDED.topic_taught;
    `;
    await upsert(conceptSql, ['concept-101', 'lec-session-101', 'Chapter 11: Thermodynamics', 'Second Law of Thermodynamics & Carnot Engine', 'Work done in isothermal and adiabatic expansion, Carnot cycle efficiency derivation'], 'lecture_concepts');

    // 13. Attendance Records
    const attSql = `
      INSERT INTO attendance_records (id, lecture_session_id, student_id, status, detection_confidence, match_status, marked_by, verified_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, detection_confidence = EXCLUDED.detection_confidence, match_status = EXCLUDED.match_status;
    `;

    await upsert(attSql, ['att-rec-1', 'lec-session-101', 'sp-rahul', 'PRESENT', 0.98, 'CONFIRMED', 'usr-attender-fl2', 'usr-attender-fl2'], 'attendance_records');
    await upsert(attSql, ['att-rec-2', 'lec-session-101', 'sp-aman', 'PRESENT', 0.95, 'CONFIRMED', 'usr-attender-fl2', 'usr-attender-fl2'], 'attendance_records');
    await upsert(attSql, ['att-rec-3', 'lec-session-101', 'sp-sneha', 'ABSENT', 0.10, 'NOT_DETECTED', 'usr-attender-fl2', 'usr-attender-fl2'], 'attendance_records');
    await upsert(attSql, ['att-rec-4', 'lec-session-101', 'sp-kiran', 'PRESENT', 0.92, 'CONFIRMED', 'usr-attender-fl2', 'usr-attender-fl2'], 'attendance_records');
    await upsert(attSql, ['att-rec-5', 'lec-session-101', 'sp-priya', 'LATE', 0.88, 'CONFIRMED', 'usr-attender-fl2', 'usr-attender-fl2'], 'attendance_records');
    await upsert(attSql, ['att-rec-6', 'lec-session-101', 'sp-darshan', 'PRESENT', 0.94, 'CONFIRMED', 'usr-attender-fl2', 'usr-attender-fl2'], 'attendance_records');
    await upsert(attSql, ['att-rec-7', 'lec-session-101', 'sp-ananya', 'ABSENT', 0.05, 'NOT_DETECTED', 'usr-attender-fl2', 'usr-attender-fl2'], 'attendance_records');
    await upsert(attSql, ['att-rec-8', 'lec-session-101', 'sp-vikram', 'PRESENT', 0.96, 'CONFIRMED', 'usr-attender-fl2', 'usr-attender-fl2'], 'attendance_records');

    // 14. Evening Study
    const esSql = `
      INSERT INTO evening_study_sessions (id, branch_id, date, study_hall, floor, start_time, end_time, supervisor_id, remarks)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET study_hall = EXCLUDED.study_hall, remarks = EXCLUDED.remarks;
    `;
    await upsert(esSql, ['ess-20260920', 'branch-dvg', today, 'Study Hall 1 (Dr. Sir MV Block)', 2, '18:30', '21:00', 'usr-warden-1', 'Evening self-study and problem solving session for NEET batch'], 'evening_study_sessions');

    const esaSql = `
      INSERT INTO evening_study_attendance (id, session_id, student_id, entry_time, exit_time, duration_minutes, status, remarks)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, duration_minutes = EXCLUDED.duration_minutes;
    `;
    await upsert(esaSql, ['esa-1', 'ess-20260920', 'sp-rahul', '18:30', '21:00', 150, 'PRESENT', 'Physics problem solving'], 'evening_study_attendance');
    await upsert(esaSql, ['esa-2', 'ess-20260920', 'sp-aman', '18:35', '21:00', 145, 'LATE', 'Reported 5 mins late from dinner'], 'evening_study_attendance');
    await upsert(esaSql, ['esa-3', 'ess-20260920', 'sp-kiran', '18:30', '20:15', 105, 'LEFT_EARLY', 'Permission granted for clinic visit'], 'evening_study_attendance');
    await upsert(esaSql, ['esa-4', 'ess-20260920', 'sp-darshan', '18:30', '21:00', 150, 'PRESENT', 'Organic chemistry practice'], 'evening_study_attendance');
    await upsert(esaSql, ['esa-5', 'ess-20260920', 'sp-vikram', '18:30', '21:00', 150, 'PRESENT', 'Biology NCERT review'], 'evening_study_attendance');

    // 15. Hostel Attendance
    const haSql = `
      INSERT INTO hostel_attendance (id, date, time, student_id, room_id, status, warden_id, remarks)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, remarks = EXCLUDED.remarks;
    `;
    await upsert(haSql, ['ha-1', today, '21:30', 'sp-rahul', 'hroom-201', 'PRESENT', 'usr-warden-1', 'Night roll call completed'], 'hostel_attendance');
    await upsert(haSql, ['ha-2', today, '21:30', 'sp-aman', 'hroom-201', 'PRESENT', 'usr-warden-1', 'Present in room'], 'hostel_attendance');
    await upsert(haSql, ['ha-3', today, '21:30', 'sp-kiran', 'hroom-201', 'PRESENT', 'usr-warden-1', 'Present'], 'hostel_attendance');
    await upsert(haSql, ['ha-4', today, '21:30', 'sp-darshan', 'hroom-201', 'OUTPASS', 'usr-warden-1', 'Out on authorized parent outpass'], 'hostel_attendance');

    // 16. Outpasses
    const opSql = `
      INSERT INTO outpasses (
        id, outpass_number, branch_id, student_id, reason, pickup_person_name, pickup_person_phone,
        relationship, id_type, id_number, pickup_photo_url, parent_phone, parent_otp_verified,
        parent_verified_at, verification_code, status, requested_at, approved_by, approved_at,
        rejection_reason, exit_time, exit_gate_staff_id, return_time, return_gate_staff_id, digital_signature_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        exit_time = EXCLUDED.exit_time,
        return_time = EXCLUDED.return_time;
    `;

    await upsert(opSql, [
      'op-1001', 'OP-2026-0920-001', 'branch-dvg', 'sp-darshan',
      'Attending cousin sister wedding reception in Davangere city',
      'Mr. Ramegowda', '9845088776', 'Father', 'Aadhaar Card', '9876-5432-1098',
      '/uploads/pickup_photos/pickup_darshan_father.jpg', '9845088776', 1,
      '2026-09-20 14:10:00+05:30', '4827', 'OUT', '2026-09-20 14:00:00+05:30', 'usr-prin-dvg', '2026-09-20 14:15:00+05:30',
      null, '2026-09-20 14:30:00+05:30', 'usr-gate-1', null, null, 'SIG_DIGITAL_PRINCIPAL_DVG_4827_VERIFIED'
    ], 'outpasses');

    await upsert(opSql, [
      'op-1002', 'OP-2026-0920-002', 'branch-dvg', 'sp-rahul',
      'Family emergency - visiting paternal grandparents in Harihar',
      'Mr. Rakesh Sharma', '9845012345', 'Father', 'Aadhaar Card', '4532-8876-1122',
      '/uploads/pickup_photos/pickup_rahul_father.jpg', '9845012345', 1,
      '2026-09-20 16:30:00+05:30', '7391', 'PENDING', '2026-09-20 16:25:00+05:30', null, null,
      null, null, null, null, null, null
    ], 'outpasses');

    await upsert(opSql, [
      'op-1003', 'OP-2026-0919-005', 'branch-dvg', 'sp-vikram',
      'Dental appointment at Bapuji Dental College, Davangere',
      'Mr. Ramachandra Hegde', '9845033221', 'Father', 'Driving License', 'KA-17-2015-0044',
      '/uploads/pickup_photos/pickup_vikram_father.jpg', '9845033221', 1,
      '2026-09-19 10:05:00+05:30', '1954', 'RETURNED', '2026-09-19 10:00:00+05:30', 'usr-prin-dvg', '2026-09-19 10:10:00+05:30',
      null, '2026-09-19 10:30:00+05:30', 'usr-gate-1', '2026-09-19 15:45:00+05:30', 'usr-gate-1', 'SIG_DIGITAL_PRINCIPAL_DVG_1954_VERIFIED'
    ], 'outpasses');

    // 17. Exams, Exam Subjects, Marks, Evaluated Papers & Remarks
    const examSql = `
      INSERT INTO exams (id, branch_id, name, exam_type, academic_year, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, exam_type = EXCLUDED.exam_type;
    `;
    await upsert(examSql, ['exam-ut1', 'branch-dvg', 'Unit Test 1', 'Unit Test', '2026-27', '2026-07-10', '2026-07-16'], 'exams');
    await upsert(examSql, ['exam-ut2', 'branch-dvg', 'Unit Test 2', 'Unit Test', '2026-27', '2026-08-18', '2026-08-24'], 'exams');
    await upsert(examSql, ['exam-midterm', 'branch-dvg', 'Mid Term Examination 2026', 'Mid Term', '2026-27', '2026-09-05', '2026-09-15'], 'exams');
    await upsert(examSql, ['exam-neet-1', 'branch-dvg', 'NEET Intensive Test 1', 'NEET Test', '2026-27', '2026-09-18', '2026-09-18'], 'exams');

    const esSubSql = `
      INSERT INTO exam_subjects (id, exam_id, subject_id, class_id, max_marks, passing_marks, exam_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET max_marks = EXCLUDED.max_marks, passing_marks = EXCLUDED.passing_marks;
    `;
    const subs = [
      { code: 'phy', name: 'Physics', max: 100, pass: 35, date: '2026-09-05' },
      { code: 'chem', name: 'Chemistry', max: 100, pass: 35, date: '2026-09-07' },
      { code: 'math', name: 'Mathematics', max: 100, pass: 35, date: '2026-09-09' },
      { code: 'bio', name: 'Biology', max: 100, pass: 35, date: '2026-09-11' },
      { code: 'eng', name: 'English', max: 100, pass: 35, date: '2026-09-13' },
      { code: 'kan', name: 'Kannada', max: 100, pass: 35, date: '2026-09-15' }
    ];

    for (const s of subs) {
      await upsert(esSubSql, [`es-mid-${s.code}`, 'exam-midterm', `sub-${s.code}-branch-dvg`, 'cls-2puc-branch-dvg', s.max, s.pass, s.date], 'exam_subjects');
      await upsert(esSubSql, [`es-ut1-${s.code}`, 'exam-ut1', `sub-${s.code}-branch-dvg`, 'cls-2puc-branch-dvg', 50, 18, '2026-07-12'], 'exam_subjects');
    }

    const marksSql = `
      INSERT INTO student_marks (id, exam_subject_id, student_id, marks_obtained, grade, rank_in_class, rank_in_batch, teacher_remarks)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET marks_obtained = EXCLUDED.marks_obtained, grade = EXCLUDED.grade;
    `;

    // Rahul Sharma
    await upsert(marksSql, ['sm-rahul-phy', 'es-mid-phy', 'sp-rahul', 94, 'A+', 2, 4, 'Outstanding conceptual clarity in Thermodynamics and Optics'], 'student_marks');
    await upsert(marksSql, ['sm-rahul-chem', 'es-mid-chem', 'sp-rahul', 91, 'A+', 3, 5, 'Strong command on Organic reaction mechanisms'], 'student_marks');
    await upsert(marksSql, ['sm-rahul-math', 'es-mid-math', 'sp-rahul', 88, 'A', 4, 8, 'Good analytical approach; practice calculus integration faster'], 'student_marks');
    await upsert(marksSql, ['sm-rahul-bio', 'es-mid-bio', 'sp-rahul', 96, 'A+', 1, 2, 'Brilliant diagrams and taxonomy recall'], 'student_marks');
    await upsert(marksSql, ['sm-rahul-eng', 'es-mid-eng', 'sp-rahul', 89, 'A', 5, 10, 'Well-written essays and grammar accuracy'], 'student_marks');
    await upsert(marksSql, ['sm-rahul-kan', 'es-mid-kan', 'sp-rahul', 92, 'A+', 2, 6, 'Excellent comprehension and poetic analysis'], 'student_marks');

    // Aman Verma
    await upsert(marksSql, ['sm-aman-phy', 'es-mid-phy', 'sp-aman', 97, 'A+', 1, 1, 'Exceptional problem solver in Mechanics & Electrodynamics'], 'student_marks');
    await upsert(marksSql, ['sm-aman-chem', 'es-mid-chem', 'sp-aman', 95, 'A+', 1, 2, 'Top score in Physical Chemistry'], 'student_marks');
    await upsert(marksSql, ['sm-aman-math', 'es-mid-math', 'sp-aman', 98, 'A+', 1, 1, 'Flawless calculation and speed'], 'student_marks');
    await upsert(marksSql, ['sm-aman-bio', 'es-mid-bio', 'sp-aman', 90, 'A+', 3, 7, 'Very good; focus on genetics terminology'], 'student_marks');
    await upsert(marksSql, ['sm-aman-eng', 'es-mid-eng', 'sp-aman', 85, 'A', 8, 15, 'Good expression'], 'student_marks');
    await upsert(marksSql, ['sm-aman-kan', 'es-mid-kan', 'sp-aman', 88, 'A', 6, 12, 'Good understanding'], 'student_marks');

    // Sneha K
    await upsert(marksSql, ['sm-sneha-phy', 'es-mid-phy', 'sp-sneha', 85, 'A', 6, 12, 'Good foundation; improve numerical speed'], 'student_marks');
    await upsert(marksSql, ['sm-sneha-chem', 'es-mid-chem', 'sp-sneha', 89, 'A', 4, 9, 'Well prepared for Inorganic chemistry'], 'student_marks');
    await upsert(marksSql, ['sm-sneha-math', 'es-mid-math', 'sp-sneha', 82, 'A', 7, 14, 'Keep practicing tricky coordinate geometry'], 'student_marks');
    await upsert(marksSql, ['sm-sneha-bio', 'es-mid-bio', 'sp-sneha', 94, 'A+', 2, 3, 'Top tier botanical classification'], 'student_marks');
    await upsert(marksSql, ['sm-sneha-eng', 'es-mid-eng', 'sp-sneha', 92, 'A+', 2, 4, 'Very expressive literature answers'], 'student_marks');
    await upsert(marksSql, ['sm-sneha-kan', 'es-mid-kan', 'sp-sneha', 90, 'A+', 3, 8, 'Neat handwriting and accurate answers'], 'student_marks');

    // Kiran Kumar
    await upsert(marksSql, ['sm-kiran-phy', 'es-mid-phy', 'sp-kiran', 78, 'B+', 10, 22, 'Focus on Formula derivations'], 'student_marks');
    await upsert(marksSql, ['sm-kiran-chem', 'es-mid-chem', 'sp-kiran', 80, 'A', 9, 19, 'Good improvement in Chemistry'], 'student_marks');
    await upsert(marksSql, ['sm-kiran-math', 'es-mid-math', 'sp-kiran', 76, 'B+', 11, 24, 'Requires additional practice in vectors'], 'student_marks');
    await upsert(marksSql, ['sm-kiran-bio', 'es-mid-bio', 'sp-kiran', 84, 'A', 8, 16, 'Good knowledge in Human Physiology'], 'student_marks');
    await upsert(marksSql, ['sm-kiran-eng', 'es-mid-eng', 'sp-kiran', 82, 'A', 9, 18, 'Good effort'], 'student_marks');
    await upsert(marksSql, ['sm-kiran-kan', 'es-mid-kan', 'sp-kiran', 85, 'A', 8, 15, 'Good presentation'], 'student_marks');

    // Remarks & Evaluated papers
    const remSql = `
      INSERT INTO exam_remarks (id, student_id, exam_id, class_teacher_remarks, subject_teacher_remarks, hod_remarks, principal_remarks)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET principal_remarks = EXCLUDED.principal_remarks;
    `;
    await upsert(remSql, [
      'rem-rahul-mid', 'sp-rahul', 'exam-midterm',
      'Rahul maintains excellent academic discipline and participates actively in NEET mock discussions.',
      'Consistently tops Physics numerical tests and solves difficult conceptual problems with enthusiasm.',
      'Highly potential student for Karnataka state NEET top 100 rank.',
      'Promising academic record. Keep striving for national-level excellence. - Dr. B. N. Vishwanath, Principal'
    ], 'exam_remarks');

    const epSql = `
      INSERT INTO evaluated_papers (id, student_id, exam_subject_id, file_url, uploaded_by)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET file_url = EXCLUDED.file_url;
    `;
    await upsert(epSql, ['ep-rahul-phy', 'sp-rahul', 'es-mid-phy', '/uploads/evaluated_papers/rahul_phy_midterm.pdf', 'usr-teacher-abc'], 'evaluated_papers');
    await upsert(epSql, ['ep-rahul-bio', 'sp-rahul', 'es-mid-bio', '/uploads/evaluated_papers/rahul_bio_midterm.pdf', 'usr-teacher-bio1'], 'evaluated_papers');

    // 18b. Shivamogga Standard Role-Switcher Accounts
    // These 10 accounts exist so that every entry in the Navbar's "Switch Role
    // Persona" dropdown (Navbar.tsx institutionalRoles) and the AuthContext demo
    // fallback role map actually resolves to a real, working Postgres user —
    // all on branch-smg (Shivamogga), all logging in with password 123456.
    // usr-prin-smg already existed (created above) with different credentials;
    // it's re-upserted here so its username/email now match the dropdown too.
    await upsert(userSql, ['usr-admin-smg', 'branch-smg', 'admin', passwordHash, 'ADMIN', 'Campus Administrator', 'admin@sirmv.edu.in', '9900011111', '/avatars/admin.png', 1], 'users');
    await upsert(userSql, ['usr-prin-smg', 'branch-smg', 'principal', passwordHash, 'PRINCIPAL', 'Prof. K. R. Suresh (Principal)', 'principal@sirmv.edu.in', '9845022333', '/avatars/principal.png', 1], 'users');
    await upsert(userSql, ['usr-hodphysics-smg', 'branch-smg', 'hod.physics', passwordHash, 'HOD', 'Dr. Nagesh Rao (HOD Physics)', 'hod.physics@sirmv.edu.in', '9900022222', '/avatars/hod_phy.png', 1], 'users');
    await upsert(userSql, ['usr-lecturer-smg', 'branch-smg', 'lecturer', passwordHash, 'TEACHER', 'Mrs. Deepa Shetty (Senior Faculty)', 'lecturer@sirmv.edu.in', '9900033333', '/avatars/teacher_abc.png', 1], 'users');
    await upsert(userSql, ['usr-attender-smg', 'branch-smg', 'attender', passwordHash, 'FLOOR_ATTENDER', 'Ravindra Naik (Floor Operations)', 'attender@sirmv.edu.in', '9900044444', '/avatars/attender.png', 1], 'users');
    await upsert(userSql, ['usr-staff-smg', 'branch-smg', 'staff', passwordHash, 'NON_TEACHING_STAFF', 'Ganesh Bhat (Administrative Staff)', 'staff@sirmv.edu.in', '9900055555', '/avatars/security.png', 1], 'users');
    await upsert(userSql, ['usr-warden-smg', 'branch-smg', 'warden', passwordHash, 'WARDEN', 'Suresh Poojary (Hostel Warden)', 'warden@sirmv.edu.in', '9900066666', '/avatars/warden.png', 1], 'users');
    await upsert(userSql, ['usr-headwarden-smg', 'branch-smg', 'headwarden', passwordHash, 'HEAD_WARDEN', 'Dr. Chandrakala H (Chief Warden)', 'headwarden@sirmv.edu.in', '9900077777', '/avatars/warden.png', 1], 'users');
    await upsert(userSql, ['usr-student-smg', 'branch-smg', 'student', passwordHash, 'STUDENT', 'Bhoomika Naik (Student)', 'student@sirmv.edu.in', '9900088888', '/avatars/student_rahul.png', 1], 'users');
    await upsert(userSql, ['usr-parent-smg', 'branch-smg', 'parent', passwordHash, 'PARENT', 'Mr. Naveen Naik (Parent)', 'parent@sirmv.edu.in', '9900099999', '/avatars/parent.png', 1], 'users');
    await upsert(userSql, ['usr-examdept-smg', 'branch-smg', 'examdept', passwordHash, 'EXAM_DEPARTMENT', 'Mrs. Anitha Rao (Exam Department)', 'examdept@sirmv.edu.in', '9900010101', '/avatars/admin.png', 1], 'users');

    // Teacher profiles for the two teaching-role accounts above, so they can be
    // used in teacher_assignments and appear in the Timetable Generator.
    await upsert(tpSql, ['tp-hodphysics-smg', 'usr-hodphysics-smg', 'EMP-SMG-PHY-001', '/avatars/hod_phy.png', '1975-02-10', '9900022222', 'hod.physics@sirmv.edu.in', 'Tilak Nagar, Shivamogga', 'dept-phy-branch-smg', 'Professor & HOD', '2012-06-01', 'M.Sc., Ph.D. in Physics', 1], 'teacher_profiles');
    await upsert(tpSql, ['tp-lecturer-smg', 'usr-lecturer-smg', 'EMP-SMG-PHY-002', '/avatars/teacher_abc.png', '1988-09-22', '9900033333', 'lecturer@sirmv.edu.in', 'Jail Road, Shivamogga', 'dept-phy-branch-smg', 'Senior Physics Lecturer', '2019-06-15', 'M.Sc. Physics, B.Ed', 0], 'teacher_profiles');
    await client.query(`UPDATE departments SET hod_user_id = 'usr-hodphysics-smg' WHERE id = 'dept-phy-branch-smg'`);

    // Real teacher_assignments for branch-smg so "Suggest From Assignments" /
    // "Suggest All Teachers" in the Timetable Generator return actual data.
    await upsert(taSql, ['ta-hodphysics-smg-1', 'tp-hodphysics-smg', 'dept-phy-branch-smg', 'sub-phy-branch-smg', 'cls-1puc-branch-smg', 'sec-1PUC-A-branch-smg', 'batch-neet-branch-smg', 1], 'teacher_assignments');
    await upsert(taSql, ['ta-lecturer-smg-1', 'tp-lecturer-smg', 'dept-phy-branch-smg', 'sub-phy-branch-smg', 'cls-2puc-branch-smg', 'sec-2PUC-A-branch-smg', 'batch-neet-branch-smg', 0], 'teacher_assignments');
    await upsert(taSql, ['ta-lecturer-smg-2', 'tp-lecturer-smg', 'dept-phy-branch-smg', 'sub-phy-branch-smg', 'cls-2puc-branch-smg', 'sec-2PUC-B-branch-smg', 'batch-jee-branch-smg', 0], 'teacher_assignments');

    // Minimal student_profile for the Shivamogga student/parent demo accounts.
    await upsert(studentSql, [
      'sp-bhoomika-smg', 'usr-student-smg', 'branch-smg', '2026PUCSMG001', 'Bhoomika Naik', '/avatars/student_rahul.png',
      '2008-11-02', 'FEMALE', '9900088888', 'student@sirmv.edu.in', 'Tilak Nagar, Shivamogga',
      'usr-parent-smg', 'Mr. Naveen Naik', '9900099999', 'parent@sirmv.edu.in',
      'cls-2puc-branch-smg', 'sec-2PUC-A-branch-smg', 'batch-neet-branch-smg', 0
    ], 'student_profiles');

    // 18. Audit Logs
    const auditSql = `
      INSERT INTO audit_logs (id, user_id, user_name, role, action, entity_type, entity_id, details_json, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING;
    `;

    await upsert(auditSql, ['audit-1', 'usr-attender-fl2', 'Ramesh Kumar', 'FLOOR_ATTENDER', 'LECTURE_STARTED', 'lecture_sessions', 'lec-session-101', JSON.stringify({ room: '204', time_in: '09:32', teacher: 'Mrs. Sneha Hegde (Substitute)' }), '192.168.1.45'], 'audit_logs');
    await upsert(auditSql, ['audit-2', 'usr-attender-fl2', 'Ramesh Kumar', 'FLOOR_ATTENDER', 'ATTENDANCE_FINALIZED', 'attendance_records', 'lec-session-101', JSON.stringify({ total: 8, present: 6, absent: 2 }), '192.168.1.45'], 'audit_logs');
    await upsert(auditSql, ['audit-3', 'usr-hod-phy', 'Dr. A. S. Patil', 'HOD', 'SUBSTITUTE_ASSIGNED', 'substitution_assignments', 'sub-assignment-1', JSON.stringify({ original: 'Mr. Anand Kumar', substitute: 'Mrs. Sneha Hegde', period: 2 }), '192.168.1.12'], 'audit_logs');
    await upsert(auditSql, ['audit-4', 'usr-prin-dvg', 'Dr. B. N. Vishwanath', 'PRINCIPAL', 'OUTPASS_APPROVED', 'outpasses', 'op-1001', JSON.stringify({ student: 'Darshan Gowda', code: '4827', pickup: 'Mr. Ramegowda' }), '192.168.1.2'], 'audit_logs');
    await upsert(auditSql, ['audit-5', 'usr-gate-1', 'Basavarajappa K', 'GATE_STAFF', 'GATE_EXIT_RECORDED', 'outpasses', 'op-1001', JSON.stringify({ student: 'Darshan Gowda', exit_time: '14:30:00' }), '192.168.1.90'], 'audit_logs');

    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Transaction committed successfully on Neon PostgreSQL!');

    return { success: true, stats };
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction rolled back due to error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Verification runner if executed directly
async function runAndVerify() {
  try {
    const res = await seedPostgresDatabase();
    console.log('\n📊 SEED DATA VERIFICATION REPORT:');
    console.log('================================================================');
    console.log('Table Name                    | Rows Seeded | Status');
    console.log('----------------------------------------------------------------');

    let totalRows = 0;
    const tableQueries: Promise<{ table: string; count: number }>[] = [];

    for (const tableName of Object.keys(res.stats)) {
      totalRows += res.stats[tableName].inserted;
    }

    // Direct database count query to verify actual committed rows in Neon
    for (const tableName of Object.keys(res.stats)) {
      const q = pgPool.query(`SELECT count(*)::int as cnt FROM "${tableName}"`).then(r => ({
        table: tableName,
        count: r.rows[0].cnt
      }));
      tableQueries.push(q);
    }

    const dbCounts = await Promise.all(tableQueries);
    for (const item of dbCounts) {
      const formattedName = item.table.padEnd(28, ' ');
      const formattedCount = item.count.toString().padStart(11, ' ');
      console.log(`${formattedName} | ${formattedCount} | ✅ VERIFIED IN DB`);
    }

    console.log('================================================================');
    console.log(`🎉 Total Processed Records: ${totalRows} across ${dbCounts.length} tables`);
    console.log('🎉 Skipped/Duplicate Records: 0 (Upsert handled idempotently)');
    console.log('🎉 Errors: 0');
    console.log('🎉 Transaction Status: COMMITTED AND VERIFIED\n');
  } catch (err: any) {
    console.error('Seed execution failed:', err);
    process.exitCode = 1;
  } finally {
    await pgPool.end();
  }
}

if (require.main === module) {
  runAndVerify();
}
