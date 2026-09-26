import { Router, Response } from 'express';
import { query, queryOne, execute, transaction } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const staffRouter = Router();

// The operational job categories shown on the registration/filter dropdown.
// These are distinct from `users.role` (which drives login permissions) —
// `staff_category` is purely descriptive, so changing it never affects what
// a staff member's account can access.
export const STAFF_CATEGORIES = ['Floor In Charge', 'Cleaning', 'Bus', 'Warden', 'Mess'];

// Sensible default system role per category, only used when the caller
// doesn't explicitly pass one. Floor In Charge / Warden map onto their
// matching permission role so those features keep working; the rest are
// plain non-teaching staff.
const CATEGORY_TO_ROLE: Record<string, string> = {
  'Floor In Charge': 'FLOOR_ATTENDER',
  Warden: 'WARDEN',
  Cleaning: 'NON_TEACHING_STAFF',
  Bus: 'NON_TEACHING_STAFF',
  Mess: 'NON_TEACHING_STAFF'
};

// 0. Get allowed staff categories (for the registration/filter dropdown)
staffRouter.get('/categories', authenticate, async (_req: AuthRequest, res: Response) => {
  return res.json({ categories: STAFF_CATEGORIES });
});

// 1. Get Non-Teaching Staff List
staffRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    const roleFilter = req.query.role as string;
    const categoryFilter = req.query.category as string;
    const search = req.query.search as string;

    const nonTeachingRoles = ['NON_TEACHING_STAFF', 'FLOOR_ATTENDER', 'WARDEN', 'HEAD_WARDEN', 'GATE_STAFF'];

    let sql = `
      SELECT u.id, u.branch_id, u.role, u.staff_category, u.username, u.email, u.name, u.phone, u.avatar_url, u.is_active, u.created_at,
             b.name as branch_name, b.code as branch_code, b.city as branch_city,
             COALESCE(
               (SELECT sat.status FROM staff_attendance sat WHERE sat.user_id = u.id AND sat.date = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')),
               'PRESENT'
             ) as attendance_status
      FROM users u
      JOIN branches b ON u.branch_id = b.id
      WHERE u.branch_id = $1 AND u.role = ANY($2)
    `;
    const params: any[] = [branchId, roleFilter ? [roleFilter] : nonTeachingRoles];

    if (categoryFilter) {
      params.push(categoryFilter);
      sql += ` AND u.staff_category = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(u.name) LIKE $${params.length} OR LOWER(u.username) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length} OR u.phone LIKE $${params.length})`;
    }

    sql += ` ORDER BY u.role, u.name ASC`;

    const staffMembers = await query(sql, params);
    return res.json({ staffMembers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Get Single Staff Member
staffRouter.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const staff = await queryOne(`
      SELECT u.id, u.branch_id, u.role, u.username, u.email, u.name, u.phone, u.avatar_url, u.is_active, u.created_at,
             b.name as branch_name, b.code as branch_code, b.city as branch_city
      FROM users u
      JOIN branches b ON u.branch_id = b.id
      WHERE u.id = $1
    `, [id]);

    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }

    return res.json({ staff });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Register New Non-Teaching Staff (Admin, Principal)
staffRouter.post('/', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const { name, username, email, phone, staff_category, password } = req.body;
  let { role } = req.body;

  if (!name || (!role && !staff_category)) {
    return res.status(400).json({ error: 'Name and a role/department are required.' });
  }

  if (staff_category && !STAFF_CATEGORIES.includes(staff_category)) {
    return res.status(400).json({ error: `Invalid department. Allowed: ${STAFF_CATEGORIES.join(', ')}` });
  }

  // The system role drives login permissions; when only a job category was
  // given, derive a sensible role from it instead of requiring the caller
  // to know about the underlying permission roles.
  if (!role && staff_category) {
    role = CATEGORY_TO_ROLE[staff_category];
  }

  const allowedRoles = ['NON_TEACHING_STAFF', 'FLOOR_ATTENDER', 'WARDEN', 'HEAD_WARDEN', 'GATE_STAFF'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid non-teaching role. Allowed: ${allowedRoles.join(', ')}` });
  }

  try {
    const branchId = req.user!.branch_id;
    const userId = 'usr-' + crypto.randomUUID();
    const finalUsername = username || email?.split('@')[0] || name.toLowerCase().replace(/\s+/g, '.');
    const finalEmail = email || `${finalUsername}@college.test`;
    const passwordHash = await bcrypt.hash(password || 'Demo@12345', 10);

    await execute(`
      INSERT INTO users (id, branch_id, role, staff_category, username, email, password_hash, name, phone, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1)
    `, [userId, branchId, role, staff_category || null, finalUsername, finalEmail, passwordHash, name, phone || '']);

    await logAudit(req, 'STAFF_REGISTERED', 'users', userId, { name, role, staff_category, email: finalEmail });

    return res.status(201).json({
      success: true,
      message: `${(staff_category || role.replace('_', ' '))} staff account created successfully.`,
      staffId: userId
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Update Staff Member (Admin, Principal)
staffRouter.put('/:id', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, phone, role, staff_category, is_active } = req.body;

  if (staff_category && !STAFF_CATEGORIES.includes(staff_category)) {
    return res.status(400).json({ error: `Invalid department. Allowed: ${STAFF_CATEGORIES.join(', ')}` });
  }

  try {
    await execute(`
      UPDATE users
      SET name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          role = COALESCE($3, role),
          staff_category = COALESCE($4, staff_category),
          is_active = COALESCE($5, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `, [name, phone, role, staff_category, is_active, id]);

    await logAudit(req, 'STAFF_UPDATED', 'users', id, { name, role, staff_category });

    return res.json({ success: true, message: 'Staff profile updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Mark Staff Present/Absent for a date (defaults to today)
staffRouter.post('/:id/attendance', authenticate, requireRoles('ADMIN', 'PRINCIPAL', 'HOD'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, date } = req.body;

  if (!status || !['PRESENT', 'ABSENT'].includes(status)) {
    return res.status(400).json({ error: `status must be PRESENT or ABSENT.` });
  }

  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const attendanceId = 'satt-' + crypto.randomUUID();

    await execute(`
      INSERT INTO staff_attendance (id, user_id, date, status, marked_by)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, date) DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by, updated_at = CURRENT_TIMESTAMP
    `, [attendanceId, id, targetDate, status, req.user!.id]);

    await logAudit(req, 'STAFF_ATTENDANCE_MARKED', 'staff_attendance', id, { status, date: targetDate });

    return res.json({ success: true, message: `Marked ${status.toLowerCase()} for ${targetDate}.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
