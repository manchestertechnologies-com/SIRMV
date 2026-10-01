// Standalone DUMMY timetable generator.
//
// The main seed (postgres-seed.ts) only ever wrote a handful of
// timetable_entries rows for branch-dvg (1PUC-A/2PUC-A/2PUC-B only), so
// most real class/section/batch combinations across every branch have an
// empty "My Timetable" / "Institutional Timetable — All Classes" screen.
//
// This script looks at the REAL class/section/batch combinations that
// students are actually enrolled in (per branch_id, from student_profiles),
// and for any combination that has no timetable_entries yet, generates a
// simple Mon-Sat lecture grid cycling through that branch's existing
// subjects, rooms and teachers. It never touches a combination that
// already has entries (e.g. the ones postgres-seed.ts already wrote), and
// every insert is ON CONFLICT DO NOTHING / idempotent, so running this
// more than once is harmless.
//
// If a branch has no teacher_profiles at all yet (e.g. a brand-new branch
// with only a Principal account seeded), this script creates one fallback
// "Visiting Faculty (DUMMY)" teacher tied to that branch's Physics
// department so the generated periods have a valid teacher_id — look for
// the "(DUMMY)" tag in Staff & Faculty Directory if you want to replace it
// with a real hire later.
//
// Run with:  npx tsx server/src/database/seed-dummy-timetable.ts
// (needs the same DATABASE_URL as the main seed script / server)

