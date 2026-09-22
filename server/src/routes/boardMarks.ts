import { Router, Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export const boardMarksRouter = Router();

const EXAM_TYPE = 'Board Exam';

const evaluatedPapersDir = path.join(__dirname, '..', '..', 'uploads', 'evaluated_papers');
if (!fs.existsSync(evaluatedPapersDir)) {
  fs.mkdirSync(evaluatedPapersDir, { recursive: true });
}
const paperUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, evaluatedPapersDir),
    filename: (req, file, cb) => cb(null, 'board-paper-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname))
  })
});

// 1. List board exam cycles (Cycle 1 / Cycle 2 / Cycle 3) for a branch
boardMarksRouter.get('/cycles', authenticate, (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;
  const { academic_year } = req.query as Record<string, string>;

  let query = `SELECT * FROM exams WHERE branch_id = ? AND exam_type = ?`;
  const params: any[] = [branchId, EXAM_TYPE];
  if (academic_year) {
    query += ` AND academic_year = ?`;
    params.push(academic_year);
  }
  query += ` ORDER BY start_date DESC`;

  const cycles = db.prepare(query).all(...params);
  return res.json({ cycles });
});

// 2. Create a new board exam cycle
boardMarksRouter.post('/cycles', authenticate, requireRoles('TEACHER', 'HOD', 'ADMIN', 'PRINCIPAL'), (req: AuthRequest, res: Response) => {
  const { name, academic_year, start_date, end_date, branch_id } = req.body;

  if (!name || !academic_year || !start_date || !end_date) {
    return res.status(400).json({ error: 'name (e.g. "Cycle 1"), academic_year, start_date and end_date are required.' });
  }

  const id = 'exam-board-' + crypto.randomUUID();
  db.prepare(`
    INSERT INTO exams (id, branch_id, name, exam_type, academic_year, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, branch_id || req.user!.branch_id, name, EXAM_TYPE, academic_year, start_date, end_date);

  logAudit(req, 'BOARD_CYCLE_CREATED', 'exams', id, { name, academic_year });
  return res.status(201).json({ success: true, id, message: 'Board exam cycle created successfully.' });
});

// 3. List subjects configured for a cycle (PCMB / CS / Electronics), with max/passing marks
boardMarksRouter.get('/cycles/:examId/subjects', authenticate, (req: AuthRequest, res: Response) => {
  const { examId } = req.params;
  const subjects = db.prepare(`
    SELECT es.*, s.name as subject_name, s.code as subject_code, c.name as class_name
    FROM exam_subjects es
    JOIN subjects s ON es.subject_id = s.id
    JOIN classes c ON es.class_id = c.id
    WHERE es.exam_id = ?
    ORDER BY s.name ASC
  `).all(examId);

  return res.json({ subjects });
});

// 4. Add a subject (e.g. Physics, Chemistry, Maths, Biology, Computer Science, Electronics) to a cycle
boardMarksRouter.post('/cycles/:examId/subjects', authenticate, requireRoles('TEACHER', 'HOD', 'ADMIN'), (req: AuthRequest, res: Response) => {
  const { examId } = req.params;
  const { subject_id, class_id, max_marks, passing_marks, exam_date } = req.body;

  if (!subject_id || !class_id) {
    return res.status(400).json({ error: 'subject_id and class_id are required.' });
  }

  const id = 'es-board-' + crypto.randomUUID();
  db.prepare(`
    INSERT INTO exam_subjects (id, exam_id, subject_id, class_id, max_marks, passing_marks, exam_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, examId, subject_id, class_id, max_marks || 100, passing_marks || 35, exam_date || null);

  logAudit(req, 'BOARD_CYCLE_SUBJECT_ADDED', 'exam_subjects', id, { examId, subject_id, class_id });
  return res.status(201).json({ success: true, id, message: 'Subject added to cycle successfully.' });
});

// 5. Marks entry sheet for one cycle-subject — every student in that class with any existing marks
boardMarksRouter.get('/entry/:examSubjectId', authenticate, requireRoles('TEACHER', 'HOD', 'ADMIN'), (req: AuthRequest, res: Response) => {
  const { examSubjectId } = req.params;

  const examSubject = db.prepare(`
    SELECT es.*, s.name as subject_name, c.name as class_name, e.name as exam_name
    FROM exam_subjects es
    JOIN subjects s ON es.subject_id = s.id
    JOIN classes c ON es.class_id = c.id
    JOIN exams e ON es.exam_id = e.id
    WHERE es.id = ?
  `).get(examSubjectId) as any;

  if (!examSubject) {
    return res.status(404).json({ error: 'Cycle subject not found.' });
  }

  const students = db.prepare(`
    SELECT sp.id as student_id, sp.register_number, sp.name, sec.name as section_name,
           sm.id as marks_id, sm.marks_obtained, sm.grade, sm.teacher_remarks,
           ep.file_url as evaluated_paper_url
    FROM student_profiles sp
    JOIN sections sec ON sp.section_id = sec.id
    LEFT JOIN student_marks sm ON sm.exam_subject_id = ? AND sm.student_id = sp.id
    LEFT JOIN evaluated_papers ep ON ep.exam_subject_id = ? AND ep.student_id = sp.id
    WHERE sp.class_id = ?
    ORDER BY sec.name ASC, sp.name ASC
  `).all(examSubjectId, examSubjectId, examSubject.class_id);

  return res.json({ examSubject, students });
});

// 6. Bulk save marks for a cycle-subject
boardMarksRouter.post('/entry/:examSubjectId', authenticate, requireRoles('TEACHER', 'HOD', 'ADMIN'), (req: AuthRequest, res: Response) => {
  const { examSubjectId } = req.params;
  const { records } = req.body; // Array<{ student_id, marks_obtained, grade?, teacher_remarks? }>

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'records array is required.' });
  }

  const upsertStmt = db.prepare(`
    INSERT INTO student_marks (id, exam_subject_id, student_id, marks_obtained, grade, teacher_remarks)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(exam_subject_id, student_id) DO UPDATE SET
      marks_obtained = excluded.marks_obtained,
      grade = excluded.grade,
      teacher_remarks = excluded.teacher_remarks
  `);

  const saveTx = db.transaction((rows: any[]) => {
    for (const r of rows) {
      const id = 'sm-' + crypto.randomUUID();
      upsertStmt.run(id, examSubjectId, r.student_id, r.marks_obtained, r.grade || null, r.teacher_remarks || null);
    }
  });
  saveTx(records);

  // Recompute section/class ranks for this exam_subject
  const examSubject = db.prepare(`SELECT class_id FROM exam_subjects WHERE id = ?`).get(examSubjectId) as any;
  const ranked = db.prepare(`
    SELECT sm.id, RANK() OVER (ORDER BY sm.marks_obtained DESC) as class_rank
    FROM student_marks sm WHERE sm.exam_subject_id = ?
  `).all(examSubjectId) as any[];
  const rankStmt = db.prepare(`UPDATE student_marks SET rank_in_class = ? WHERE id = ?`);
  const rankTx = db.transaction((rows: any[]) => { for (const r of rows) rankStmt.run(r.class_rank, r.id); });
  rankTx(ranked);

  logAudit(req, 'BOARD_MARKS_SAVED', 'student_marks', examSubjectId, { count: records.length, class_id: examSubject?.class_id });

  return res.json({ success: true, message: 'Board marks saved successfully.' });
});

