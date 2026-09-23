import { Router, Response } from 'express';
import { query, queryOne, execute, transaction } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import crypto from 'crypto';

export const announcementsRouter = Router();

// Roles allowed to post/delete announcements — staff-facing roles only, not students/parents
const POSTER_ROLES = ['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER', 'WARDEN', 'HEAD_WARDEN', 'FLOOR_ATTENDER', 'NON_TEACHING_STAFF', 'GATE_STAFF'];

// 1. List announcements visible to the current user — pinned first, then newest.
//    An announcement with no target_roles is visible to everyone in the branch;
//    ADMIN/PRINCIPAL always see everything regardless of targeting.
announcementsRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    const category = req.query.category as string;
    const role = req.user!.role;

    let sql = `SELECT * FROM announcements WHERE branch_id = $1`;
    const params: any[] = [branchId];

    if (role !== 'ADMIN' && role !== 'PRINCIPAL') {
      params.push(`%${role}%`);
      sql += ` AND (target_roles IS NULL OR target_roles = '' OR target_roles LIKE $${params.length})`;
    }
    if (category) {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }
    sql += ` ORDER BY is_pinned DESC, created_at DESC`;

    const announcements = await query(sql, params);
    return res.json({ announcements });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Create an announcement. When target_roles is given, a personal notification
//    is also created for every currently-active user in that branch holding one
//    of those roles, so their Navbar bell lights up immediately.
announcementsRouter.post('/', authenticate, requireRoles(...POSTER_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, category, target_roles, is_pinned, attachment_url, branch_id } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required.' });
    }

    const targetBranchId = branch_id || req.user!.branch_id;
    const id = 'ann-' + crypto.randomUUID();
    const targetRolesStr = Array.isArray(target_roles) ? target_roles.join(',') : (target_roles || null);

    await execute(`
      INSERT INTO announcements (id, branch_id, title, content, category, target_roles, is_pinned, attachment_url, posted_by, posted_by_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      id, targetBranchId, title, content, category || 'GENERAL', targetRolesStr,
      is_pinned ? 1 : 0, attachment_url || null, req.user!.id, req.user!.name
    ]);

    // Fan out a personal notification to everyone this announcement targets
    const roleList = Array.isArray(target_roles) ? target_roles : (target_roles ? String(target_roles).split(',') : null);
    const recipients = roleList && roleList.length > 0
      ? await query<{ id: string }>(`SELECT id FROM users WHERE branch_id = $1 AND role = ANY($2) AND is_active = 1`, [targetBranchId, roleList])
      : await query<{ id: string }>(`SELECT id FROM users WHERE branch_id = $1 AND is_active = 1`, [targetBranchId]);

    if (recipients.length > 0) {
      await transaction(async (client) => {
        for (const r of recipients) {
          const notifId = 'notif-' + crypto.randomUUID();
          await client.query(`
            INSERT INTO notifications (id, user_id, title, message, link_tab)
            VALUES ($1, $2, $3, $4, 'noticeboard')
          `, [notifId, r.id, `New notice: ${title}`, content.slice(0, 140)]);
        }
      });
    }

    await logAudit(req, 'ANNOUNCEMENT_POSTED', 'announcements', id, { title, category, target_roles: targetRolesStr });

    return res.status(201).json({ success: true, id, message: 'Announcement posted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Delete an announcement — the original poster, or ADMIN/PRINCIPAL
announcementsRouter.delete('/:id', authenticate, requireRoles(...POSTER_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const announcement = await queryOne<{ posted_by: string }>(`SELECT posted_by FROM announcements WHERE id = $1`, [id]);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }
    if (announcement.posted_by !== req.user!.id && !['ADMIN', 'PRINCIPAL'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'You can only delete your own announcements.' });
    }

    await execute(`DELETE FROM announcements WHERE id = $1`, [id]);
    await logAudit(req, 'ANNOUNCEMENT_DELETED', 'announcements', id, {});

    return res.json({ success: true, message: 'Announcement deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
