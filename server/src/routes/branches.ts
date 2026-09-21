import { Router, Request, Response } from 'express';
import { db } from '../database/db';
import { authenticate } from '../middleware/auth';

export const branchesRouter = Router();

// List all branches (Davangere, Shivamogga, Ballari)
branchesRouter.get('/', (req: Request, res: Response) => {
  const branches = db.prepare(`SELECT * FROM branches ORDER BY name ASC`).all();
  return res.json({ branches });
});

// Get branch academic metadata (classes, sections, batches, departments, subjects, rooms)
branchesRouter.get('/:branchId/meta', authenticate, (req: Request, res: Response) => {
  const { branchId } = req.params;

  const branch = db.prepare(`SELECT * FROM branches WHERE id = ?`).get(branchId);
  if (!branch) {
    return res.status(404).json({ error: 'Branch not found' });
  }

  const classes = db.prepare(`SELECT * FROM classes WHERE branch_id = ?`).all(branchId);
  const sections = db.prepare(`
    SELECT s.*, c.name as class_name 
    FROM sections s 
    JOIN classes c ON s.class_id = c.id 
    WHERE c.branch_id = ?
  `).all(branchId);
  const batches = db.prepare(`SELECT * FROM batches WHERE branch_id = ?`).all(branchId);
  const departments = db.prepare(`SELECT * FROM departments WHERE branch_id = ?`).all(branchId);
  const subjects = db.prepare(`
    SELECT s.*, d.name as department_name, d.code as department_code 
    FROM subjects s 
    JOIN departments d ON s.department_id = d.id 
    WHERE d.branch_id = ?
  `).all(branchId);
  const rooms = db.prepare(`SELECT * FROM rooms WHERE branch_id = ? ORDER BY floor ASC, room_number ASC`).all(branchId);

  return res.json({
    branch,
    classes,
    sections,
    batches,
    departments,
    subjects,
    rooms
  });
});