// 7. Upload evaluated answer-paper image/PDF for a student's board-exam subject (shown on student/parent profile)
boardMarksRouter.post('/entry/:examSubjectId/:studentId/upload-paper', authenticate, requireRoles('TEACHER', 'HOD', 'ADMIN'), paperUpload.single('paper'), (req: AuthRequest, res: Response) => {
  const { examSubjectId, studentId } = req.params;
  if (!req.file) {
    return res.status(400).json({ error: 'paper file is required.' });
  }

  const fileUrl = `/uploads/evaluated_papers/${req.file.filename}`;
  const id = 'ep-board-' + crypto.randomUUID();

  db.prepare(`
    INSERT INTO evaluated_papers (id, student_id, exam_subject_id, file_url, uploaded_by, uploaded_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(student_id, exam_subject_id) DO UPDATE SET
      file_url = excluded.file_url, uploaded_by = excluded.uploaded_by, uploaded_at = CURRENT_TIMESTAMP
  `).run(id, studentId, examSubjectId, fileUrl, req.user!.id);

  logAudit(req, 'BOARD_EVALUATED_PAPER_UPLOADED', 'evaluated_papers', id, { studentId, examSubjectId });
  return res.json({ success: true, fileUrl, message: 'Evaluated paper uploaded successfully.' });
});

// 8. Full class x cycle grid (all subjects, all students, with percentage & rank) — for the class-wide board marks view
boardMarksRouter.get('/class/:classId/cycle/:examId', authenticate, (req: AuthRequest, res: Response) => {
  const { classId, examId } = req.params;

  const subjects = db.prepare(`
    SELECT es.id as exam_subject_id, s.name as subject_name, s.code as subject_code, es.max_marks
    FROM exam_subjects es JOIN subjects s ON es.subject_id = s.id
    WHERE es.exam_id = ? AND es.class_id = ?
    ORDER BY s.name ASC
  `).all(examId, classId) as any[];

  const students = db.prepare(`
    SELECT sp.id, sp.register_number, sp.name, sec.name as section_name
    FROM student_profiles sp JOIN sections sec ON sp.section_id = sec.id
    WHERE sp.class_id = ?
    ORDER BY sec.name ASC, sp.name ASC
  `).all(classId) as any[];

  const grid = students.map((student) => {
    const subjectMarks = subjects.map((subj) => {
      const mark = db.prepare(`
        SELECT marks_obtained FROM student_marks WHERE exam_subject_id = ? AND student_id = ?
      `).get(subj.exam_subject_id, student.id) as any;
      return { subject: subj.subject_name, marks_obtained: mark ? mark.marks_obtained : null, max_marks: subj.max_marks };
    });

    const attempted = subjectMarks.filter((m) => m.marks_obtained !== null);
    const totalObtained = attempted.reduce((sum, m) => sum + m.marks_obtained, 0);
    const totalMax = attempted.reduce((sum, m) => sum + m.max_marks, 0);

    return {
      ...student,
      subjectMarks,
      totalObtained,
      totalMax,
      percentage: totalMax > 0 ? parseFloat(((totalObtained / totalMax) * 100).toFixed(2)) : 0
    };
  }).sort((a, b) => b.totalObtained - a.totalObtained)
    .map((row, idx) => ({ ...row, classRank: idx + 1 }));

  return res.json({ subjects, grid });
});
