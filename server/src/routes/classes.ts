import { Router, Response } from 'express';
import { query, queryOne, execute } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import crypto from 'crypto';

export const classesRouter = Router();

// 1. List classes (with sections + student count) for a branch
classesRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;

  const classes = await query(`SELECT * FROM classes WHERE branch_id = $1 ORDER BY name ASC`, [branchId]);

  const withDetails = await Promise.all(classes.map(async (c: any) => {
    const sections = await query(`SELECT * FROM sections WHERE class_id = $1 ORDER BY name ASC`, [c.id]);
    const studentCountRow = await queryOne<any>(`SELECT COUNT(*) as count FROM student_profiles WHERE class_id = $1`, [c.id]);
    const sectionsWithCounts = await Promise.all(sections.map(async (s: any) => {
      const countRow = await queryOne<any>(`SELECT COUNT(*) as count FROM student_profiles WHERE section_id = $1`, [s.id]);
      return { ...s, studentCount: Number(countRow?.count || 0) };
    }));
    return { ...c, sections: sectionsWithCounts, studentCount: Number(studentCountRow?.count || 0) };
  }));

  return res.json({ classes: withDetails });
});

// 2. Create class
classesRouter.post('/', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const { name, branch_id } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name is required.' });
  }

  const id = 'cls-' + crypto.randomUUID();
  await execute(`INSERT INTO classes (id, branch_id, name) VALUES ($1, $2, $3)`, [id, branch_id || req.user!.branch_id, name]);

  await logAudit(req, 'CLASS_CREATED', 'classes', id, { name });
  return res.status(201).json({ success: true, id, message: 'Class created successfully.' });
});

// 3. Update class name
classesRouter.put('/:id', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;

  const cls = await queryOne(`SELECT id FROM classes WHERE id = $1`, [id]);
  if (!cls) {
    return res.status(404).json({ error: 'Class not found.' });
  }

  await execute(`UPDATE classes SET name = COALESCE($1, name) WHERE id = $2`, [name, id]);
  await logAudit(req, 'CLASS_UPDATED', 'classes', id, { name });
  return res.json({ success: true, message: 'Class updated successfully.' });
});

// 4. Delete class
classesRouter.delete('/:id', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const countRow = await queryOne<any>(`SELECT COUNT(*) as count FROM student_profiles WHERE class_id = $1`, [id]);
  const studentCount = Number(countRow?.count || 0);
  if (studentCount > 0) {
    return res.status(400).json({ error: `Cannot delete: ${studentCount} student(s) are still enrolled in this class.` });
  }

  await execute(`DELETE FROM classes WHERE id = $1`, [id]);
  await logAudit(req, 'CLASS_DELETED', 'classes', id, {});
  return res.json({ success: true, message: 'Class deleted successfully.' });
});

// 5. Add section to a class
classesRouter.post('/:id/sections', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required.' });
  }

  const cls = await queryOne(`SELECT id FROM classes WHERE id = $1`, [id]);
  if (!cls) {
    return res.status(404).json({ error: 'Class not found.' });
  }

  const sectionId = 'sec-' + crypto.randomUUID();
  await execute(`INSERT INTO sections (id, class_id, name) VALUES ($1, $2, $3)`, [sectionId, id, name]);

  await logAudit(req, 'SECTION_CREATED', 'sections', sectionId, { class_id: id, name });
  return res.status(201).json({ success: true, id: sectionId, message: 'Section added successfully.' });
});

// 6. Delete a section
classesRouter.delete('/sections/:sectionId', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const { sectionId } = req.params;
  const countRow = await queryOne<any>(`SELECT COUNT(*) as count FROM student_profiles WHERE section_id = $1`, [sectionId]);
  const studentCount = Number(countRow?.count || 0);
  if (studentCount > 0) {
    return res.status(400).json({ error: `Cannot delete: ${studentCount} student(s) are still enrolled in this section.` });
  }

  await execute(`DELETE FROM sections WHERE id = $1`, [sectionId]);
  await logAudit(req, 'SECTION_DELETED', 'sections', sectionId, {});
  return res.json({ success: true, message: 'Section deleted successfully.' });
});
