import { Router, Response } from 'express';
import { query, queryOne, execute } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { getVapidPublicKey } from '../services/pushService';
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

// ---------------------------------------------------------------------------
// Web Push (VAPID) — the browser/OS notification layer. This is separate from
// the in-app "notifications" table above: a push is what wakes the device
// when the site isn't open, an in-app notification is the bell dropdown.
// A publish/approval flow (e.g. timetableGenerator.ts) typically calls both
// createNotification() and sendPushToUser() for the same event.
// ---------------------------------------------------------------------------

// 5. Public VAPID key — safe to expose, this is what the frontend needs to subscribe.
notificationsRouter.get('/vapid-public-key', authenticate, async (_req: AuthRequest, res: Response) => {
  const key = getVapidPublicKey();
  if (!key) {
    return res.status(503).json({ error: 'Push notifications are not configured on this server yet.' });
  }
  return res.json({ publicKey: key });
});

// 6. Whether the current user has at least one active push subscription (any device).
notificationsRouter.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await query<{ count: string }>(`SELECT COUNT(*) as count FROM push_subscriptions WHERE user_id = $1`, [req.user!.id]);
    const count = Number(rows[0]?.count || 0);
    return res.json({ subscribed: count > 0, deviceCount: count });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. Register (or refresh) this device's push subscription for the authenticated user.
//    userId always comes from the JWT (req.user.id) — never from the request body.
notificationsRouter.post('/subscribe', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint, keys, platform } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'A valid PushSubscription (endpoint, keys.p256dh, keys.auth) is required.' });
    }

    const userAgent = req.headers['user-agent'] || null;
    const existing = await queryOne<{ id: string; user_id: string }>(`SELECT id, user_id FROM push_subscriptions WHERE endpoint = $1`, [endpoint]);

    if (existing) {
      // Same endpoint re-subscribing (e.g. key refresh) — keep it tied to whoever owns it now.
      await execute(
        `UPDATE push_subscriptions SET user_id = $1, p256dh = $2, auth = $3, user_agent = $4, platform = $5, updated_at = CURRENT_TIMESTAMP WHERE endpoint = $6`,
        [req.user!.id, keys.p256dh, keys.auth, userAgent, platform || null, endpoint]
      );
      return res.json({ success: true, id: existing.id });
    }

    const id = 'push-' + crypto.randomUUID();
    await execute(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, platform)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, req.user!.id, endpoint, keys.p256dh, keys.auth, userAgent, platform || null]
    );
    await logAudit(req, 'PUSH_SUBSCRIBED', 'push_subscriptions', id, { platform });
    return res.status(201).json({ success: true, id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 8. Remove one specific device's subscription (never all of a user's devices at once).
notificationsRouter.post('/unsubscribe', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) {
      return res.status(400).json({ error: 'endpoint is required.' });
    }
    // Scoped to the authenticated user's own id — cannot remove someone else's subscription.
    const deleted = await execute(`DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2`, [endpoint, req.user!.id]);
    await logAudit(req, 'PUSH_UNSUBSCRIBED', 'push_subscriptions', endpoint, {});
    return res.json({ success: true, removed: deleted });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
