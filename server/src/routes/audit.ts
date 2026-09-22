import { Router, Response } from 'express';
import { query } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';

export const auditRouter = Router();

// Get audit trail logs (Admin & Principal only)
auditRouter.get('/logs', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const action = req.query.action as string;
  const entityType = req.query.entity_type as string;
  const userId = req.query.user_id as string;
  const search = req.query.search as string;

  let sql = `SELECT * FROM audit_logs WHERE 1=1`;
  const params: any[] = [];

  if (action) {
    sql += ` AND action = ?`;
    params.push(action);
  }
  if (entityType) {
    sql += ` AND entity_type = ?`;
    params.push(entityType);
  }
  if (userId) {
    sql += ` AND user_id = ?`;
    params.push(userId);
  }
  if (search) {
    sql += ` AND (action LIKE ? OR entity_type LIKE ? OR user_name LIKE ? OR details_json LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ` ORDER BY created_at DESC LIMIT 100`;

  const logs = await query(sql, params);

  return res.json({ logs });
});

