import { Router, Response } from 'express';
import { query, queryOne, execute } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import crypto from 'crypto';

export const counsellingRouter = Router();

// Class teachers log counselling sessions with their students; HOD/Admin can
// see everything for oversight.
const COUNSELLOR_ROLES = ['TEACHER', 'HOD', 'ADMIN', 'PRINCIPAL'];

// 1. List counselling records for a branch (optionally filtered by student,
//    or by "mine" to show only the logged-in counsellor's own sessions)
counsellingRouter.get('/', authenticate, requireRoles(...COUNSELLOR_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    const studentId = req.query.student_id as string;
    const mine = req.query.mine === 'true';

    let sql = `
      SELECT cr.*, sp.name as student_name, sp.register_number, u.name as counsellor_name
      FROM counselling_records cr
      JOIN student_profiles sp ON cr.student_id = sp.id
      JOIN users u ON cr.counsellor_id = u.id
      WHERE cr.branch_id = $1
    `;
    const params: any[] = [branchId];
    if (studentId) {
      params.push(studentId);
      sql += ` AND cr.student_id = $${params.length}`;
    }
    if (mine) {
      params.push(req.user!.id);
      sql += ` AND cr.counsellor_id = $${params.length}`;
    }
    sql += ` ORDER BY cr.session_date DESC`;

    const records = await query(sql, params);
    return res.json({ records });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Log a new counselling session
counsellingRouter.post('/', authenticate, requireRoles(...COUNSELLOR_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { student_id, session_date, reason, notes, follow_up_date, branch_id } = req.body;
    if (!student_id || !session_date) {
      return res.status(400).json({ error: 'student_id and session_date are required.' });
    }

    const id = 'couns-' + crypto.randomUUID();
    await execute(`
      INSERT INTO counselling_records (id, branch_id, student_id, counsellor_id, session_date, reason, notes, follow_up_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, branch_id || req.user!.branch_id, student_id, req.user!.id, session_date, reason || null, notes || null, follow_up_date || null]);

    await logAudit(req, 'COUNSELLING_LOGGED', 'counselling_records', id, { student_id, session_date });
    return res.status(201).json({ success: true, id, message: 'Counselling session logged successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Update a session (status, follow-up, notes) — the original counsellor or HOD/Admin
counsellingRouter.put('/:id', authenticate, requireRoles(...COUNSELLOR_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { notes, follow_up_date, status } = req.body;

    const record = await queryOne<any>(`SELECT counsellor_id FROM counselling_records WHERE id = $1`, [id]);
    if (!record) {
      return res.status(404).json({ error: 'Counselling record not found.' });
    }
    if (record.counsellor_id !== req.user!.id && !['ADMIN', 'PRINCIPAL', 'HOD'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'You can only update your own counselling records.' });
    }

    await execute(`
      UPDATE counselling_records SET
        notes = COALESCE($1, notes),
        follow_up_date = $2,
        status = COALESCE($3, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [notes, follow_up_date || null, status, id]);

    await logAudit(req, 'COUNSELLING_UPDATED', 'counselling_records', id, { status });
    return res.json({ success: true, message: 'Counselling record updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
