import { Router, Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import crypto from 'crypto';

export const batchesRouter = Router();

// 1. List batches with student counts
batchesRouter.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;

  const batches = db.prepare(`SELECT * FROM batches WHERE branch_id = ? ORDER BY name ASC`).all(branchId) as any[];
  const withCounts = batches.map((b) => ({
    ...b,
    studentCount: (db.prepare(`SELECT COUNT(*) as count FROM student_profiles WHERE batch_id = ?`).get(b.id) as any).count
  }));

  return res.json({ batches: withCounts });
});

// 2. Batch detail — students grouped by class/section
batchesRouter.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const batch = db.prepare(`SELECT * FROM batches WHERE id = ?`).get(id) as any;
  if (!batch) {
    return res.status(404).json({ error: 'Batch not found.' });
  }

  const students = db.prepare(`
    SELECT sp.id, sp.register_number, sp.name, sp.phone, sp.admission_type,
           c.name as class_name, sec.name as section_name
    FROM student_profiles sp
    JOIN classes c ON sp.class_id = c.id
    JOIN sections sec ON sp.section_id = sec.id
    WHERE sp.batch_id = ?
    ORDER BY c.name ASC, sec.name ASC, sp.name ASC
  `).all(id);

  return res.json({ batch, students });
});

// 3. Create batch
batchesRouter.post('/', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), (req: AuthRequest, res: Response) => {
  const { name, code, branch_id } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: 'name and code are required.' });
  }

  const id = 'batch-' + crypto.randomUUID();
  db.prepare(`INSERT INTO batches (id, branch_id, name, code) VALUES (?, ?, ?, ?)`).run(id, branch_id || req.user!.branch_id, name, code);

  logAudit(req, 'BATCH_CREATED', 'batches', id, { name, code });
  return res.status(201).json({ success: true, id, message: 'Batch created successfully.' });
});

// 4. Update batch
batchesRouter.put('/:id', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, code } = req.body;

  const batch = db.prepare(`SELECT id FROM batches WHERE id = ?`).get(id);
  if (!batch) {
    return res.status(404).json({ error: 'Batch not found.' });
  }

  db.prepare(`UPDATE batches SET name = COALESCE(?, name), code = COALESCE(?, code) WHERE id = ?`).run(name, code, id);
  logAudit(req, 'BATCH_UPDATED', 'batches', id, { name, code });
  return res.json({ success: true, message: 'Batch updated successfully.' });
});

// 5. Delete batch
batchesRouter.delete('/:id', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const studentCount = (db.prepare(`SELECT COUNT(*) as count FROM student_profiles WHERE batch_id = ?`).get(id) as any).count;
  if (studentCount > 0) {
    return res.status(400).json({ error: `Cannot delete: ${studentCount} student(s) are still enrolled in this batch.` });
  }

  db.prepare(`DELETE FROM batches WHERE id = ?`).run(id);
  logAudit(req, 'BATCH_DELETED', 'batches', id, {});
  return res.json({ success: true, message: 'Batch deleted successfully.' });
});
