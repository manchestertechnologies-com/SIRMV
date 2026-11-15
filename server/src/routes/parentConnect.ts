import { Router, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, execute } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { sendPushToUser } from '../services/pushService';

/**
 * Parent Connect: private student <-> parent internet voice calls.
 * Audio is peer-to-peer WebRTC; this router only does signalling, so it works on a
 * serverless host (clients poll instead of holding a socket open). Who may call whom
 * comes from student_profiles (user_id <-> parent_user_id), never from the client.
 */
export const parentConnectRouter = Router();

const ADMIN_ROLES = ['ADMIN', 'PRINCIPAL', 'HEAD_WARDEN', 'WARDEN'];
const RING_SECONDS = 45;
const isAdmin = (role: string) => ADMIN_ROLES.includes(role);

// ---------- tables (created on first use, so a fresh database just works) ----------
let ready: Promise<void> | null = null;
function ensureTables(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await execute(`CREATE TABLE IF NOT EXISTS pc_schedule (
        day_of_week INTEGER PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),
        start_time VARCHAR(5) NOT NULL DEFAULT '06:00',
        end_time VARCHAR(5) NOT NULL DEFAULT '22:00',
        max_duration_minutes INTEGER NOT NULL DEFAULT 15,
        is_active INTEGER NOT NULL DEFAULT 1
      )`);
      await execute(`CREATE TABLE IF NOT EXISTS pc_calls (
        id VARCHAR(64) PRIMARY KEY,
        student_user_id VARCHAR(64) NOT NULL,
        parent_user_id VARCHAR(64) NOT NULL,
        caller_user_id VARCHAR(64) NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'ringing',
        initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        started_at TIMESTAMPTZ,
        ended_at TIMESTAMPTZ,
        duration_seconds INTEGER DEFAULT 0,
        end_reason VARCHAR(64)
      )`);
      await execute(`CREATE TABLE IF NOT EXISTS pc_signals (
        id BIGSERIAL PRIMARY KEY,
        call_id VARCHAR(64) NOT NULL,
        to_user_id VARCHAR(64) NOT NULL,
        type VARCHAR(16) NOT NULL,
        payload TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
      await execute(`CREATE TABLE IF NOT EXISTS pc_blocked (student_user_id VARCHAR(64) PRIMARY KEY, reason TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`);
      await execute(`CREATE INDEX IF NOT EXISTS idx_pc_signals_to ON pc_signals(to_user_id, id)`);
      await execute(`CREATE INDEX IF NOT EXISTS idx_pc_calls_users ON pc_calls(student_user_id, parent_user_id)`);
      const n = await queryOne<{ c: string }>(`SELECT COUNT(*) AS c FROM pc_schedule`);
      if (Number(n?.c || 0) === 0) {
        for (let d = 0; d < 7; d++) await execute(`INSERT INTO pc_schedule (day_of_week) VALUES ($1) ON CONFLICT DO NOTHING`, [d]);
      }
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}
parentConnectRouter.use(async (_req, res, next) => {
  try { await ensureTables(); next(); } catch (e: any) { res.status(500).json({ error: `Parent Connect setup failed: ${e.message}` }); }
});

// ---------- helpers ----------
const clean = (n?: string | null) => (n || '').replace(/\s*\((Student|Parent)\)\s*$/i, '').trim();

interface Pair { student_user_id: string; parent_user_id: string; student_name: string; parent_name: string; register_number: string; student_avatar: string | null; parent_avatar: string | null; gender: string | null; date_of_birth: string | null; class_name: string | null; section_name: string | null; student_profile_id: string; is_hostelite: number }

const PAIR_SQL = `
  SELECT sp.id AS student_profile_id, sp.user_id AS student_user_id, sp.parent_user_id, sp.name AS student_name,
         COALESCE(pu.name, sp.parent_name) AS parent_name, sp.register_number, sp.gender, sp.date_of_birth, sp.is_hostelite,
         COALESCE(sp.photo_url, su.avatar_url) AS student_avatar, pu.avatar_url AS parent_avatar,
         c.name AS class_name, s.name AS section_name
  FROM student_profiles sp
  JOIN users su ON su.id = sp.user_id AND su.is_active = 1
  JOIN users pu ON pu.id = sp.parent_user_id AND pu.is_active = 1
  LEFT JOIN classes c ON c.id = sp.class_id
  LEFT JOIN sections s ON s.id = sp.section_id
  WHERE sp.is_active = 1`;

async function pairsFor(user: { id: string; role: string }): Promise<Pair[]> {
  if (user.role === 'STUDENT') return query<Pair>(`${PAIR_SQL} AND sp.user_id = $1`, [user.id]);
  if (user.role === 'PARENT') return query<Pair>(`${PAIR_SQL} AND sp.parent_user_id = $1`, [user.id]);
  if (isAdmin(user.role)) return query<Pair>(`${PAIR_SQL} ORDER BY sp.name`);
  return [];
}

const nowInKolkata = () => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, hhmm: `${get('hour')}:${get('minute')}` };
};

async function availability() {
  const { day, hhmm } = nowInKolkata();
  const row = await queryOne<any>(`SELECT * FROM pc_schedule WHERE day_of_week = $1`, [day]);
  if (!row || !row.is_active) return { isAllowed: false, reason: 'Calling is switched off today by the hostel.', schedule: row };
  if (hhmm < row.start_time || hhmm > row.end_time) return { isAllowed: false, reason: `Calls are allowed between ${row.start_time} and ${row.end_time}.`, schedule: row };
  return { isAllowed: true, reason: null, schedule: row };
}

// close calls that rang too long or ran past the time limit
async function housekeeping() {
  await execute(`UPDATE pc_calls SET status = 'missed', ended_at = NOW(), end_reason = 'no_answer'
                 WHERE status = 'ringing' AND initiated_at < NOW() - ($1 || ' seconds')::interval`, [String(RING_SECONDS)]);
  const over = await query<{ id: string; student_user_id: string; parent_user_id: string }>(
    `SELECT c.id, c.student_user_id, c.parent_user_id FROM pc_calls c
     WHERE c.status = 'connected' AND c.started_at + (COALESCE((SELECT max_duration_minutes FROM pc_schedule WHERE day_of_week = EXTRACT(DOW FROM c.started_at AT TIME ZONE 'Asia/Kolkata')::int), 15) || ' minutes')::interval < NOW()`);
  for (const c of over) await endCall(c.id, 'max_duration_exceeded');
}

async function endCall(id: string, reason: string) {
  await execute(
    `UPDATE pc_calls SET status = CASE WHEN status = 'connected' THEN 'ended' WHEN status = 'ringing' THEN $2 ELSE status END,
       ended_at = NOW(), end_reason = $3,
       duration_seconds = CASE WHEN started_at IS NOT NULL THEN LEAST(GREATEST(0, EXTRACT(EPOCH FROM (NOW() - started_at))::int), COALESCE((SELECT max_duration_minutes FROM pc_schedule WHERE day_of_week = EXTRACT(DOW FROM started_at AT TIME ZONE 'Asia/Kolkata')::int), 15) * 60) ELSE 0 END
     WHERE id = $1 AND status IN ('ringing', 'connected')`,
    [id, reason === 'rejected' ? 'rejected' : 'missed', reason]
  );
}

const shapeCall = (c: any, meId: string) => c && ({
  id: c.id, status: c.status, startedAt: c.started_at, initiatedAt: c.initiated_at, endReason: c.end_reason, durationSeconds: c.duration_seconds,
  isIncoming: c.caller_user_id !== meId,
  peerUserId: c.student_user_id === meId ? c.parent_user_id : c.student_user_id,
});

// ---------- who can I call ----------
parentConnectRouter.get('/contacts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!;
    const pairs = await pairsFor(me);
    const blocked = new Set((await query<{ student_user_id: string }>(`SELECT student_user_id FROM pc_blocked`)).map((b) => b.student_user_id));
    const contacts = pairs.map((p) => {
      const iAmStudent = me.role === 'STUDENT';
      return {
        pairKey: `${p.student_user_id}:${p.parent_user_id}`,
        userId: iAmStudent ? p.parent_user_id : p.student_user_id,
        name: clean(iAmStudent ? p.parent_name : p.student_name),
        role: iAmStudent ? 'PARENT' : 'STUDENT',
        gender: iAmStudent ? null : p.gender,
        avatarUrl: iAmStudent ? p.parent_avatar : p.student_avatar,
        relationship: iAmStudent ? 'Parent' : 'Your ward',
        registerNumber: p.register_number,
        studentName: clean(p.student_name), parentName: clean(p.parent_name),
        studentUserId: p.student_user_id, parentUserId: p.parent_user_id,
        studentAvatar: p.student_avatar, parentAvatar: p.parent_avatar,
        studentGender: p.gender, dob: p.date_of_birth,
        classLabel: [p.class_name, p.section_name].filter(Boolean).join(' · '),
        hostelite: !!p.is_hostelite,
        blocked: blocked.has(p.student_user_id),
      };
    });
    return res.json({ contacts });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

parentConnectRouter.get('/availability', authenticate, async (_req, res: Response) => {
  try { return res.json(await availability()); } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

// ---------- history ----------
parentConnectRouter.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!;
    const where = me.role === 'STUDENT' ? `c.student_user_id = $1` : me.role === 'PARENT' ? `c.parent_user_id = $1` : isAdmin(me.role) ? `$1 = $1` : `1 = 0`;
    const rows = await query<any>(
      `SELECT c.*, su.name AS student_name, pu.name AS parent_name FROM pc_calls c
       JOIN users su ON su.id = c.student_user_id JOIN users pu ON pu.id = c.parent_user_id
       WHERE ${where} ORDER BY c.initiated_at DESC LIMIT 100`, [me.id]);
    return res.json({ history: rows.map((r) => ({ ...r, student_name: clean(r.student_name), parent_name: clean(r.parent_name), direction: r.caller_user_id === me.id ? 'out' : 'in' })) });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

// ---------- placing / answering / ending a call ----------
parentConnectRouter.post('/calls', authenticate, requireRoles('STUDENT', 'PARENT'), async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!;
    const { to_user_id } = req.body || {};
    if (!to_user_id) return res.status(400).json({ error: 'to_user_id is required.' });
    const studentId = me.role === 'STUDENT' ? me.id : to_user_id;
    const parentId = me.role === 'PARENT' ? me.id : to_user_id;
    const link = await queryOne(`SELECT 1 FROM student_profiles WHERE user_id = $1 AND parent_user_id = $2 AND is_active = 1`, [studentId, parentId]);
    if (!link) return res.status(400).json({ error: 'Unauthorized call: this student and parent are not linked.' });
    if (await queryOne(`SELECT 1 FROM pc_blocked WHERE student_user_id = $1`, [studentId])) return res.status(403).json({ error: 'Calling is switched off for this student by the hostel.' });
    const av = await availability();
    if (!av.isAllowed) return res.status(403).json({ error: av.reason });
    await housekeeping();
    const busy = await queryOne(`SELECT 1 FROM pc_calls WHERE status IN ('ringing','connected') AND (student_user_id IN ($1,$2) OR parent_user_id IN ($1,$2))`, [studentId, parentId]);
    if (busy) return res.status(409).json({ error: 'One of you is already on a call. Try again in a moment.' });
    const id = crypto.randomUUID();
    await execute(`INSERT INTO pc_calls (id, student_user_id, parent_user_id, caller_user_id) VALUES ($1,$2,$3,$4)`, [id, studentId, parentId, me.id]);
    // ring the other person's phone/browser even if the app is closed (best effort)
    sendPushToUser(to_user_id, { title: 'Incoming call', body: `${clean(me.name)} is calling you on Parent Connect`, data: { type: 'system', id } }).catch(() => {});
    return res.json({ callId: id, maxDurationMinutes: av.schedule?.max_duration_minutes ?? 15 });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

async function myCall(req: AuthRequest, res: Response) {
  const c = await queryOne<any>(`SELECT * FROM pc_calls WHERE id = $1`, [req.params.id]);
  const me = req.user!;
  if (!c || (c.student_user_id !== me.id && c.parent_user_id !== me.id && !isAdmin(me.role))) { res.status(404).json({ error: 'Call not found.' }); return null; }
  return c;
}

parentConnectRouter.post('/calls/:id/accept', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const c = await myCall(req, res); if (!c) return;
    if (c.caller_user_id === req.user!.id) return res.status(400).json({ error: 'You cannot answer your own call.' });
    const n = await execute(`UPDATE pc_calls SET status = 'connected', started_at = NOW() WHERE id = $1 AND status = 'ringing'`, [c.id]);
    if (!n) return res.status(409).json({ error: 'This call is no longer ringing.' });
    await execute(`INSERT INTO pc_signals (call_id, to_user_id, type, payload) VALUES ($1,$2,'accepted',NULL)`, [c.id, c.caller_user_id]);
    return res.json({ success: true });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

parentConnectRouter.post('/calls/:id/reject', authenticate, async (req: AuthRequest, res: Response) => {
  try { const c = await myCall(req, res); if (!c) return; await endCall(c.id, 'rejected'); return res.json({ success: true }); }
  catch (e: any) { return res.status(500).json({ error: e.message }); }
});

parentConnectRouter.post('/calls/:id/end', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const c = await myCall(req, res); if (!c) return;
    const me = req.user!;
    const reason = isAdmin(me.role) && c.student_user_id !== me.id && c.parent_user_id !== me.id ? 'ended_by_admin' : (c.status === 'ringing' && c.caller_user_id === me.id ? 'cancelled' : 'hangup');
    await endCall(c.id, reason);
    if (reason === 'ended_by_admin') await logAudit(req, 'PARENT_CONNECT_CALL_ENDED', 'pc_calls', c.id, {});
    return res.json({ success: true });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

parentConnectRouter.post('/calls/:id/signal', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const c = await myCall(req, res); if (!c) return;
    const me = req.user!;
    if (c.student_user_id !== me.id && c.parent_user_id !== me.id) return res.status(403).json({ error: 'Not your call.' });
    const { type, payload } = req.body || {};
    if (!['offer', 'answer', 'ice'].includes(type)) return res.status(400).json({ error: 'Bad signal type.' });
    if (!['ringing', 'connected'].includes(c.status)) return res.status(409).json({ error: 'Call is over.' });
    const to = c.student_user_id === me.id ? c.parent_user_id : c.student_user_id;
    await execute(`INSERT INTO pc_signals (call_id, to_user_id, type, payload) VALUES ($1,$2,$3,$4)`, [c.id, to, type, JSON.stringify(payload ?? null)]);
    return res.json({ success: true });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

// ---------- polling: incoming call, signals, status of the call I'm in ----------
parentConnectRouter.get('/poll', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!;
    if (!['STUDENT', 'PARENT'].includes(me.role)) return res.json({ call: null, signals: [], known: null });
    await housekeeping();
    const after = Number(req.query.after || 0);
    const live = await queryOne<any>(
      `SELECT * FROM pc_calls WHERE status IN ('ringing','connected') AND (student_user_id = $1 OR parent_user_id = $1) ORDER BY initiated_at DESC LIMIT 1`, [me.id]);
    let known: any = null;
    if (req.query.call_id) known = await queryOne<any>(`SELECT * FROM pc_calls WHERE id = $1 AND (student_user_id = $2 OR parent_user_id = $2)`, [String(req.query.call_id), me.id]);
    const signals = await query<any>(`SELECT id, call_id, type, payload FROM pc_signals WHERE to_user_id = $1 AND id > $2 ORDER BY id LIMIT 200`, [me.id, after]);
    // tidy old signals so the table stays small
    if (Math.random() < 0.05) await execute(`DELETE FROM pc_signals WHERE created_at < NOW() - INTERVAL '1 hour'`);
    return res.json({
      call: shapeCall(live, me.id),
      known: shapeCall(known, me.id),
      signals: signals.map((s) => ({ id: Number(s.id), callId: s.call_id, type: s.type, payload: s.payload ? JSON.parse(s.payload) : null })),
    });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

// ---------- admin ----------
parentConnectRouter.get('/schedule', authenticate, async (_req, res: Response) => {
  try { return res.json({ schedule: await query(`SELECT * FROM pc_schedule ORDER BY day_of_week`) }); } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

parentConnectRouter.put('/schedule', authenticate, requireRoles(...(ADMIN_ROLES as any)), async (req: AuthRequest, res: Response) => {
  try {
    const rows: any[] = Array.isArray(req.body?.schedule) ? req.body.schedule : [];
    const ok = /^([01]\d|2[0-3]):[0-5]\d$/;
    for (const r of rows) {
      if (!ok.test(r.start_time) || !ok.test(r.end_time) || r.end_time <= r.start_time) return res.status(400).json({ error: 'Each day needs a valid start time before its end time.' });
      const max = Number(r.max_duration_minutes);
      if (!(max >= 1 && max <= 120)) return res.status(400).json({ error: 'Maximum call length must be 1 to 120 minutes.' });
      await execute(`UPDATE pc_schedule SET start_time=$1, end_time=$2, max_duration_minutes=$3, is_active=$4 WHERE day_of_week=$5`,
        [r.start_time, r.end_time, max, r.is_active ? 1 : 0, Number(r.day_of_week)]);
    }
    await logAudit(req, 'PARENT_CONNECT_SCHEDULE_UPDATED', 'pc_schedule', 'all', { days: rows.length });
    return res.json({ success: true });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

parentConnectRouter.get('/live', authenticate, requireRoles(...(ADMIN_ROLES as any)), async (_req, res: Response) => {
  try {
    await housekeeping();
    const live = await query<any>(
      `SELECT c.*, su.name AS student_name, pu.name AS parent_name FROM pc_calls c JOIN users su ON su.id = c.student_user_id JOIN users pu ON pu.id = c.parent_user_id
       WHERE c.status IN ('ringing','connected') ORDER BY c.initiated_at DESC`);
    const stats = await queryOne<any>(
      `SELECT COUNT(*) FILTER (WHERE initiated_at > NOW() - INTERVAL '24 hours') AS calls_24h,
              COUNT(*) FILTER (WHERE initiated_at > NOW() - INTERVAL '24 hours' AND status = 'ended') AS completed_24h,
              COUNT(*) FILTER (WHERE initiated_at > NOW() - INTERVAL '24 hours' AND status IN ('missed','rejected')) AS missed_24h,
              COALESCE(SUM(duration_seconds) FILTER (WHERE initiated_at > NOW() - INTERVAL '24 hours'), 0) AS seconds_24h
       FROM pc_calls`);
    return res.json({ live: live.map((r) => ({ ...r, student_name: clean(r.student_name), parent_name: clean(r.parent_name) })), stats: { calls24h: Number(stats?.calls_24h || 0), completed24h: Number(stats?.completed_24h || 0), missed24h: Number(stats?.missed_24h || 0), seconds24h: Number(stats?.seconds_24h || 0) } });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

parentConnectRouter.post('/students/:studentUserId/block', authenticate, requireRoles(...(ADMIN_ROLES as any)), async (req: AuthRequest, res: Response) => {
  try {
    const blocked = !!req.body?.blocked;
    if (blocked) await execute(`INSERT INTO pc_blocked (student_user_id, reason) VALUES ($1,$2) ON CONFLICT (student_user_id) DO UPDATE SET reason = EXCLUDED.reason`, [req.params.studentUserId, req.body?.reason || null]);
    else await execute(`DELETE FROM pc_blocked WHERE student_user_id = $1`, [req.params.studentUserId]);
    await logAudit(req, blocked ? 'PARENT_CONNECT_BLOCKED' : 'PARENT_CONNECT_UNBLOCKED', 'pc_blocked', req.params.studentUserId, {});
    return res.json({ success: true });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});