import { getClient, pgPool } from './postgres';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ABBR: Record<string, string> = {
  Monday: 'mon', Tuesday: 'tue', Wednesday: 'wed', Thursday: 'thu', Friday: 'fri', Saturday: 'sat'
};
const PERIODS: Array<{ n: number; start: string; end: string }> = [
  { n: 1, start: '08:45', end: '09:30' },
  { n: 2, start: '09:30', end: '10:15' },
  { n: 3, start: '10:30', end: '11:15' },
  { n: 4, start: '11:15', end: '12:00' },
  { n: 5, start: '12:45', end: '13:30' }
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

// ids are VARCHAR(64), and class/section/batch ids are already long
// (e.g. "sec-1PUC-A-branch-dvg"), so a readable concatenation easily blows
// past 64 characters. A short deterministic hash keeps ids compact while
// staying stable across re-runs (so ON CONFLICT DO NOTHING still matches).
function shortHash(s: string): string {
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
}

export async function seedDummyTimetable() {
  console.log('🔄 Generating DUMMY timetable entries for any class/section/batch missing one...');

  const client = await getClient();
  const passwordHash = bcrypt.hashSync('Demo@12345', 10);
  const stats = { combosSeeded: 0, entriesInserted: 0, fallbackTeachersCreated: 0, combosSkipped: 0 };

  try {
    await client.query('BEGIN');

    const branches = (await client.query(`SELECT id FROM branches ORDER BY id`)).rows as { id: string }[];

    for (const { id: branchId } of branches) {
      // Real combinations students are actually enrolled in for this branch.
      const combosRes = await client.query(
        `SELECT DISTINCT class_id, section_id, batch_id
         FROM student_profiles
         WHERE branch_id = $1 AND class_id IS NOT NULL AND section_id IS NOT NULL AND batch_id IS NOT NULL`,
        [branchId]
      );
      if (combosRes.rows.length === 0) continue;

      // Branch-wide subjects and rooms (seeded identically for every branch).
      const subjectsRes = await client.query(
        `SELECT s.id, s.name FROM subjects s JOIN departments d ON s.department_id = d.id WHERE d.branch_id = $1 ORDER BY s.id`,
        [branchId]
      );
      const roomsRes = await client.query(
        `SELECT id FROM rooms WHERE branch_id = $1 ORDER BY room_number`,
        [branchId]
      );
      if (subjectsRes.rows.length === 0 || roomsRes.rows.length === 0) continue;
      const subjects = subjectsRes.rows as { id: string; name: string }[];
      const rooms = (roomsRes.rows as { id: string }[]).map((r) => r.id);

      // Teachers already on staff in this branch.
      let teachersRes = await client.query(
        `SELECT tp.id FROM teacher_profiles tp JOIN departments d ON tp.department_id = d.id WHERE d.branch_id = $1 ORDER BY tp.id`,
        [branchId]
      );
      let teacherIds = (teachersRes.rows as { id: string }[]).map((t) => t.id);

      if (teacherIds.length === 0) {
        // No staff on record for this branch yet — create one fallback
        // teacher so the generated timetable has a valid teacher_id.
        const physDept = await client.query(
          `SELECT id FROM departments WHERE branch_id = $1 AND code = 'PHY' LIMIT 1`,
          [branchId]
        );
        const deptId = physDept.rows[0]?.id;
        if (!deptId) continue; // shouldn't happen — every branch gets a Physics dept

        const userId = `dummy-teacher-${branchId}`;
        const tpId = `dummy-tp-${branchId}`;
        const username = `dummy_faculty_${branchId.replace(/^branch-/, '')}`;
        const email = `${username}@dummy.sirmv.edu.in`;
        await client.query(
          `INSERT INTO users (id, branch_id, username, password_hash, role, name, email, phone, avatar_url, is_active)
           VALUES ($1,$2,$3,$4,'TEACHER',$5,$6,$7,NULL,1) ON CONFLICT (id) DO NOTHING`,
          [userId, branchId, username, passwordHash, 'Visiting Faculty (DUMMY)', email, '9800000000']
        );
        await client.query(
          `INSERT INTO teacher_profiles (id, user_id, employee_id, photo_url, date_of_birth, phone, email, address, department_id, designation, joining_date, qualification, is_hod)
           VALUES ($1,$2,$3,NULL,'1990-01-01',$4,$5,$6,$7,'Visiting Faculty (DUMMY)','2026-06-01','M.Sc. (DUMMY)',0)
           ON CONFLICT (id) DO NOTHING`,
          [tpId, userId, `DUMMY-EMP-${branchId}`, '9800000000', email, 'Not on file (DUMMY)', deptId]
        );
        teacherIds = [tpId];
        stats.fallbackTeachersCreated++;
      }

      for (const combo of combosRes.rows as { class_id: string; section_id: string; batch_id: string }[]) {
        const existing = await client.query(
          `SELECT 1 FROM timetable_entries WHERE class_id = $1 AND section_id = $2 AND batch_id = $3 LIMIT 1`,
          [combo.class_id, combo.section_id, combo.batch_id]
        );
        if ((existing.rowCount || 0) > 0) {
          stats.combosSkipped++;
          continue; // already has a timetable (hand-seeded or generated)
        }

        const comboHash = shortHash(`${combo.class_id}|${combo.section_id}|${combo.batch_id}`);
        let seq = 0;
        for (const day of DAYS) {
          for (const period of PERIODS) {
            const subject = pick(subjects, seq);
            const room = pick(rooms, seq + period.n);
            const teacher = pick(teacherIds, seq + period.n * 2);
            const id = `tt-dum-${comboHash}-${DAY_ABBR[day]}-p${period.n}`;

            await client.query(
              `INSERT INTO timetable_entries (id, branch_id, day_of_week, period_number, start_time, end_time, subject_id, class_id, section_id, batch_id, room_id, teacher_id)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
               ON CONFLICT (id) DO NOTHING`,
              [id, branchId, day, period.n, period.start, period.end, subject.id, combo.class_id, combo.section_id, combo.batch_id, room, teacher]
            );
            stats.entriesInserted++;
            seq++;
          }
        }
        stats.combosSeeded++;
      }
    }

    await client.query('COMMIT');
    console.log('✅ Dummy timetable generation committed.');
    console.log(`   Class/section/batch combos newly seeded: ${stats.combosSeeded}`);
    console.log(`   Combos already had a timetable (left alone): ${stats.combosSkipped}`);
    console.log(`   Timetable entries inserted: ${stats.entriesInserted}`);
    console.log(`   Fallback "(DUMMY)" teachers created: ${stats.fallbackTeachersCreated}`);
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
  seedDummyTimetable()
    .catch(() => { process.exitCode = 1; })
    .finally(() => pgPool.end());
}
