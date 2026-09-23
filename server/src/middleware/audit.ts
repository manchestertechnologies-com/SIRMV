import { AuthRequest } from './auth';
import { execute } from '../database/pgDb';
import crypto from 'crypto';

export async function logAudit(
  req: AuthRequest,
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, any>
) {
  try {
    const id = 'audit-' + crypto.randomUUID();
    const userId = req.user ? req.user.id : null;
    const userName = req.user ? req.user.name : 'SYSTEM';
    const role = req.user ? req.user.role : 'SYSTEM';
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const detailsJson = details ? JSON.stringify(details) : null;

    await execute(`
      INSERT INTO audit_logs (id, user_id, user_name, role, action, entity_type, entity_id, details_json, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [id, userId, userName, role, action, entityType, entityId || null, detailsJson, ip]);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
