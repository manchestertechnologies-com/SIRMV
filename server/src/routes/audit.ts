import { Router, Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';

export const auditRouter = Router();

// Get audit trail logs (Admin & Principal only)
auditRouter.get('/logs', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), (req: AuthRequest, res: Response) => {
  const action = req.query.action as string;
  const entityType = req.query.entity_type as string;
  const userId = req.query.user_id as string;
  const search = req.query.search as string;

  let query = `SELECT * FROM audit_logs WHERE 1=1`;
  const params: any[] = [];

  if (action) {
    query += ` AND action = ?`;
    params.push(action);
  }
  if (entityType) {
    query += ` AND entity_type = ?`;
    params.push(entityType);
  }
  if (userId) {
    query += ` AND user_id = ?`;
    params.push(userId);
  }
  if (search) {
    query += ` AND (action LIKE ? OR entity_type LIKE ? OR user_name LIKE ? OR details_json LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ` ORDER BY created_at DESC LIMIT 100`;

  const logs = db.prepare(query).all(...params);

  return res.json({ logs });
});
