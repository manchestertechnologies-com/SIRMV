import { Router, Response } from 'express';
import { query, queryOne, execute } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import crypto from 'crypto';

export const disciplineRouter = Router();

// Hostel wardens log discipline incidents for residents; HOD/Admin can see
// everything for oversight.
const DISCIPLINE_ROLES = ['WARDEN', 'HEAD_WARDEN', 'ADMIN', 'PRINCIPAL', 'HOD'];

// 1. List discipline records for a branch (optionally filtered by student)
disciplineRouter.get('/', authenticate, requireRoles(...DISCIPLINE_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    const studentId = req.query.student_id as string;

    let sql = `
      SELECT dr.*, sp.name as student_name, sp.register_number, u.name as reported_by_name
      FROM discipline_records dr
      JOIN student_profiles sp ON dr.student_id = sp.id
      LEFT JOIN users u ON dr.reported_by = u.id
      WHERE dr.branch_id = $1
    `;
    const params: any[] = [branchId];
    if (studentId) {
      params.push(studentId);
      sql += ` AND dr.student_id = $${params.length}`;
    }
    sql += ` ORDER BY dr.incident_date DESC`;

    const records = await query(sql, params);
    return res.json({ records });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Log a new discipline incident
disciplineRouter.post('/', authenticate, requireRoles(...DISCIPLINE_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { student_id, incident_date, category, description, action_taken, branch_id } = req.body;
    if (!student_id || !incident_date || !description) {
      return res.status(400).json({ error: 'student_id, incident_date and description are required.' });
    }

    const id = 'disc-' + crypto.randomUUID();
    await execute(`
      INSERT INTO discipline_records (id, branch_id, student_id, incident_date, category, description, action_taken, reported_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, branch_id || req.user!.branch_id, student_id, incident_date, category || null, description, action_taken || null, req.user!.id]);

    await logAudit(req, 'DISCIPLINE_RECORD_LOGGED', 'discipline_records', id, { student_id, category });
    return res.status(201).json({ success: true, id, message: 'Discipline record logged successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Update a record (action taken, status)
disciplineRouter.put('/:id', authenticate, requireRoles(...DISCIPLINE_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action_taken, status } = req.body;

    const record = await queryOne(`SELECT id FROM discipline_records WHERE id = $1`, [id]);
    if (!record) {
      return res.status(404).json({ error: 'Discipline record not found.' });
    }

    await execute(`
      UPDATE discipline_records SET action_taken = COALESCE($1, action_taken), status = COALESCE($2, status) WHERE id = $3
    `, [action_taken, status, id]);

    await logAudit(req, 'DISCIPLINE_RECORD_UPDATED', 'discipline_records', id, { status });
    return res.json({ success: true, message: 'Discipline record updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
