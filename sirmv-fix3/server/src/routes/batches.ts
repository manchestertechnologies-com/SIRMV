import { Router, Response } from 'express';
import { query, queryOne, execute } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import crypto from 'crypto';

export const batchesRouter = Router();

// Preset batch name/code pairs offered on the "Add Batch" dropdown.
export const BATCH_PRESETS = [
  { name: 'NEET Batch', code: 'NEET' },
  { name: 'JEE Batch', code: 'JEE' },
  { name: 'KCET Batch', code: 'KCET' },
  { name: 'Regular PU', code: 'REG' }
];

// 0. Batch name/code presets not already in use for this branch
batchesRouter.get('/name-presets', authenticate, async (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;
  const existing = await query<any>(`SELECT code FROM batches WHERE branch_id = $1`, [branchId]);
  const existingCodes = new Set(existing.map((b: any) => b.code));
  return res.json({ presets: BATCH_PRESETS.filter((p) => !existingCodes.has(p.code)) });
});

// 1. List batches with student counts
batchesRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;

  const batches = await query(`SELECT * FROM batches WHERE branch_id = $1 ORDER BY name ASC`, [branchId]);
  const withCounts = await Promise.all(batches.map(async (b: any) => {
    const countRow = await queryOne<any>(`SELECT COUNT(*) as count FROM student_profiles WHERE batch_id = $1`, [b.id]);
    return { ...b, studentCount: Number(countRow?.count || 0) };
  }));

  return res.json({ batches: withCounts });
});

// 2. Batch detail — students grouped by class/section, plus which
//    class/section combinations this batch covers
batchesRouter.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const batch = await queryOne<any>(`SELECT * FROM batches WHERE id = $1`, [id]);
  if (!batch) {
    return res.status(404).json({ error: 'Batch not found.' });
  }

  const students = await query(`
    SELECT sp.id, sp.register_number, sp.name, sp.phone, sp.admission_type,
           c.name as class_name, sec.name as section_name
    FROM student_profiles sp
    JOIN classes c ON sp.class_id = c.id
    JOIN sections sec ON sp.section_id = sec.id
    WHERE sp.batch_id = $1
    ORDER BY c.name ASC, sec.name ASC, sp.name ASC
  `, [id]);

  // Which class/section combinations this batch actually covers, derived
  // automatically from real student registrations (no manual step needed —
  // a class/section becomes "covered" the moment a student in it is
  // registered into this batch).
  const coverage = await query(`
    SELECT DISTINCT sp.class_id, sp.section_id, c.name as class_name, sec.name as section_name
    FROM student_profiles sp
    JOIN classes c ON sp.class_id = c.id
    JOIN sections sec ON sp.section_id = sec.id
    WHERE sp.batch_id = $1
    ORDER BY c.name ASC, sec.name ASC
  `, [id]);

  // Sections that have this batch set as their "Default Batch" on the
  // Classes page — the upcoming/expected coverage, even before any student
  // has actually been registered into this batch yet.
  const defaultSections = await query(`
    SELECT sec.class_id, sec.id as section_id, c.name as class_name, sec.name as section_name
    FROM sections sec
    JOIN classes c ON sec.class_id = c.id
    WHERE sec.default_batch_id = $1
    ORDER BY c.name ASC, sec.name ASC
  `, [id]);

  return res.json({ batch, students, coverage, defaultSections });
});

// 3. Create batch
batchesRouter.post('/', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const { name, code, branch_id } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: 'name and code are required.' });
  }

  const id = 'batch-' + crypto.randomUUID();
  await execute(`INSERT INTO batches (id, branch_id, name, code) VALUES ($1, $2, $3, $4)`, [id, branch_id || req.user!.branch_id, name, code]);

  await logAudit(req, 'BATCH_CREATED', 'batches', id, { name, code });
  return res.status(201).json({ success: true, id, message: 'Batch created successfully.' });
});

// 4. Update batch
batchesRouter.put('/:id', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, code } = req.body;

  const batch = await queryOne(`SELECT id FROM batches WHERE id = $1`, [id]);
  if (!batch) {
    return res.status(404).json({ error: 'Batch not found.' });
  }

  await execute(`UPDATE batches SET name = COALESCE($1, name), code = COALESCE($2, code) WHERE id = $3`, [name, code, id]);
  await logAudit(req, 'BATCH_UPDATED', 'batches', id, { name, code });
  return res.json({ success: true, message: 'Batch updated successfully.' });
});

// 5. Delete batch
batchesRouter.delete('/:id', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const countRow = await queryOne<any>(`SELECT COUNT(*) as count FROM student_profiles WHERE batch_id = $1`, [id]);
  const studentCount = Number(countRow?.count || 0);
  if (studentCount > 0) {
    return res.status(400).json({ error: `Cannot delete: ${studentCount} student(s) are still enrolled in this batch.` });
  }

  await execute(`DELETE FROM batches WHERE id = $1`, [id]);
  await logAudit(req, 'BATCH_DELETED', 'batches', id, {});
  return res.json({ success: true, message: 'Batch deleted successfully.' });
});
