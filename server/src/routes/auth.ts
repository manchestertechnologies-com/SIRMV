import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { queryOne, query } from '../database/pgDb';
import { generateToken, authenticate, AuthRequest } from '../middleware/auth';
import { logAudit } from '../middleware/audit';

export const authRouter = Router();

// 1. Login (supports email or username)
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
      WHERE u.username = $1 OR LOWER(u.email) = LOWER($1)
    `, [identifier]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email/username or credentials.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email/username or password.' });
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

// 3. Switch active campus (Multi-Campus session update)
authRouter.post('/switch-branch', authenticate, async (req: AuthRequest, res: Response) => {
  const { branch_id } = req.body;
  if (!branch_id) {
    return res.status(400).json({ error: 'branch_id is required.' });
  }

  try {
    const branch = await queryOne(`SELECT * FROM branches WHERE id = $1`, [branch_id]);
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found.' });
    }

    return res.json({
      success: true,
      message: `Switched active campus to ${branch.name}`,
      branch
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. List Development Demo Accounts for Instant Role Testing
authRouter.get('/demo-accounts', async (req: Request, res: Response) => {
  try {
    const demoAccounts = [
      { email: 'admin.demo@college.test', role: 'ADMIN', label: 'System Administrator', name: 'Aarav Kulkarni (Admin)' },
      { email: 'principal.demo@college.test', role: 'PRINCIPAL', label: 'Campus Principal', name: 'Dr. B. N. Vishwanath (Principal)' },
      { email: 'hod.demo@college.test', role: 'HOD', label: 'Head of Department', name: 'Dr. A. S. Patil (Physics HOD)' },
      { email: 'teacher.demo@college.test', role: 'TEACHER', label: 'Academic Faculty', name: 'Mr. Anand Kumar (Physics Faculty)' },
      { email: 'floor.demo@college.test', role: 'FLOOR_ATTENDER', label: 'Floor Operations Attender', name: 'Ramesh Kumar (Floor Attender)' },
      { email: 'staff.demo@college.test', role: 'NON_TEACHING_STAFF', label: 'Non-Teaching / Operations Staff', name: 'Basavarajappa K (Office Staff)' },
      { email: 'warden.demo@college.test', role: 'WARDEN', label: 'Hostel Block Warden', name: 'Chandrashekhar M (Boys Hostel Warden)' },
      { email: 'headwarden.demo@college.test', role: 'HEAD_WARDEN', label: 'Chief / Head Warden', name: 'Dr. M. S. Siddalingaiah (Head Warden)' },
      { email: 'student.demo@college.test', role: 'STUDENT', label: 'Enrolled PU Student', name: 'Rahul Sharma (2PUC Student)' },
      { email: 'parent.demo@college.test', role: 'PARENT', label: 'Parent / Guardian', name: 'Mr. Rakesh Sharma (Parent)' }
    ];

    return res.json({ demoAccounts, defaultPassword: 'Demo@12345' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

