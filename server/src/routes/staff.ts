import { Router, Response } from 'express';
import { query, queryOne, execute, transaction } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const staffRouter = Router();

// 1. Get Non-Teaching Staff List
staffRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    const roleFilter = req.query.role as string;
    const search = req.query.search as string;

    const nonTeachingRoles = ['NON_TEACHING_STAFF', 'FLOOR_ATTENDER', 'WARDEN', 'HEAD_WARDEN', 'GATE_STAFF'];

    let sql = `
      SELECT u.id, u.branch_id, u.role, u.username, u.email, u.name, u.phone, u.avatar_url, u.is_active, u.created_at,
             b.name as branch_name, b.code as branch_code, b.city as branch_city
      FROM users u
      JOIN branches b ON u.branch_id = b.id
      WHERE u.branch_id = $1 AND u.role = ANY($2)
    `;
    const params: any[] = [branchId, roleFilter ? [roleFilter] : nonTeachingRoles];

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
  const { name, username, email, phone, role, password } = req.body;

  if (!name || !role) {
    return res.status(400).json({ error: 'Name and role are required.' });
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
      INSERT INTO users (id, branch_id, role, username, email, password_hash, name, phone, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
    `, [userId, branchId, role, finalUsername, finalEmail, passwordHash, name, phone || '']);

    await logAudit(req, 'STAFF_REGISTERED', 'users', userId, { name, role, email: finalEmail });

    return res.status(201).json({
      success: true,
      message: `${role.replace('_', ' ')} staff account created successfully.`,
      staffId: userId
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Update Staff Member (Admin, Principal)
staffRouter.put('/:id', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, phone, role, is_active } = req.body;

  try {
    await execute(`
      UPDATE users
      SET name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          role = COALESCE($3, role),
          is_active = COALESCE($4, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [name, phone, role, is_active, id]);

    await logAudit(req, 'STAFF_UPDATED', 'users', id, { name, role });

    return res.json({ success: true, message: 'Staff profile updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
