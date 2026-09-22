import { Router, Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const studentsRouter = Router();

const DOC_TYPES = ['AADHAR', 'STUDY_CERTIFICATE', 'SSLC_MARKS_CARD', 'TC', 'CASTE_INCOME_CERTIFICATE', 'EWS', 'PWD'];
const COMPETITIVE_EXAM_TYPES = ['NEET Test', 'JEE Test', 'KCET Test'];

// Storage for student photos & documents
const studentPhotosDir = path.join(__dirname, '..', '..', 'uploads', 'student_photos');
const studentDocsDir = path.join(__dirname, '..', '..', 'uploads', 'student_documents');
[studentPhotosDir, studentDocsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const photoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, studentPhotosDir),
    filename: (req, file, cb) => cb(null, 'student-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname))
  })
});
const docUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, studentDocsDir),
    filename: (req, file, cb) => cb(null, 'doc-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname))
  })
});

// Rank a single student for a given exam among their section & their class (all sections/batches)
function computeExamRanks(examId: string, studentId: string) {
  const row = db.prepare(`
    WITH totals AS (
      SELECT sm.student_id, sp.section_id, sp.class_id, sp.batch_id,
             SUM(sm.marks_obtained) as total_obtained,
             SUM(es.max_marks) as total_max
      FROM student_marks sm
      JOIN exam_subjects es ON sm.exam_subject_id = es.id
      JOIN student_profiles sp ON sm.student_id = sp.id
      WHERE es.exam_id = ?
      GROUP BY sm.student_id
    ),
    ranked AS (
      SELECT *,
        RANK() OVER (PARTITION BY class_id ORDER BY total_obtained DESC) as overall_rank,
        RANK() OVER (PARTITION BY section_id ORDER BY total_obtained DESC) as section_rank
      FROM totals
    )
    SELECT * FROM ranked WHERE student_id = ?
  `).get(examId, studentId) as any;

  if (!row) return { total_obtained: 0, total_max: 0, percentage: 0, overall_rank: null, section_rank: null };

  return {
    total_obtained: row.total_obtained,
    total_max: row.total_max,
    percentage: row.total_max > 0 ? parseFloat(((row.total_obtained / row.total_max) * 100).toFixed(2)) : 0,
    overall_rank: row.overall_rank,
    section_rank: row.section_rank
  };
}

/* ============================== STUDENT LIST & PROFILE ============================== */

// 1. List students — filters: class_id, section_id, batch_id, admission_type (1ST_PU/2ND_PU/LONG_TERM),
//    residence_status, and a free-text search across register number / phone / name
studentsRouter.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;
  const { class_id, section_id, batch_id, admission_type, residence_status, search } = req.query as Record<string, string>;

  let query = `
    SELECT sp.id, sp.register_number, sp.name, sp.phone, sp.photo_url, sp.residence_status,
           sp.admission_type, sp.is_active,
           c.name as class_name, sec.name as section_name, b.name as batch_name
    FROM student_profiles sp
    JOIN classes c ON sp.class_id = c.id
    JOIN sections sec ON sp.section_id = sec.id
    JOIN batches b ON sp.batch_id = b.id
    WHERE sp.branch_id = ?
  `;
  const params: any[] = [branchId];

  if (class_id) { query += ` AND sp.class_id = ?`; params.push(class_id); }
  if (section_id) { query += ` AND sp.section_id = ?`; params.push(section_id); }
  if (batch_id) { query += ` AND sp.batch_id = ?`; params.push(batch_id); }
  if (admission_type) { query += ` AND sp.admission_type = ?`; params.push(admission_type); }
  if (residence_status) { query += ` AND sp.residence_status = ?`; params.push(residence_status); }
  if (search) {
    query += ` AND (sp.register_number LIKE ? OR sp.phone LIKE ? OR sp.name LIKE ?)`;
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  query += ` ORDER BY sp.name ASC`;

  const students = db.prepare(query).all(...params);
  return res.json({ students, total: students.length });
});

