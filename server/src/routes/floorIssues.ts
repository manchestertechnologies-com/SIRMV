import { Router, Response } from 'express';
import { query, queryOne, execute } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import crypto from 'crypto';

export const floorIssuesRouter = Router();

const REPORTER_ROLES = ['FLOOR_ATTENDER', 'TEACHER', 'HOD', 'ADMIN', 'PRINCIPAL'];
const RESOLVER_ROLES = ['ADMIN', 'PRINCIPAL', 'HOD'];

// 1. List floor issues for a branch (optionally filtered by status/floor)
floorIssuesRouter.get('/', authenticate, requireRoles(...REPORTER_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    const status = req.query.status as string;
    const floor = req.query.floor as string;

    let sql = `
      SELECT fi.*, r.room_number, u.name as reported_by_name
      FROM floor_issues fi
      LEFT JOIN rooms r ON fi.room_id = r.id
      LEFT JOIN users u ON fi.reported_by = u.id
      WHERE fi.branch_id = $1
    `;
    const params: any[] = [branchId];
    if (status) {
      params.push(status);
      sql += ` AND fi.status = $${params.length}`;
    }
    if (floor) {
      params.push(Number(floor));
      sql += ` AND fi.floor = $${params.length}`;
    }
    sql += ` ORDER BY fi.created_at DESC`;

    const issues = await query(sql, params);
    return res.json({ issues });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Report a new issue
floorIssuesRouter.post('/', authenticate, requireRoles(...REPORTER_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { floor, room_id, category, description, branch_id } = req.body;
    if (!description) {
      return res.status(400).json({ error: 'description is required.' });
    }

    const id = 'issue-' + crypto.randomUUID();
    await execute(`
      INSERT INTO floor_issues (id, branch_id, floor, room_id, category, description, reported_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id, branch_id || req.user!.branch_id, floor || null, room_id || null, category || 'MAINTENANCE', description, req.user!.id]);

    await logAudit(req, 'FLOOR_ISSUE_REPORTED', 'floor_issues', id, { floor, category });
    return res.status(201).json({ success: true, id, message: 'Issue reported successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Update status (triage/resolve) — ADMIN/PRINCIPAL/HOD only
floorIssuesRouter.put('/:id', authenticate, requireRoles(...RESOLVER_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const issue = await queryOne(`SELECT id FROM floor_issues WHERE id = $1`, [id]);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found.' });
    }

    await execute(`
      UPDATE floor_issues SET
        status = COALESCE($1, status),
        resolved_at = CASE WHEN $1 = 'RESOLVED' THEN CURRENT_TIMESTAMP ELSE resolved_at END
      WHERE id = $2
    `, [status, id]);

    await logAudit(req, 'FLOOR_ISSUE_UPDATED', 'floor_issues', id, { status });
    return res.json({ success: true, message: 'Issue updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
