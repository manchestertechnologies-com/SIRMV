// Repurposes REAL, already-existing student / faculty / HOD accounts as the
// login-preset "demo" accounts, instead of the app continuing to use the
// original seed personas (Rahul Sharma, Mr. Anand Kumar, Dr. A. S. Patil).
//
// This does NOT create any new user. For each of the three roles it:
//   1. Finds one real, independently-added account for that role — i.e. one
//      created through the app's own "Add Student" / "Add Teacher" forms
//      (their ids look like usr-student-<uuid> / usr-<uuid>, unlike the
//      seed's short hand-written ids like usr-student-rahul or the test-
//      duplicate seed's test-student-001 — both are automatically excluded).
//   2. "Vacates" whichever account currently holds the demo username (e.g.
//      student.demo@college.test) by renaming IT to a harmless placeholder
//      username (<its own id>@sirmv.edu.in). Nothing about that account is
//      deleted — it keeps all its data, it just won't be reachable by the
//      old demo login string any more.
//   3. Gives the real account that demo username/email and the known demo
//      password (Demo@12345), so the login-preset dropdown now signs in as
//      an actual real student / faculty / HOD.
//
// If no independently-added real account exists yet for a role (e.g. no
// teacher has ever been promoted to HOD outside of the original 3 seeded
// department heads), that role is left untouched and reported as skipped —
// nothing is guessed or invented.
//
// A revert script with the EXACT values captured at runtime is written next
// to this file (generated-revert-demo-logins.sql) so this can be undone.
//
// Run with:  npx tsx server/src/database/convert-real-accounts-to-demo-logins.ts
// (needs the same DATABASE_URL as the main seed script / server)

import fs from 'fs';
import path from 'path';
import { getClient, pgPool } from './postgres';
import bcrypt from 'bcryptjs';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const DEMO_PASSWORD = 'Demo@12345';

interface RoleTarget {
  label: string;
  demoUsername: string;
  demoEmail: string;
  /** Finds the id of one real (non-seed, non-test) account for this role, or null. */
  findRealUserId: (client: any) => Promise<string | null>;
}

const ROLE_TARGETS: RoleTarget[] = [
  {
    label: 'Student',
    demoUsername: 'student.demo@college.test',
    demoEmail: 'student.demo@college.test',
    findRealUserId: async (client) => {
      const { rows } = await client.query(
        `SELECT u.id FROM users u
         JOIN student_profiles sp ON sp.user_id = u.id
         WHERE u.role = 'STUDENT' AND u.id ~* $1
         ORDER BY u.created_at DESC LIMIT 1`,
        [`^usr-student-${UUID}$`]
      );
      return rows[0]?.id ?? null;
    }
  },
  {
    label: 'Faculty (Teacher)',
    demoUsername: 'teacher.demo@college.test',
    demoEmail: 'teacher.demo@college.test',
    findRealUserId: async (client) => {
      const { rows } = await client.query(
        `SELECT u.id FROM users u
         JOIN teacher_profiles tp ON tp.user_id = u.id
         WHERE u.role = 'TEACHER' AND COALESCE(tp.is_hod, 0) = 0 AND u.id ~* $1
         ORDER BY u.created_at DESC LIMIT 1`,
        [`^usr-${UUID}$`]
      );
      return rows[0]?.id ?? null;
    }
  },
  {
    label: 'HOD',
    demoUsername: 'hod.demo@college.test',
    demoEmail: 'hod.demo@college.test',
    findRealUserId: async (client) => {
      // There is currently no in-app flow that promotes a real teacher to
      // HOD, so the "real, currently-assigned" HOD is simply whoever the
      // Physics department actually points at right now (a live, real
      // business fact — not seed data being reused for convenience).
      const { rows } = await client.query(
        `SELECT hod_user_id FROM departments WHERE id = 'dept-phy-branch-dvg'`
      );
      return rows[0]?.hod_user_id ?? null;
    }
  }
];

