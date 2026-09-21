import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../database/db';
import { generateToken, authenticate, AuthRequest } from '../middleware/auth';
import { logAudit } from '../middleware/audit';

export const authRouter = Router();

// Login
authRouter.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = db.prepare(`
    SELECT u.*, b.name as branch_name, b.code as branch_code,
           tp.id as teacher_profile_id,
           sp.id as student_profile_id
    FROM users u
    JOIN branches b ON u.branch_id = b.id
    LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
    LEFT JOIN student_profiles sp ON u.id = sp.user_id
    WHERE u.username = ?
  `).get(username) as any;

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or credentials.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  if (user.is_active !== 1) {
    return res.status(403).json({ error: 'Account is deactivated. Please contact college admin.' });
  }

  const tokenPayload = {
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    branch_id: user.branch_id,
    avatar_url: user.avatar_url,
    teacher_id: user.teacher_profile_id,
    student_id: user.student_profile_id
  };

  const token = generateToken(tokenPayload);

  logAudit({ user: tokenPayload } as AuthRequest, 'USER_LOGIN', 'users', user.id, { username: user.username, role: user.role });

  return res.json({
    token,
    user: {
      ...tokenPayload,
      branch_name: user.branch_name,
      branch_code: user.branch_code
    }
  });
});

// Get current user profile
authRouter.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  const user = db.prepare(`
    SELECT u.*, b.name as branch_name, b.code as branch_code, b.city as branch_city,
           tp.id as teacher_profile_id,
           sp.id as student_profile_id
    FROM users u
    JOIN branches b ON u.branch_id = b.id
    LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
    LEFT JOIN student_profiles sp ON u.id = sp.user_id
    WHERE u.id = ?
  `).get(req.user!.id) as any;

  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      branch_id: user.branch_id,
      branch_name: user.branch_name,
      branch_code: user.branch_code,
      branch_city: user.branch_city,
      avatar_url: user.avatar_url,
      teacher_id: user.teacher_profile_id,
      student_id: user.student_profile_id
    }
  });
});

// Demo login selector for instant testing of all roles
authRouter.get('/demo-accounts', (req: Request, res: Response) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.role, u.name, u.branch_id, b.name as branch_name, b.city as branch_city
    FROM users u
    JOIN branches b ON u.branch_id = b.id
    ORDER BY u.role ASC, u.name ASC
  `).all();

  return res.json({ users });
});
