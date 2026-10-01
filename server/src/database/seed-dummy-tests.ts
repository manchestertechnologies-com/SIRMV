// Standalone DUMMY test-questions generator.
//
// Tests & Marks has a full question-authoring flow (POST /api/tests,
// POST /api/tests/:id/questions, etc.) but postgres-seed.ts never actually
// seeds any tests, so the feature looks empty for every role until a
// teacher creates one by hand. This script creates one ONLINE test with 5
// MCQ questions for every real class/batch combination that has at least
// one enrolled student (per branch), so students immediately have
// something to attend in Tests & Marks and teachers/HODs have something
// to review.
//
// Idempotent: every id is deterministic and every insert is
// ON CONFLICT DO NOTHING, so re-running this is harmless.
//
// Run with:  npx tsx server/src/database/seed-dummy-tests.ts
// (needs the same DATABASE_URL as the main seed script / server)

import { getClient, pgPool } from './postgres';

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// A small bank of general-knowledge-ish Physics/Chemistry/Maths questions so
// the test reads as real content rather than "Dummy question 1, 2, 3...".
const QUESTION_BANK: Array<{ q: string; a: string; b: string; c: string; d: string; correct: 'A' | 'B' | 'C' | 'D' }> = [
  { q: 'What is the SI unit of electric current?', a: 'Volt', b: 'Ampere', c: 'Ohm', d: 'Watt', correct: 'B' },
  { q: 'Which law states that force equals mass times acceleration?', a: "Newton's First Law", b: "Newton's Second Law", c: "Newton's Third Law", d: "Law of Gravitation", correct: 'B' },
  { q: 'What is the chemical symbol for Sodium?', a: 'So', b: 'Sd', c: 'Na', d: 'S', correct: 'C' },
  { q: 'What is the value of acceleration due to gravity on Earth (approx.)?', a: '6.8 m/s²', b: '8.9 m/s²', c: '9.8 m/s²', d: '10.8 m/s²', correct: 'C' },
  { q: 'Which gas is most abundant in Earth\'s atmosphere?', a: 'Oxygen', b: 'Nitrogen', c: 'Carbon Dioxide', d: 'Argon', correct: 'B' },
  { q: 'What is the derivative of x² with respect to x?', a: 'x', b: '2x', c: 'x²', d: '2', correct: 'B' },
  { q: 'What is the pH value of pure water at 25°C?', a: '0', b: '14', c: '7', d: '1', correct: 'C' },
  { q: 'Which organelle is known as the "powerhouse of the cell"?', a: 'Nucleus', b: 'Ribosome', c: 'Mitochondria', d: 'Golgi Body', correct: 'C' }
];

export async function seedDummyTests() {
  console.log('🔄 Generating DUMMY ONLINE tests with questions for every class/batch missing one...');

  const client = await getClient();
  const stats = { testsCreated: 0, questionsCreated: 0, combosSkipped: 0 };

  try {
    await client.query('BEGIN');

    const branches = (await client.query(`SELECT id FROM branches ORDER BY id`)).rows as { id: string }[];

    for (const { id: branchId } of branches) {
      const combosRes = await client.query(
        `SELECT DISTINCT class_id, batch_id
         FROM student_profiles
         WHERE branch_id = $1 AND class_id IS NOT NULL AND batch_id IS NOT NULL`,
        [branchId]
      );
      if (combosRes.rows.length === 0) continue;

      // A Physics subject exists identically in every branch — use it as the
      // default dummy-test subject (teachers/HODs can add more via the UI).
      const subjectRes = await client.query(
        `SELECT s.id, s.name FROM subjects s JOIN departments d ON s.department_id = d.id WHERE d.branch_id = $1 AND d.code = 'PHY' LIMIT 1`,
        [branchId]
      );
      const subject = subjectRes.rows[0] as { id: string; name: string } | undefined;
      if (!subject) continue;

      // Whoever can author a test in this branch (TEACHER/HOD/PRINCIPAL/ADMIN).
      const authorRes = await client.query(
        `SELECT id FROM users WHERE branch_id = $1 AND role IN ('TEACHER','HOD','PRINCIPAL','ADMIN') ORDER BY role LIMIT 1`,
        [branchId]
      );
      const createdBy = (authorRes.rows[0] as { id: string } | undefined)?.id || null;

      for (const combo of combosRes.rows as { class_id: string; batch_id: string }[]) {
        const comboSlug = `${slug(combo.class_id)}-${slug(combo.batch_id)}`;
        const testId = `test-dummy-${comboSlug}`;

        const existing = await client.query(`SELECT 1 FROM tests WHERE id = $1`, [testId]);
        if ((existing.rowCount || 0) > 0) {
          stats.combosSkipped++;
          continue;
        }

        await client.query(
          `INSERT INTO tests (id, branch_id, title, mode, class_id, batch_id, subject_id, scheduled_date, start_time, duration_minutes, total_marks, status, created_by)
           VALUES ($1,$2,$3,'ONLINE',$4,$5,$6,$7,'10:00',30,$8,'SCHEDULED',$9)
           ON CONFLICT (id) DO NOTHING`,
          [testId, branchId, `${subject.name} — Practice Test (DUMMY)`, combo.class_id, combo.batch_id, subject.id, tomorrow(), QUESTION_BANK.length, createdBy]
        );
        stats.testsCreated++;

        for (let i = 0; i < QUESTION_BANK.length; i++) {
          const ques = QUESTION_BANK[i];
          const qid = `${testId}-q${i + 1}`;
          await client.query(
            `INSERT INTO test_questions (id, test_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1,$9)
             ON CONFLICT (id) DO NOTHING`,
            [qid, testId, ques.q, ques.a, ques.b, ques.c, ques.d, ques.correct, i]
          );
          stats.questionsCreated++;
        }
      }
    }

    await client.query('COMMIT');
    console.log('✅ Dummy test generation committed.');
    console.log(`   Tests created: ${stats.testsCreated}`);
    console.log(`   Questions created: ${stats.questionsCreated}`);
    console.log(`   Class/batch combos that already had a dummy test (left alone): ${stats.combosSkipped}`);
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
  seedDummyTests()
    .catch(() => { process.exitCode = 1; })
    .finally(() => pgPool.end());
}
