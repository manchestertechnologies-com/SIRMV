import { Router, Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import crypto from 'crypto';

export const classesRouter = Router();

// 1. List classes (with sections + student count) for a branch
classesRouter.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;

  const classes = db.prepare(`SELECT * FROM classes WHERE branch_id = ? ORDER BY name ASC`).all(branchId) as any[];

  const withDetails = classes.map((c) => {
    const sections = db.prepare(`SELECT * FROM sections WHERE class_id = ? ORDER BY name ASC`).all(c.id) as any[];
    const studentCount = (db.prepare(`SELECT COUNT(*) as count FROM student_profiles WHERE class_id = ?`).get(c.id) as any).count;
    const sectionsWithCounts = sections.map((s) => ({
      ...s,
      studentCount: (db.prepare(`SELECT COUNT(*) as count FROM student_profiles WHERE section_id = ?`).get(s.id) as any).count
    }));
    return { ...c, sections: sectionsWithCounts, studentCount };
  });

  return res.json({ classes: withDetails });
});

// 2. Create class
classesRouter.post('/', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), (req: AuthRequest, res: Response) => {
  const { name, branch_id } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name is required.' });
  }

  const id = 'cls-' + crypto.randomUUID();
  db.prepare(`INSERT INTO classes (id, branch_id, name) VALUES (?, ?, ?)`).run(id, branch_id || req.user!.branch_id, name);

  logAudit(req, 'CLASS_CREATED', 'classes', id, { name });
  return res.status(201).json({ success: true, id, message: 'Class created successfully.' });
});

// 3. Update class name
classesRouter.put('/:id', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;

  const cls = db.prepare(`SELECT id FROM classes WHERE id = ?`).get(id);
  if (!cls) {
    return res.status(404).json({ error: 'Class not found.' });
  }

  db.prepare(`UPDATE classes SET name = COALESCE(?, name) WHERE id = ?`).run(name, id);
  logAudit(req, 'CLASS_UPDATED', 'classes', id, { name });
  return res.json({ success: true, message: 'Class updated successfully.' });
});

// 4. Delete class
classesRouter.delete('/:id', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const studentCount = (db.prepare(`SELECT COUNT(*) as count FROM student_profiles WHERE class_id = ?`).get(id) as any).count;
  if (studentCount > 0) {
    return res.status(400).json({ error: `Cannot delete: ${studentCount} student(s) are still enrolled in this class.` });
  }

  db.prepare(`DELETE FROM classes WHERE id = ?`).run(id);
  logAudit(req, 'CLASS_DELETED', 'classes', id, {});
  return res.json({ success: true, message: 'Class deleted successfully.' });
});

// 5. Add section to a class
classesRouter.post('/:id/sections', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required.' });
  }

  const cls = db.prepare(`SELECT id FROM classes WHERE id = ?`).get(id);
  if (!cls) {
    return res.status(404).json({ error: 'Class not found.' });
  }

  const sectionId = 'sec-' + crypto.randomUUID();
  db.prepare(`INSERT INTO sections (id, class_id, name) VALUES (?, ?, ?)`).run(sectionId, id, name);

  logAudit(req, 'SECTION_CREATED', 'sections', sectionId, { class_id: id, name });
  return res.status(201).json({ success: true, id: sectionId, message: 'Section added successfully.' });
});

// 6. Delete a section
classesRouter.delete('/sections/:sectionId', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), (req: AuthRequest, res: Response) => {
  const { sectionId } = req.params;
  const studentCount = (db.prepare(`SELECT COUNT(*) as count FROM student_profiles WHERE section_id = ?`).get(sectionId) as any).count;
  if (studentCount > 0) {
    return res.status(400).json({ error: `Cannot delete: ${studentCount} student(s) are still enrolled in this section.` });
  }

  db.prepare(`DELETE FROM sections WHERE id = ?`).run(sectionId);
  logAudit(req, 'SECTION_DELETED', 'sections', sectionId, {});
  return res.json({ success: true, message: 'Section deleted successfully.' });
});
