import { Router, Response } from 'express';
import { query, queryOne, execute } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import crypto from 'crypto';

export const notificationsRouter = Router();

// 1. List the current user's notifications (most recent 50) + unread count
notificationsRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await query(`
      SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50
    `, [req.user!.id]);

    const unreadRow = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = 0
    `, [req.user!.id]);

    return res.json({ notifications, unreadCount: Number(unreadRow?.count || 0) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Mark one notification read
notificationsRouter.post('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await execute(`UPDATE notifications SET is_read = 1 WHERE id = $1 AND user_id = $2`, [id, req.user!.id]);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Mark all of the current user's notifications read
notificationsRouter.post('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await execute(`UPDATE notifications SET is_read = 1 WHERE user_id = $1 AND is_read = 0`, [req.user!.id]);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Create a notification for a specific user — used internally by other routes
//    (e.g. "your outpass was approved", "you were assigned a substitution") and
//    available directly to staff roles for ad-hoc one-off notices.
notificationsRouter.post('/', authenticate, requireRoles('ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER', 'WARDEN', 'HEAD_WARDEN', 'FLOOR_ATTENDER'), async (req: AuthRequest, res: Response) => {
  try {
    const { user_id, title, message, link_tab } = req.body;
    if (!user_id || !title) {
      return res.status(400).json({ error: 'user_id and title are required.' });
    }

    const id = 'notif-' + crypto.randomUUID();
    await execute(`
      INSERT INTO notifications (id, user_id, title, message, link_tab)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, user_id, title, message || null, link_tab || null]);

    await logAudit(req, 'NOTIFICATION_SENT', 'notifications', id, { user_id, title });

    return res.status(201).json({ success: true, id, message: 'Notification sent successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Internal helper other route files can import directly to notify a user
// without going through HTTP (e.g. outpass.ts calling this on approval).
export async function createNotification(userId: string, title: string, message?: string, linkTab?: string) {
  const id = 'notif-' + crypto.randomUUID();
  await execute(`
    INSERT INTO notifications (id, user_id, title, message, link_tab)
    VALUES ($1, $2, $3, $4, $5)
  `, [id, userId, title, message || null, linkTab || null]);
  return id;
}
