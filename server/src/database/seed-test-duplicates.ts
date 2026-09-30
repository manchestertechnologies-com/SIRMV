// Standalone TEST-data generator — 3 extra HODs, 10 extra faculty, and
// 40 extra students (split evenly between hostel and dayscholar), all in
// branch-dvg alongside the existing demo data.
//
// This does NOT touch or replace anything postgres-seed.ts already
// inserted. It only ADDS new rows, every one of them with an id/username/
// employee_id/register_number prefixed "test-"/"TEST-" and a name suffixed
// "(TEST)", so they're unmistakable in every list view and trivial to find
// and remove later — see undo-test-duplicates.sql in this same folder to
// delete everything this script adds, in one shot.
//
// Run with:  npx tsx server/src/database/seed-test-duplicates.ts
// (needs the same DATABASE_URL as the main seed script / server)

import { getClient, pgPool } from './postgres';
import bcrypt from 'bcryptjs';

const BRANCH = 'branch-dvg';
const CLASSES = ['cls-1puc-branch-dvg', 'cls-2puc-branch-dvg'];
const SECTIONS_BY_CLASS: Record<string, string[]> = {
  'cls-1puc-branch-dvg': ['sec-1PUC-A-branch-dvg', 'sec-1PUC-B-branch-dvg', 'sec-1PUC-C-branch-dvg'],
  'cls-2puc-branch-dvg': ['sec-2PUC-A-branch-dvg', 'sec-2PUC-B-branch-dvg', 'sec-2PUC-C-branch-dvg']
};
const BATCHES = ['batch-neet-branch-dvg', 'batch-jee-branch-dvg', 'batch-kcet-branch-dvg', 'batch-reg-branch-dvg'];

// Departments in branch-dvg that DON'T already have an HOD in the base
// seed (phy/chem/math are taken) — safe to give each of these a new test
// HOD without disturbing an existing one.
const HOD_LESS_DEPARTMENTS = [
  { id: 'dept-bio-branch-dvg', code: 'BIO', name: 'Biology' },
  { id: 'dept-cs-branch-dvg', code: 'CS', name: 'Computer Science' },
  { id: 'dept-eng-branch-dvg', code: 'ENG', name: 'English' }
];

// Spread the 10 test faculty across a wider set of departments than the
// 3 new HODs use, so it reads as a real department roster, not just
// padding under 3 departments.
const FACULTY_DEPARTMENTS = [
  { id: 'dept-phy-branch-dvg', code: 'PHY' },
  { id: 'dept-chem-branch-dvg', code: 'CHEM' },
  { id: 'dept-math-branch-dvg', code: 'MATH' },
  { id: 'dept-bio-branch-dvg', code: 'BIO' },
  { id: 'dept-cs-branch-dvg', code: 'CS' },
  { id: 'dept-eng-branch-dvg', code: 'ENG' },
  { id: 'dept-kan-branch-dvg', code: 'KAN' },
  { id: 'dept-elec-branch-dvg', code: 'ELEC' },
  { id: 'dept-sans-branch-dvg', code: 'SANS' },
  { id: 'dept-hin-branch-dvg', code: 'HIN' }
];

