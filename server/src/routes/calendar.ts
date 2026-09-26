import { Router, Response } from 'express';
import { query, queryOne, execute } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import crypto from 'crypto';

export const calendarRouter = Router();

// Roles allowed to add/edit/delete college calendar events — everyone else
// (teachers, students, staff) can only view it.
const MANAGER_ROLES = ['ADMIN', 'PRINCIPAL', 'HOD'];

// 1. List events for a branch, optionally scoped to a month (YYYY-MM)
calendarRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    const month = req.query.month as string; // e.g. '2026-09'

    let sql = `SELECT * FROM calendar_events WHERE branch_id = $1`;
    const params: any[] = [branchId];
    if (month) {
      params.push(`${month}%`);
      sql += ` AND event_date LIKE $${params.length}`;
    }
    sql += ` ORDER BY event_date ASC`;

    const events = await query(sql, params);
    return res.json({ events });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Create an event
calendarRouter.post('/', authenticate, requireRoles(...MANAGER_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, event_date, end_date, event_type, branch_id } = req.body;
    if (!title || !event_date) {
      return res.status(400).json({ error: 'title and event_date are required.' });
    }

    const id = 'cal-' + crypto.randomUUID();
    await execute(`
      INSERT INTO calendar_events (id, branch_id, title, description, event_date, end_date, event_type, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, branch_id || req.user!.branch_id, title, description || null, event_date, end_date || null, event_type || 'EVENT', req.user!.id]);

    await logAudit(req, 'CALENDAR_EVENT_CREATED', 'calendar_events', id, { title, event_date });
    return res.status(201).json({ success: true, id, message: 'Event added to the college calendar.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Update an event
calendarRouter.put('/:id', authenticate, requireRoles(...MANAGER_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, event_date, end_date, event_type } = req.body;

    const event = await queryOne(`SELECT id FROM calendar_events WHERE id = $1`, [id]);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    await execute(`
      UPDATE calendar_events SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        event_date = COALESCE($3, event_date),
        end_date = $4,
        event_type = COALESCE($5, event_type)
      WHERE id = $6
    `, [title, description, event_date, end_date || null, event_type, id]);

    await logAudit(req, 'CALENDAR_EVENT_UPDATED', 'calendar_events', id, { title });
    return res.json({ success: true, message: 'Event updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Delete an event
calendarRouter.delete('/:id', authenticate, requireRoles(...MANAGER_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await execute(`DELETE FROM calendar_events WHERE id = $1`, [id]);
    await logAudit(req, 'CALENDAR_EVENT_DELETED', 'calendar_events', id, {});
    return res.json({ success: true, message: 'Event removed from the college calendar.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
