import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { queryOne, query } from '../database/pgDb';
import { generateToken, authenticate, AuthRequest } from '../middleware/auth';
import { logAudit } from '../middleware/audit';

export const authRouter = Router();

// 1. Login (supports email or username with testing password 123456)
authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, username, password } = req.body;
  const identifier = (email || username || req.body.identifier || '').trim();

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email/Username and password are required.' });
  }

  try {
    const user = await queryOne(`
      SELECT u.*, b.name as branch_name, b.code as branch_code,
             tp.id as teacher_profile_id,
             sp.id as student_profile_id
      FROM users u
      JOIN branches b ON u.branch_id = b.id
      LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE u.username = $1 
         OR LOWER(u.email) = LOWER($1)
         OR u.username = LOWER(SPLIT_PART($1, '@', 1))
         OR LOWER(u.role) = LOWER($1)
    `, [identifier]);

    if (!user) {
      return res.status(401).json({ error: 'User account not found.' });
    }

    // Testing password '123456' or 'Demo@12345' or standard bcrypt hash verification
    const isMatch = password === '123456' || password === 'Demo@12345' || bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password. Use test password 123456.' });
    }

    if (user.is_active !== 1) {
      return res.status(403).json({ error: 'Account is deactivated. Please contact campus administration.' });
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

    await logAudit({ user: tokenPayload } as AuthRequest, 'USER_LOGIN', 'users', user.id, {
      username: user.username,
      email: user.email,
      role: user.role
    });

    return res.json({
      token,
      user: {
        ...tokenPayload,
        branch_name: user.branch_name,
        branch_code: user.branch_code
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Get current user profile
authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await queryOne(`
      SELECT u.*, b.name as branch_name, b.code as branch_code, b.city as branch_city,
             tp.id as teacher_profile_id,
             sp.id as student_profile_id
      FROM users u
      JOIN branches b ON u.branch_id = b.id
      LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE u.id = $1
    `, [req.user!.id]);

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
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Clean Institutional Role Accounts for Testing
authRouter.get('/demo-accounts', async (req: Request, res: Response) => {
  try {
    const accounts = [
      { email: 'admin@sirmv.edu.in', role: 'ADMIN', label: 'Administrator', title: 'Campus Admin' },
      { email: 'principal@sirmv.edu.in', role: 'PRINCIPAL', label: 'Principal', title: 'College Principal' },
      { email: 'hod.physics@sirmv.edu.in', role: 'HOD', label: 'HOD Physics', title: 'Department Head' },
      { email: 'lecturer@sirmv.edu.in', role: 'TEACHER', label: 'Faculty Lecturer', title: 'Teaching Faculty' },
      { email: 'attender@sirmv.edu.in', role: 'FLOOR_ATTENDER', label: 'Floor Attender', title: 'Academic Operations' },
      { email: 'staff@sirmv.edu.in', role: 'NON_TEACHING_STAFF', label: 'Office Staff', title: 'Administration' },
      { email: 'warden@sirmv.edu.in', role: 'WARDEN', label: 'Hostel Warden', title: 'Residential Services' },
      { email: 'headwarden@sirmv.edu.in', role: 'HEAD_WARDEN', label: 'Head Warden', title: 'Hostel Administration' },
      { email: 'student@sirmv.edu.in', role: 'STUDENT', label: 'Student Portal', title: 'PU Student' },
      { email: 'parent@sirmv.edu.in', role: 'PARENT', label: 'Parent Portal', title: 'Guardian' }
    ];

    return res.json({ accounts, defaultPassword: '123456' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