// 2. Individual student — photo/register number/address/sslc result/category
studentsRouter.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (req.user!.role === 'STUDENT' && req.user!.student_id !== id) {
    return res.status(403).json({ error: 'Access denied: you can only view your own profile.' });
  }

  const profile = db.prepare(`
    SELECT sp.*, c.name as class_name, sec.name as section_name, b.name as batch_name, br.name as branch_name
    FROM student_profiles sp
    JOIN classes c ON sp.class_id = c.id
    JOIN sections sec ON sp.section_id = sec.id
    JOIN batches b ON sp.batch_id = b.id
    JOIN branches br ON sp.branch_id = br.id
    WHERE sp.id = ?
  `).get(id) as any;

  if (!profile) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  const documents = db.prepare(`SELECT * FROM student_documents WHERE student_id = ?`).all(id);

  return res.json({ profile, documents });
});

// 3. Create student (creates login user for the student + optional parent login + profile)
studentsRouter.post('/', authenticate, requireRoles('ADMIN', 'PRINCIPAL', 'HOD'), async (req: AuthRequest, res: Response) => {
  const {
    name, register_number, username, password, date_of_birth, gender, phone, email, address,
    parent_name, parent_phone, parent_email, class_id, section_id, batch_id,
    is_hostelite, category, sslc_result, residence_status, admission_type,
    branch_id, photo_url
  } = req.body;

  if (!name || !register_number || !parent_name || !parent_phone || !class_id || !section_id || !batch_id) {
    return res.status(400).json({ error: 'name, register_number, parent_name, parent_phone, class_id, section_id and batch_id are required.' });
  }

  const targetBranchId = branch_id || req.user!.branch_id;
  const existingReg = db.prepare(`SELECT id FROM student_profiles WHERE register_number = ?`).get(register_number);
  if (existingReg) {
    return res.status(409).json({ error: 'A student with this register number already exists.' });
  }

  const studentId = 'sp-' + crypto.randomUUID();
  const userUsername = username || `student_${register_number}`.toLowerCase();
  const existingUser = db.prepare(`SELECT id FROM users WHERE username = ?`).get(userUsername);
  if (existingUser) {
    return res.status(409).json({ error: 'Username already exists for this student.' });
  }

  const userId = 'usr-student-' + crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password || 'password123', 10);

  const createTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, branch_id, username, password_hash, role, name, email, phone, avatar_url, is_active)
      VALUES (?, ?, ?, ?, 'STUDENT', ?, ?, ?, ?, 1)
    `).run(userId, targetBranchId, userUsername, passwordHash, name, email || null, phone || null, photo_url || null);

    db.prepare(`
      INSERT INTO student_profiles (
        id, user_id, branch_id, register_number, name, photo_url, date_of_birth, gender, phone, email, address,
        parent_name, parent_phone, parent_email, class_id, section_id, batch_id, is_hostelite,
        category, sslc_result, residence_status, admission_type, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      studentId, userId, targetBranchId, register_number, name, photo_url || null, date_of_birth || null, gender || null,
      phone || null, email || null, address || null, parent_name, parent_phone, parent_email || null,
      class_id, section_id, batch_id, is_hostelite ? 1 : 0,
      category || null, sslc_result || null, residence_status || 'NON_RESIDENT', admission_type || '1ST_PU'
    );
  });

  try {
    createTx();
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create student: ' + err.message });
  }

  logAudit(req, 'STUDENT_CREATED', 'student_profiles', studentId, { name, register_number, class_id, section_id, batch_id });

  return res.status(201).json({ success: true, id: studentId, message: 'Student created successfully.' });
});

// 4. Update student profile
studentsRouter.put('/:id', authenticate, requireRoles('ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    name, date_of_birth, gender, phone, email, address,
    parent_name, parent_phone, parent_email, class_id, section_id, batch_id,
    is_hostelite, category, sslc_result, residence_status, admission_type, photo_url
  } = req.body;

  const student = db.prepare(`SELECT id, user_id FROM student_profiles WHERE id = ?`).get(id) as any;
  if (!student) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  db.prepare(`
    UPDATE student_profiles SET
      name = COALESCE(?, name),
      date_of_birth = COALESCE(?, date_of_birth),
      gender = COALESCE(?, gender),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      address = COALESCE(?, address),
      parent_name = COALESCE(?, parent_name),
      parent_phone = COALESCE(?, parent_phone),
      parent_email = COALESCE(?, parent_email),
      class_id = COALESCE(?, class_id),
      section_id = COALESCE(?, section_id),
      batch_id = COALESCE(?, batch_id),
      is_hostelite = COALESCE(?, is_hostelite),
      category = COALESCE(?, category),
      sslc_result = COALESCE(?, sslc_result),
      residence_status = COALESCE(?, residence_status),
      admission_type = COALESCE(?, admission_type),
      photo_url = COALESCE(?, photo_url)
    WHERE id = ?
  `).run(
    name, date_of_birth, gender, phone, email, address, parent_name, parent_phone, parent_email,
    class_id, section_id, batch_id, is_hostelite === undefined ? null : (is_hostelite ? 1 : 0),
    category, sslc_result, residence_status, admission_type, photo_url, id
  );

  if (student.user_id && (name || email || phone || photo_url)) {
    db.prepare(`
      UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone), avatar_url = COALESCE(?, avatar_url)
      WHERE id = ?
    `).run(name || null, email || null, phone || null, photo_url || null, student.user_id);
  }

  logAudit(req, 'STUDENT_UPDATED', 'student_profiles', id, { name, class_id, section_id });

  return res.json({ success: true, message: 'Student profile updated successfully.' });
});

