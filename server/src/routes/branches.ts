import { Router, Request, Response } from 'express';
import { query, queryOne } from '../database/pgDb';
import { authenticate } from '../middleware/auth';

export const branchesRouter = Router();

// List all branches (Davangere, Shivamogga, Ballari)
branchesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const branches = await query(`SELECT * FROM branches ORDER BY name ASC`);
    return res.json({ branches });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get branch academic metadata (classes, sections, batches, departments, subjects, rooms)
branchesRouter.get('/:branchId/meta', authenticate, async (req: Request, res: Response) => {
  try {
    const { branchId } = req.params;

    const branch = await queryOne(`SELECT * FROM branches WHERE id = $1`, [branchId]);
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    const classes = await query(`SELECT * FROM classes WHERE branch_id = $1`, [branchId]);
    const sections = await query(`
      SELECT s.*, c.name as class_name 
      FROM sections s 
      JOIN classes c ON s.class_id = c.id 
      WHERE c.branch_id = $1
    `, [branchId]);
    const batches = await query(`SELECT * FROM batches WHERE branch_id = $1`, [branchId]);
    const departments = await query(`SELECT * FROM departments WHERE branch_id = $1`, [branchId]);
    const subjects = await query(`
      SELECT s.*, d.name as department_name, d.code as department_code 
      FROM subjects s 
      JOIN departments d ON s.department_id = d.id 
      WHERE d.branch_id = $1
    `, [branchId]);
    const rooms = await query(`SELECT * FROM rooms WHERE branch_id = $1 ORDER BY floor ASC, room_number ASC`, [branchId]);

    return res.json({
      branch,
      classes,
      sections,
      batches,
      departments,
      subjects,
      rooms
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