async function convertOne(client: any, target: RoleTarget, passwordHash: string, revertLines: string[]) {
  const realUserId = await target.findRealUserId(client);
  if (!realUserId) {
    console.log(`⏭️  ${target.label}: no independently-added real account found — left untouched.`);
    return;
  }

  const { rows: holderRows } = await client.query(
    `SELECT id, username, email FROM users WHERE username = $1`,
    [target.demoUsername]
  );
  const holder = holderRows[0];

  const { rows: realRows } = await client.query(
    `SELECT id, username, email, name FROM users WHERE id = $1`,
    [realUserId]
  );
  const real = realRows[0];
  if (!real) {
    console.log(`⏭️  ${target.label}: candidate id ${realUserId} vanished mid-run — skipped.`);
    return;
  }

  if (holder && holder.id === realUserId) {
    // The real account already owns the demo username (script run before) —
    // just make sure the password is the known demo one.
    await client.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, realUserId]);
    console.log(`✅ ${target.label}: "${real.name}" (${realUserId}) already uses ${target.demoUsername} — password reset to ${DEMO_PASSWORD}.`);
    return;
  }

  if (holder) {
    const vacatedIdentifier = `${holder.id}@sirmv.edu.in`;
    await client.query(`UPDATE users SET username = $1, email = $2 WHERE id = $3`, [vacatedIdentifier, vacatedIdentifier, holder.id]);
    revertLines.push(
      `-- ${target.label}: restore the account that used to hold ${target.demoUsername}`,
      `UPDATE users SET username = '${holder.username.replace(/'/g, "''")}', email = ${holder.email ? `'${holder.email.replace(/'/g, "''")}'` : 'NULL'} WHERE id = '${holder.id}';`
    );
  }

  await client.query(
    `UPDATE users SET username = $1, email = $2, password_hash = $3 WHERE id = $4`,
    [target.demoUsername, target.demoEmail, passwordHash, realUserId]
  );
  revertLines.push(
    `-- ${target.label}: restore the real account's original login`,
    `UPDATE users SET username = '${real.username.replace(/'/g, "''")}', email = ${real.email ? `'${real.email.replace(/'/g, "''")}'` : 'NULL'} WHERE id = '${real.id}';`,
    `-- (original password_hash for ${real.id} was NOT captured — it cannot be restored; that person will need a password reset if you revert)`,
    ''
  );

  console.log(`✅ ${target.label}: "${real.name}" (${realUserId}) is now the demo login — ${target.demoUsername} / ${DEMO_PASSWORD}.`);
  if (holder) {
    console.log(`   (previous holder ${holder.id} kept, renamed to ${holder.id}@sirmv.edu.in)`);
  }
}

export async function convertRealAccountsToDemoLogins() {
  console.log('🔄 Repurposing real existing accounts as demo logins...');
  const client = await getClient();
  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const revertLines: string[] = [
    '-- Auto-generated revert script for convert-real-accounts-to-demo-logins.ts',
    `-- Generated ${new Date().toISOString()}`,
    '-- Run with: psql "$DATABASE_URL" -f server/src/database/generated-revert-demo-logins.sql',
    ''
  ];

  try {
    await client.query('BEGIN');
    for (const target of ROLE_TARGETS) {
      await convertOne(client, target, passwordHash, revertLines);
    }
    await client.query('COMMIT');

    const outPath = path.join(__dirname, 'generated-revert-demo-logins.sql');
    if (revertLines.length > 4) {
      fs.writeFileSync(outPath, revertLines.join('\n') + '\n', 'utf8');
      console.log(`📝 Revert script written to ${outPath}`);
    } else {
      console.log('📝 Nothing was changed, so no revert script was needed.');
    }
    console.log('✅ Done.');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Rolled back due to error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  convertRealAccountsToDemoLogins()
    .catch(() => { process.exitCode = 1; })
    .finally(() => pgPool.end());
}