// 5. Deactivate student (soft delete — keeps academic history intact)
studentsRouter.delete('/:id', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const student = db.prepare(`SELECT id FROM student_profiles WHERE id = ?`).get(id);
  if (!student) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  db.prepare(`UPDATE student_profiles SET is_active = 0 WHERE id = ?`).run(id);
  logAudit(req, 'STUDENT_DEACTIVATED', 'student_profiles', id, {});

  return res.json({ success: true, message: 'Student deactivated successfully.' });
});

// 6. Upload student photo
studentsRouter.post('/photo/upload', authenticate, photoUpload.single('photo'), (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Photo file is required.' });
  }
  return res.json({ success: true, fileUrl: `/uploads/student_photos/${req.file.filename}` });
});

/* ============================== DOCUMENTS ============================== */
// Aadhar / Study Certificate / SSLC Marks Card / TC / Caste & Income Certificate / EWS / PWD

// 7. List a student's documents
studentsRouter.get('/:id/documents', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const documents = db.prepare(`SELECT * FROM student_documents WHERE student_id = ?`).all(id);
  return res.json({ documents, docTypes: DOC_TYPES });
});

// 8. Upload / replace a document
studentsRouter.post('/:id/documents/upload', authenticate, requireRoles('ADMIN', 'PRINCIPAL', 'HOD'), docUpload.single('document'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { doc_type, category } = req.body;

  if (!req.file || !doc_type) {
    return res.status(400).json({ error: 'document file and doc_type are required.' });
  }
  if (!DOC_TYPES.includes(doc_type)) {
    return res.status(400).json({ error: `doc_type must be one of: ${DOC_TYPES.join(', ')}` });
  }

  const student = db.prepare(`SELECT id FROM student_profiles WHERE id = ?`).get(id);
  if (!student) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  const fileUrl = `/uploads/student_documents/${req.file.filename}`;
  const docId = 'sdoc-' + crypto.randomUUID();

  db.prepare(`
    INSERT INTO student_documents (id, student_id, doc_type, file_url, category, uploaded_by, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(student_id, doc_type) DO UPDATE SET
      file_url = excluded.file_url, category = excluded.category,
      uploaded_by = excluded.uploaded_by, uploaded_at = CURRENT_TIMESTAMP
  `).run(docId, id, doc_type, fileUrl, category || null, req.user!.id);

  logAudit(req, 'STUDENT_DOCUMENT_UPLOADED', 'student_documents', docId, { student_id: id, doc_type });

  return res.json({ success: true, fileUrl, message: 'Document uploaded successfully.' });
});

// 9. Delete a document
studentsRouter.delete('/:id/documents/:docType', authenticate, requireRoles('ADMIN', 'PRINCIPAL', 'HOD'), (req: AuthRequest, res: Response) => {
  const { id, docType } = req.params;
  db.prepare(`DELETE FROM student_documents WHERE student_id = ? AND doc_type = ?`).run(id, docType);
  logAudit(req, 'STUDENT_DOCUMENT_DELETED', 'student_documents', id, { doc_type: docType });
  return res.json({ success: true, message: 'Document removed.' });
});

/* ============================== MARKS ============================== */

