import { Router, Response } from 'express';
import { query, queryOne, execute } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import crypto from 'crypto';

export const grievancesRouter = Router();

// 1. A student files a grievance — reaches the Warden / Head Warden of
//    their own branch. Only a resident (hostel) student may file one;
//    enforced here as the source of truth, not just hidden in the UI.
grievancesRouter.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const studentId = req.user!.student_id;
  const { category, subject, description } = req.body;

  if (!studentId) {
    return res.status(403).json({ error: 'Only a student account can file a grievance.' });
  }
  if (!subject || !description) {
    return res.status(400).json({ error: 'subject and description are required.' });
  }

  const student = await queryOne<any>(`SELECT branch_id, residence_status FROM student_profiles WHERE id = ?`, [studentId]);
  if (!student) {
    return res.status(404).json({ error: 'Student profile not found.' });
  }
  if (student.residence_status !== 'RESIDENT') {
    return res.status(403).json({ error: 'Grievances are available to hostel residents only.' });
  }

  const id = 'grv-' + crypto.randomUUID();
  await execute(`
    INSERT INTO grievances (id, branch_id, student_id, category, subject, description, status)
    VALUES (?, ?, ?, ?, ?, ?, 'OPEN')
  `, [id, student.branch_id, studentId, category || 'GENERAL', subject, description]);

  logAudit(req, 'GRIEVANCE_FILED', 'grievances', id, { category, subject });

  return res.status(201).json({ success: true, id, message: 'Grievance submitted to the Warden.' });
});

// 2. A student's own grievance history.
grievancesRouter.get('/mine', authenticate, async (req: AuthRequest, res: Response) => {
  const studentId = (req.query.student_id as string) || req.user!.student_id;
  if (!studentId) {
    return res.status(400).json({ error: 'No student profile linked to this account.' });
  }
  if (req.user!.role === 'STUDENT' && req.user!.student_id !== studentId) {
    return res.status(403).json({ error: 'Access denied: you can only view your own grievances.' });
  }
  const grievances = await query(`
    SELECT g.*, u.name as responded_by_name
    FROM grievances g
    LEFT JOIN users u ON g.responded_by = u.id
    WHERE g.student_id = ?
    ORDER BY g.created_at DESC
  `, [studentId]);
  return res.json({ grievances });
});

// 3. Branch-wide grievance queue, for Warden/Head Warden/Admin/Principal.
grievancesRouter.get('/', authenticate, requireRoles('WARDEN', 'HEAD_WARDEN', 'ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;
  const status = req.query.status as string;

  let sql = `
    SELECT g.*, sp.name as student_name, sp.register_number, u.name as responded_by_name
    FROM grievances g
    JOIN student_profiles sp ON g.student_id = sp.id
    LEFT JOIN users u ON g.responded_by = u.id
    WHERE g.branch_id = ?
  `;
  const params: any[] = [branchId];
  if (status) {
    sql += ` AND g.status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY g.created_at DESC`;

  const grievances = await query(sql, params);
  return res.json({ grievances });
});

// 4. Warden/Head Warden responds to and/or updates the status of a grievance.
grievancesRouter.put('/:id/respond', authenticate, requireRoles('WARDEN', 'HEAD_WARDEN', 'ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, response } = req.body;
  if (status && !['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(status)) {
    return res.status(400).json({ error: 'status must be OPEN, IN_PROGRESS or RESOLVED.' });
  }

  await execute(`
    UPDATE grievances SET
      status = COALESCE(?, status),
      response = COALESCE(?, response),
      responded_by = ?,
      responded_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [status || null, response || null, req.user!.id, id]);

  logAudit(req, 'GRIEVANCE_RESPONDED', 'grievances', id, { status, hasResponse: !!response });

  return res.json({ success: true, message: 'Grievance updated.' });
});
