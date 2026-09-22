import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { queryOne } from '../database/pgDb';

const JWT_SECRET = process.env.JWT_SECRET || 'sirmv_super_secret_jwt_key_2026';

export type UserRole =
  | 'ADMIN'
  | 'PRINCIPAL'
  | 'HOD'
  | 'TEACHER'
  | 'FLOOR_ATTENDER'
  | 'NON_TEACHING_STAFF'
  | 'GATE_STAFF'
  | 'WARDEN'
  | 'HEAD_WARDEN'
  | 'STUDENT'
  | 'PARENT';

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole | string;
  name: string;
  email?: string;
  phone?: string;
  branch_id: string;
  avatar_url?: string;
  teacher_id?: string;
  student_id?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    
    // Check if user still active
    const userRow = await queryOne<{ is_active: number }>('SELECT is_active FROM users WHERE id = $1', [decoded.id]);
    if (!userRow || userRow.is_active !== 1) {
      return res.status(401).json({ error: 'User account is inactive or not found.' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function requireRoles(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    if (!roles.includes(req.user.role) && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: `Forbidden: Access requires one of [${roles.join(', ')}] role.` });
    }
    next();
  };
}
