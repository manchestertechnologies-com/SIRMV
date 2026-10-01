// READ-ONLY diagnostic — makes no changes. Prints exactly what's live in
// the production database so we can stop guessing about why the admin
// dashboard only shows 1 student: how many students exist per branch,
// and what branch_id the demo accounts actually have right now.
//
// Run with:  npx tsx server/src/database/diagnose-student-visibility.ts
// (needs the same DATABASE_URL as the server/seed scripts)

import { pgPool } from './postgres';

async function main() {
  console.log('=== Branches ===');
  const branches = await pgPool.query(`SELECT id, name, code FROM branches ORDER BY id`);
  console.table(branches.rows);

  console.log('\n=== Student count per branch ===');
  const counts = await pgPool.query(`
    SELECT branch_id, COUNT(*) AS student_count
    FROM student_profiles
    GROUP BY branch_id
    ORDER BY branch_id
  `);
  console.table(counts.rows);

  console.log('\n=== Student count per branch, test-duplicate rows only (id LIKE test-sp-%) ===');
  const testCounts = await pgPool.query(`
    SELECT branch_id, COUNT(*) AS test_student_count
    FROM student_profiles
    WHERE id LIKE 'test-sp-%'
    GROUP BY branch_id
    ORDER BY branch_id
  `);
  console.table(testCounts.rows);

  console.log('\n=== Key login accounts: id, username, role, branch_id ===');
  const accounts = await pgPool.query(`
    SELECT id, username, role, branch_id, is_active
    FROM users
    WHERE username IN (
      'admin.demo@college.test', 'principal.demo@college.test', 'hod.demo@college.test',
      'teacher.demo@college.test', 'student.demo@college.test', 'parent.demo@college.test'
    )
    ORDER BY username
  `);
  console.table(accounts.rows);

  console.log('\nIf "admin.demo@college.test" above has branch_id = branch-smg instead of');
  console.log('branch-dvg, that IS the bug (and is a data issue, not a code issue) — the');
  console.log('admin account itself is scoped to Shivamogga, so correctly seeing only');
  console.log('Shivamogga\'s 1 student is not a bug, it is this account\'s actual branch.');
}

main()
  .catch((err) => {
    console.error('❌ Error:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pgPool.end());