// 10. Theory marks — list of exams attempted with total marks / class rank / overall rank
studentsRouter.get('/:id/marks/theory', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const placeholders = COMPETITIVE_EXAM_TYPES.map(() => '?').join(',');

  const exams = db.prepare(`
    SELECT DISTINCT e.id as exam_id, e.name as exam_name, e.exam_type, e.start_date
    FROM exams e
    JOIN exam_subjects es ON es.exam_id = e.id
    JOIN student_marks sm ON sm.exam_subject_id = es.id
    WHERE sm.student_id = ? AND e.exam_type NOT IN (${placeholders}) AND e.exam_type != 'Board Exam'
    ORDER BY e.start_date DESC
  `).all(id, ...COMPETITIVE_EXAM_TYPES) as any[];

  const withRanks = exams.map((e) => ({ ...e, ...computeExamRanks(e.exam_id, id) }));
  return res.json({ exams: withRanks });
});

// 11. Theory marks card for one exam — subject-wise marks + section rank + overall rank + total + %
studentsRouter.get('/:id/marks/theory/:examId', authenticate, (req: AuthRequest, res: Response) => {
  const { id, examId } = req.params;
  return buildMarksCard(id, examId, res);
});

// 12. Competitive marks (NEET/JEE/KCET) — list
studentsRouter.get('/:id/marks/competitive', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const placeholders = COMPETITIVE_EXAM_TYPES.map(() => '?').join(',');

  const exams = db.prepare(`
    SELECT DISTINCT e.id as exam_id, e.name as exam_name, e.exam_type, e.start_date
    FROM exams e
    JOIN exam_subjects es ON es.exam_id = e.id
    JOIN student_marks sm ON sm.exam_subject_id = es.id
    WHERE sm.student_id = ? AND e.exam_type IN (${placeholders})
    ORDER BY e.start_date DESC
  `).all(id, ...COMPETITIVE_EXAM_TYPES) as any[];

  const withRanks = exams.map((e) => ({ ...e, ...computeExamRanks(e.exam_id, id) }));
  return res.json({ exams: withRanks });
});

// 13. Competitive marks card for one exam
studentsRouter.get('/:id/marks/competitive/:examId', authenticate, (req: AuthRequest, res: Response) => {
  const { id, examId } = req.params;
  return buildMarksCard(id, examId, res);
});

// 14. Board exam marks summary for this student's profile (read-through into board marks module)
studentsRouter.get('/:id/marks/board', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const marks = db.prepare(`
    SELECT e.id as exam_id, e.name as exam_name, e.academic_year, es.exam_date,
           s.name as subject_name, s.code as subject_code,
           sm.marks_obtained, es.max_marks, sm.rank_in_class, sm.rank_in_batch,
           ep.file_url as evaluated_paper_url
    FROM student_marks sm
    JOIN exam_subjects es ON sm.exam_subject_id = es.id
    JOIN exams e ON es.exam_id = e.id
    JOIN subjects s ON es.subject_id = s.id
    LEFT JOIN evaluated_papers ep ON ep.student_id = sm.student_id AND ep.exam_subject_id = es.id
    WHERE sm.student_id = ? AND e.exam_type = 'Board Exam'
    ORDER BY e.start_date DESC, s.name ASC
  `).all(id);

  return res.json({ marks });
});

// Shared marks-card builder used by both theory and competitive endpoints
function buildMarksCard(studentId: string, examId: string, res: Response) {
  const exam = db.prepare(`SELECT * FROM exams WHERE id = ?`).get(examId) as any;
  if (!exam) {
    return res.status(404).json({ error: 'Exam not found.' });
  }

  const subjectMarks = db.prepare(`
    SELECT sm.*, es.max_marks, es.passing_marks, es.exam_date,
           s.name as subject_name, s.code as subject_code
    FROM student_marks sm
    JOIN exam_subjects es ON sm.exam_subject_id = es.id
    JOIN subjects s ON es.subject_id = s.id
    WHERE es.exam_id = ? AND sm.student_id = ?
    ORDER BY s.name ASC
  `).all(examId, studentId) as any[];

  const totalMax = subjectMarks.reduce((sum, m) => sum + m.max_marks, 0);
  const totalObtained = subjectMarks.reduce((sum, m) => sum + m.marks_obtained, 0);
  const ranks = computeExamRanks(examId, studentId);

  return res.json({
    exam,
    subjectMarks,
    totalMarks: totalMax,
    totalObtained,
    percentage: totalMax > 0 ? parseFloat(((totalObtained / totalMax) * 100).toFixed(2)) : 0,
    sectionRank: ranks.section_rank,
    overallRank: ranks.overall_rank
  });
}
