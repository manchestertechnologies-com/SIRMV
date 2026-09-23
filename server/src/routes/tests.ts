import { Router, Response } from 'express';
import { query, queryOne, execute } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export const testsRouter = Router();

const questionPapersDir = path.join(__dirname, '..', '..', 'uploads', 'question_papers');
if (!fs.existsSync(questionPapersDir)) {
  fs.mkdirSync(questionPapersDir, { recursive: true });
}
const paperUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, questionPapersDir),
    filename: (req, file, cb) => cb(null, 'paper-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname))
  })
});

// 1. List tests — filters: mode (ONLINE/OFFLINE), class_id, batch_id, status
testsRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;
  const { mode, class_id, batch_id, status } = req.query as Record<string, string>;

  let sql = `
    SELECT t.*, c.name as class_name, b.name as batch_name, s.name as subject_name,
           (SELECT COUNT(*) FROM test_questions WHERE test_id = t.id) as "questionCount",
           (SELECT COUNT(*) FROM test_submissions WHERE test_id = t.id) as "submissionCount"
    FROM tests t
    JOIN classes c ON t.class_id = c.id
    JOIN batches b ON t.batch_id = b.id
    LEFT JOIN subjects s ON t.subject_id = s.id
    WHERE t.branch_id = $1
  `;
  const params: any[] = [branchId];

  if (mode) { params.push(mode); sql += ` AND t.mode = $${params.length}`; }
  if (class_id) { params.push(class_id); sql += ` AND t.class_id = $${params.length}`; }
  if (batch_id) { params.push(batch_id); sql += ` AND t.batch_id = $${params.length}`; }
  if (status) { params.push(status); sql += ` AND t.status = $${params.length}`; }
  sql += ` ORDER BY t.scheduled_date DESC`;

  const tests = await query(sql, params);
  return res.json({ tests });
});

// 2. Get test detail (with questions for ONLINE tests)
testsRouter.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const test = await queryOne<any>(`
    SELECT t.*, c.name as class_name, b.name as batch_name, s.name as subject_name
    FROM tests t
    JOIN classes c ON t.class_id = c.id
    JOIN batches b ON t.batch_id = b.id
    LEFT JOIN subjects s ON t.subject_id = s.id
    WHERE t.id = $1
  `, [id]);

  if (!test) {
    return res.status(404).json({ error: 'Test not found.' });
  }

  let questions: any[] = [];
  if (test.mode === 'ONLINE') {
    // Students shouldn't see correct_option before/while attempting
    const includeAnswers = req.user!.role !== 'STUDENT';
    questions = await query(`
      SELECT id, question_text, option_a, option_b, option_c, option_d, marks, sort_order
        ${includeAnswers ? ', correct_option' : ''}
      FROM test_questions WHERE test_id = $1 ORDER BY sort_order ASC
    `, [id]);
  }

  return res.json({ test, questions });
});

// 3. Create a test (ONLINE or OFFLINE)
testsRouter.post('/', authenticate, requireRoles('TEACHER', 'HOD', 'ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const {
    title, mode, class_id, batch_id, subject_id,
    scheduled_date, start_time, duration_minutes, total_marks, branch_id
  } = req.body;

  if (!title || !mode || !class_id || !batch_id || !scheduled_date) {
    return res.status(400).json({ error: 'title, mode, class_id, batch_id and scheduled_date are required.' });
  }
  if (!['ONLINE', 'OFFLINE'].includes(mode)) {
    return res.status(400).json({ error: `mode must be ONLINE or OFFLINE.` });
  }

  const id = 'test-' + crypto.randomUUID();
  await execute(`
    INSERT INTO tests (id, branch_id, title, mode, class_id, batch_id, subject_id, scheduled_date, start_time, duration_minutes, total_marks, status, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'SCHEDULED', $12)
  `, [
    id, branch_id || req.user!.branch_id, title, mode, class_id, batch_id, subject_id || null,
    scheduled_date, start_time || null, duration_minutes || 60, total_marks || 100, req.user!.id
  ]);

  await logAudit(req, 'TEST_CREATED', 'tests', id, { title, mode, class_id, batch_id, scheduled_date });

  return res.status(201).json({ success: true, id, message: `${mode === 'ONLINE' ? 'Online' : 'Offline'} test created successfully.` });
});

// 4. Update test
testsRouter.put('/:id', authenticate, requireRoles('TEACHER', 'HOD', 'ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, scheduled_date, start_time, duration_minutes, total_marks, status } = req.body;

  const test = await queryOne(`SELECT id FROM tests WHERE id = $1`, [id]);
  if (!test) {
    return res.status(404).json({ error: 'Test not found.' });
  }

  await execute(`
    UPDATE tests SET
      title = COALESCE($1, title),
      scheduled_date = COALESCE($2, scheduled_date),
      start_time = COALESCE($3, start_time),
      duration_minutes = COALESCE($4, duration_minutes),
      total_marks = COALESCE($5, total_marks),
      status = COALESCE($6, status)
    WHERE id = $7
  `, [title, scheduled_date, start_time, duration_minutes, total_marks, status, id]);

  await logAudit(req, 'TEST_UPDATED', 'tests', id, { title, status });
  return res.json({ success: true, message: 'Test updated successfully.' });
});

// 5. Delete test
testsRouter.delete('/:id', authenticate, requireRoles('TEACHER', 'HOD', 'ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  await execute(`DELETE FROM tests WHERE id = $1`, [id]);
  await logAudit(req, 'TEST_DELETED', 'tests', id, {});
  return res.json({ success: true, message: 'Test deleted successfully.' });
});