const FIRST_NAMES = [
  'Arjun', 'Bhavana', 'Chetan', 'Deepika', 'Eshwar', 'Farida', 'Gagan', 'Harini',
  'Ishaan', 'Jyothi', 'Kavya', 'Lokesh', 'Meghana', 'Nikhil', 'Omkar', 'Pavithra',
  'Qadir', 'Rakshita', 'Sagar', 'Tejaswini', 'Uday', 'Vaishnavi', 'Waseem', 'Yashas',
  'Zara', 'Abhishek', 'Bindu', 'Chandan', 'Divya', 'Ganesh', 'Harsha', 'Indira',
  'Jagadeesh', 'Kavitha', 'Lakshman', 'Madhavi', 'Naveen', 'Ojas', 'Pallavi', 'Raghu',
  'Sahana', 'Tarun', 'Usha', 'Varun', 'Yamini', 'Amogh', 'Bhoomika', 'Chaitra',
  'Dinesh', 'Elavarasi'
];
const LAST_NAMES = [
  'Rao', 'Gowda', 'Hegde', 'Naik', 'Patil', 'Kulkarni', 'Shetty', 'Reddy', 'Iyer',
  'Bhat', 'Nair', 'Desai', 'Kumar', 'Murthy', 'Poojary', 'Shastri', 'Acharya'
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function testName(i: number, seedOffset = 0): string {
  const first = pick(FIRST_NAMES, i + seedOffset);
  const last = pick(LAST_NAMES, i * 3 + seedOffset);
  return `${first} ${last}`;
}

export async function seedTestDuplicates() {
  console.log('🔄 Adding TEST duplicate/sample data (HOD, faculty, students)...');

  const client = await getClient();
  const passwordHash = bcrypt.hashSync('Demo@12345', 10);

  const stats = { hods: 0, faculty: 0, students: 0 };

  try {
    await client.query('BEGIN');

    const userSql = `
      INSERT INTO users (id, branch_id, username, password_hash, role, name, email, phone, avatar_url, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING;
    `;
    const teacherProfileSql = `
      INSERT INTO teacher_profiles (id, user_id, employee_id, photo_url, date_of_birth, phone, email, address, department_id, designation, joining_date, qualification, is_hod)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO NOTHING;
    `;
    const studentProfileSql = `
      INSERT INTO student_profiles (
        id, user_id, branch_id, register_number, name, photo_url, date_of_birth, gender, phone, email,
        address, parent_user_id, parent_name, parent_phone, parent_email, class_id, section_id, batch_id,
        is_hostelite, residence_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      ON CONFLICT (id) DO NOTHING;
    `;

    // --- 3 test HODs -----------------------------------------------------
    for (let i = 0; i < HOD_LESS_DEPARTMENTS.length; i++) {
      const dept = HOD_LESS_DEPARTMENTS[i];
      const name = `${testName(i, 100)} (TEST)`;
      const userId = `test-hod-${dept.code.toLowerCase()}`;
      const empId = `TEST-EMP-${dept.code}-HOD`;
      const username = `test_hod_${dept.code.toLowerCase()}`;
      const email = `${username}@test.sirmv.edu.in`;
      const phone = `97000${(10000 + i).toString().slice(-5)}`;

      await client.query(userSql, [userId, BRANCH, username, passwordHash, 'HOD', name, email, phone, null, 1]);
      await client.query(teacherProfileSql, [
        `test-tp-hod-${dept.code.toLowerCase()}`, userId, empId, null, '1980-01-01', phone, email,
        'Davangere, Karnataka (TEST address)', dept.id, `HOD, ${dept.name} (TEST)`, '2024-06-01', 'M.Sc., Ph.D. (TEST)', 1
      ]);
      await client.query(`UPDATE departments SET hod_user_id = $1 WHERE id = $2`, [userId, dept.id]);
      stats.hods++;
    }

    // --- 10 test faculty ---------------------------------------------------
    for (let i = 0; i < 10; i++) {
      const dept = pick(FACULTY_DEPARTMENTS, i);
      const name = `${testName(i, 200)} (TEST)`;
      const userId = `test-teacher-${String(i + 1).padStart(2, '0')}`;
      const empId = `TEST-EMP-${dept.code}-${String(i + 1).padStart(3, '0')}`;
      const username = `test_teacher_${String(i + 1).padStart(2, '0')}`;
      const email = `${username}@test.sirmv.edu.in`;
      const phone = `97001${(10000 + i).toString().slice(-5)}`;

      await client.query(userSql, [userId, BRANCH, username, passwordHash, 'TEACHER', name, email, phone, null, 1]);
      await client.query(teacherProfileSql, [
        `test-tp-teacher-${String(i + 1).padStart(2, '0')}`, userId, empId, null, '1990-01-01', phone, email,
        'Davangere, Karnataka (TEST address)', dept.id, 'Lecturer (TEST)', '2024-06-01', 'M.Sc. (TEST)', 0
      ]);
      stats.faculty++;
    }

    // --- 40 test students: 20 hostel (RESIDENT) + 20 dayscholar (NON_RESIDENT) ---
    const totalStudents = 40;
    for (let i = 0; i < totalStudents; i++) {
      const isHostel = i < totalStudents / 2; // first half hostel, second half dayscholar
      const cls = pick(CLASSES, i);
      const sections = SECTIONS_BY_CLASS[cls];
      const section = pick(sections, i);
      const batch = pick(BATCHES, i);
      const name = `${testName(i, 300)} (TEST)`;
      const num = String(i + 1).padStart(3, '0');
      const userId = `test-student-${num}`;
      const studentId = `test-sp-${num}`;
      const username = `test_student_${num}`;
      const email = `${username}@test.sirmv.edu.in`;
      const regNumber = `TEST-2026-${num}`;
      const phone = `97002${(10000 + i).toString().slice(-5)}`;
      const gender = i % 2 === 0 ? 'MALE' : 'FEMALE';
      const parentName = `Test Parent of ${testName(i, 300).split(' ')[0]} (TEST)`;
      const parentPhone = `97003${(10000 + i).toString().slice(-5)}`;

      await client.query(userSql, [userId, BRANCH, username, passwordHash, 'STUDENT', name, email, phone, null, 1]);
      await client.query(studentProfileSql, [
        studentId, userId, BRANCH, regNumber, name, null, '2008-01-01', gender, phone, email,
        'Davangere, Karnataka (TEST address)', null, parentName, parentPhone, `${parentPhone}@test.sirmv.edu.in`,
        cls, section, batch, isHostel ? 1 : 0, isHostel ? 'RESIDENT' : 'NON_RESIDENT'
      ]);
      stats.students++;
    }

    await client.query('COMMIT');
    console.log('✅ Test data committed.');
    console.log(`   HODs added:     ${stats.hods}`);
    console.log(`   Faculty added:  ${stats.faculty}`);
    console.log(`   Students added: ${stats.students} (${totalStudents / 2} hostel / ${totalStudents / 2} dayscholar)`);
    console.log('   Every row is tagged "(TEST)" in its name, and every id starts with "test-".');
    console.log('   To remove all of it later, run: psql "$DATABASE_URL" -f server/src/database/undo-test-duplicates.sql');
    return stats;
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Rolled back due to error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedTestDuplicates()
    .catch(() => { process.exitCode = 1; })
    .finally(() => pgPool.end());
}