// 6. Upload offline question paper
testsRouter.post('/:id/upload-paper', authenticate, requireRoles('TEACHER', 'HOD', 'ADMIN'), paperUpload.single('paper'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!req.file) {
    return res.status(400).json({ error: 'paper file is required.' });
  }

  const fileUrl = `/uploads/question_papers/${req.file.filename}`;
  await execute(`UPDATE tests SET question_paper_url = $1 WHERE id = $2`, [fileUrl, id]);

  await logAudit(req, 'TEST_PAPER_UPLOADED', 'tests', id, { fileUrl });
  return res.json({ success: true, fileUrl, message: 'Question paper uploaded successfully.' });
});

// 7. Add a question to an ONLINE test
testsRouter.post('/:id/questions', authenticate, requireRoles('TEACHER', 'HOD', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { question_text, option_a, option_b, option_c, option_d, correct_option, marks } = req.body;

  const test = await queryOne<any>(`SELECT mode FROM tests WHERE id = $1`, [id]);
  if (!test) {
    return res.status(404).json({ error: 'Test not found.' });
  }
  if (test.mode !== 'ONLINE') {
    return res.status(400).json({ error: 'Questions can only be added to ONLINE tests.' });
  }
  if (!question_text || !option_a || !option_b || !option_c || !option_d || !correct_option) {
    return res.status(400).json({ error: 'question_text, all four options and correct_option are required.' });
  }
  if (!['A', 'B', 'C', 'D'].includes(correct_option)) {
    return res.status(400).json({ error: 'correct_option must be A, B, C or D.' });
  }

  const countRow = await queryOne<any>(`SELECT COUNT(*) as count FROM test_questions WHERE test_id = $1`, [id]);
  const sortOrder = Number(countRow?.count || 0);
  const qId = 'tq-' + crypto.randomUUID();

  await execute(`
    INSERT INTO test_questions (id, test_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [qId, id, question_text, option_a, option_b, option_c, option_d, correct_option, marks || 1, sortOrder]);

  await logAudit(req, 'TEST_QUESTION_ADDED', 'test_questions', qId, { test_id: id });
  return res.status(201).json({ success: true, id: qId, message: 'Question added successfully.' });
});

// 8. Update a question
testsRouter.put('/questions/:qid', authenticate, requireRoles('TEACHER', 'HOD', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const { qid } = req.params;
  const { question_text, option_a, option_b, option_c, option_d, correct_option, marks } = req.body;

  await execute(`
    UPDATE test_questions SET
      question_text = COALESCE($1, question_text),
      option_a = COALESCE($2, option_a),
      option_b = COALESCE($3, option_b),
      option_c = COALESCE($4, option_c),
      option_d = COALESCE($5, option_d),
      correct_option = COALESCE($6, correct_option),
      marks = COALESCE($7, marks)
    WHERE id = $8
  `, [question_text, option_a, option_b, option_c, option_d, correct_option, marks, qid]);

  await logAudit(req, 'TEST_QUESTION_UPDATED', 'test_questions', qid, {});
  return res.json({ success: true, message: 'Question updated successfully.' });
});

// 9. Delete a question
testsRouter.delete('/questions/:qid', authenticate, requireRoles('TEACHER', 'HOD', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const { qid } = req.params;
  await execute(`DELETE FROM test_questions WHERE id = $1`, [qid]);
  await logAudit(req, 'TEST_QUESTION_DELETED', 'test_questions', qid, {});
  return res.json({ success: true, message: 'Question removed successfully.' });
});

// 10. Student submits answers for an ONLINE test — auto-graded against correct_option
testsRouter.post('/:id/submit', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { student_id, answers } = req.body; // answers: { [questionId]: 'A' | 'B' | 'C' | 'D' }

  const targetStudentId = student_id || req.user!.student_id;
  if (!targetStudentId) {
    return res.status(400).json({ error: 'student_id is required.' });
  }
  if (req.user!.role === 'STUDENT' && req.user!.student_id !== targetStudentId) {
    return res.status(403).json({ error: 'Access denied: you can only submit your own test.' });
  }

  const test = await queryOne<any>(`SELECT * FROM tests WHERE id = $1`, [id]);
  if (!test) {
    return res.status(404).json({ error: 'Test not found.' });
  }
  if (test.mode !== 'ONLINE') {
    return res.status(400).json({ error: 'Only ONLINE tests accept digital submissions.' });
  }

  const questions = await query<any>(`SELECT * FROM test_questions WHERE test_id = $1`, [id]);
  let marksObtained = 0;
  for (const q of questions) {
    if (answers && answers[q.id] === q.correct_option) {
      marksObtained += Number(q.marks);
    }
  }

  const submissionId = 'tsub-' + crypto.randomUUID();
  await execute(`
    INSERT INTO test_submissions (id, test_id, student_id, marks_obtained, answers_json, submitted_at)
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    ON CONFLICT (test_id, student_id) DO UPDATE SET
      marks_obtained = excluded.marks_obtained, answers_json = excluded.answers_json, submitted_at = CURRENT_TIMESTAMP
  `, [submissionId, id, targetStudentId, marksObtained, JSON.stringify(answers || {})]);

  await logAudit(req, 'TEST_SUBMITTED', 'test_submissions', submissionId, { test_id: id, student_id: targetStudentId, marksObtained });

  return res.json({ success: true, marksObtained, totalMarks: test.total_marks, message: 'Test submitted and auto-graded successfully.' });
});

// 11. Test results / leaderboard
testsRouter.get('/:id/results', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const results = await query(`
    SELECT ts.*, sp.name as student_name, sp.register_number
    FROM test_submissions ts
    JOIN student_profiles sp ON ts.student_id = sp.id
    WHERE ts.test_id = $1
    ORDER BY ts.marks_obtained DESC
  `, [id]);

  return res.json({ results });
});
