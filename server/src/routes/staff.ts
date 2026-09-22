import { Router, Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const staffRouter = Router();

// Storage for staff photos
const staffPhotosDir = path.join(__dirname, '..', '..', 'uploads', 'staff_photos');
if (!fs.existsSync(staffPhotosDir)) {
  fs.mkdirSync(staffPhotosDir, { recursive: true });
}
const photoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, staffPhotosDir),
    filename: (req, file, cb) => cb(null, 'staff-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname))
  })
});

/* ============================== TEACHING STAFF ============================== */

// 1. List teaching staff (search by name/employee id/phone, filter by department/subject)
staffRouter.get('/teaching', authenticate, (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;
  const { department_id, subject_id, search } = req.query as Record<string, string>;

  let query = `
    SELECT tp.*, u.name, u.email as user_email, u.phone as user_phone, u.avatar_url, u.is_active, u.username,
           d.name as department_name, d.code as department_code
    FROM teacher_profiles tp
    JOIN users u ON tp.user_id = u.id
    LEFT JOIN departments d ON tp.department_id = d.id
    WHERE u.branch_id = ?
  `;
  const params: any[] = [branchId];

  if (department_id) {
    query += ` AND tp.department_id = ?`;
    params.push(department_id);
  }
  if (subject_id) {
    query += ` AND tp.id IN (SELECT teacher_id FROM teacher_assignments WHERE subject_id = ?)`;
    params.push(subject_id);
  }
  if (search) {
    query += ` AND (u.name LIKE ? OR tp.employee_id LIKE ? OR tp.phone LIKE ? OR u.phone LIKE ?)`;
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  query += ` ORDER BY u.name ASC`;

  const teachers = db.prepare(query).all(...params);
  return res.json({ teachers });
});

// 2. Full teacher profile: personal info + subjects taught + class allotted + timetable +
//    leaves + classes replaced (substitutions) + per-class/subject performance
staffRouter.get('/teaching/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const profile = db.prepare(`
    SELECT tp.*, u.name, u.email as user_email, u.phone as user_phone, u.avatar_url, u.is_active, u.username,
           d.name as department_name, d.code as department_code,
           b.name as branch_name
    FROM teacher_profiles tp
    JOIN users u ON tp.user_id = u.id
    JOIN branches b ON u.branch_id = b.id
    LEFT JOIN departments d ON tp.department_id = d.id
    WHERE tp.id = ?
  `).get(id) as any;

  if (!profile) {
    return res.status(404).json({ error: 'Teacher not found.' });
  }

  // Subjects/classes/sections/batches allotted
  const assignments = db.prepare(`
    SELECT ta.*, s.name as subject_name, s.code as subject_code,
           c.name as class_name, sec.name as section_name, b.name as batch_name
    FROM teacher_assignments ta
    JOIN subjects s ON ta.subject_id = s.id
    JOIN classes c ON ta.class_id = c.id
    JOIN sections sec ON ta.section_id = sec.id
    JOIN batches b ON ta.batch_id = b.id
    WHERE ta.teacher_id = ?
    ORDER BY c.name ASC, sec.name ASC
  `).all(id);

  // Weekly timetable
  const timetable = db.prepare(`
    SELECT tt.*, s.name as subject_name, c.name as class_name, sec.name as section_name,
           b.name as batch_name, r.room_number
    FROM timetable_entries tt
    JOIN subjects s ON tt.subject_id = s.id
    JOIN classes c ON tt.class_id = c.id
    JOIN sections sec ON tt.section_id = sec.id
    JOIN batches b ON tt.batch_id = b.id
    JOIN rooms r ON tt.room_id = r.id
    WHERE tt.teacher_id = ?
    ORDER BY CASE tt.day_of_week
      WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3
      WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 ELSE 7 END,
      tt.period_number ASC
  `).all(id);

  // Leaves taken
  const leaves = db.prepare(`
    SELECT * FROM teacher_absences WHERE teacher_id = ? ORDER BY date DESC LIMIT 50
  `).all(id);

  // Classes replaced (substitution duties covered for this teacher, and covered by this teacher)
  const classesReplaced = db.prepare(`
    SELECT sa.*, tt.period_number, tt.start_time, tt.end_time,
           s.name as subject_name, c.name as class_name, sec.name as section_name,
           orig_u.name as original_teacher_name, sub_u.name as substitute_teacher_name
    FROM substitution_assignments sa
    JOIN timetable_entries tt ON sa.timetable_entry_id = tt.id
    JOIN subjects s ON tt.subject_id = s.id
    JOIN classes c ON tt.class_id = c.id
    JOIN sections sec ON tt.section_id = sec.id
    JOIN teacher_profiles orig_tp ON sa.original_teacher_id = orig_tp.id
    JOIN users orig_u ON orig_tp.user_id = orig_u.id
    JOIN teacher_profiles sub_tp ON sa.substitute_teacher_id = sub_tp.id
    JOIN users sub_u ON sub_tp.user_id = sub_u.id
    WHERE sa.original_teacher_id = ? OR sa.substitute_teacher_id = ?
    ORDER BY sa.date DESC LIMIT 50
  `).all(id, id);

  // Per-class/subject performance: latest exam average, topper %, weaker students
  const classPerformance = assignments.map((a: any) => {
    const latestExamSubject = db.prepare(`
      SELECT es.id as exam_subject_id, es.max_marks, e.name as exam_name, e.start_date
      FROM exam_subjects es
      JOIN exams e ON es.exam_id = e.id
      WHERE es.subject_id = ? AND es.class_id = ?
      ORDER BY e.start_date DESC LIMIT 1
    `).get(a.subject_id, a.class_id) as any;

    if (!latestExamSubject) {
      return { ...a, latestExam: null, classPercentage: null, topper: null, weakest: null };
    }

    const marks = db.prepare(`
      SELECT sm.marks_obtained, sp.name as student_name, sp.register_number
      FROM student_marks sm
      JOIN student_profiles sp ON sm.student_id = sp.id
      WHERE sm.exam_subject_id = ? AND sp.section_id = ? AND sp.batch_id = ?
      ORDER BY sm.marks_obtained DESC
    `).all(latestExamSubject.exam_subject_id, a.section_id, a.batch_id) as any[];

    const classPercentage = marks.length > 0
      ? parseFloat(((marks.reduce((sum, m) => sum + m.marks_obtained, 0) / (marks.length * latestExamSubject.max_marks)) * 100).toFixed(1))
      : null;

    return {
      ...a,
      latestExam: { name: latestExamSubject.exam_name, maxMarks: latestExamSubject.max_marks },
      classPercentage,
      topper: marks[0] || null,
      weakest: marks[marks.length - 1] || null
    };
  });

  return res.json({ profile, assignments, timetable, leaves, classesReplaced, classPerformance });
});

// 3. Create teacher (creates login user + teacher profile together)
staffRouter.post('/teaching', authenticate, requireRoles('ADMIN', 'PRINCIPAL', 'HOD'), async (req: AuthRequest, res: Response) => {
  const {
    name, username, password, email, phone, address, date_of_birth,
    department_id, designation, joining_date, qualification, is_hod,
    branch_id, photo_url
  } = req.body;

  if (!name || !username || !designation) {
    return res.status(400).json({ error: 'name, username and designation are required.' });
  }

  const targetBranchId = branch_id || req.user!.branch_id;
  const existingUser = db.prepare(`SELECT id FROM users WHERE username = ?`).get(username);
  if (existingUser) {
    return res.status(409).json({ error: 'Username already exists.' });
  }

  const userId = 'usr-teacher-' + crypto.randomUUID();
  const teacherId = 'tp-' + crypto.randomUUID();
  const employeeId = 'EMP' + Math.floor(100000 + Math.random() * 900000);
  const passwordHash = await bcrypt.hash(password || 'password123', 10);

  const createTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, branch_id, username, password_hash, role, name, email, phone, avatar_url, is_active)
      VALUES (?, ?, ?, ?, 'TEACHER', ?, ?, ?, ?, 1)
    `).run(userId, targetBranchId, username, passwordHash, name, email || null, phone || null, photo_url || null);

    db.prepare(`
      INSERT INTO teacher_profiles (id, user_id, employee_id, photo_url, date_of_birth, phone, email, address, department_id, designation, joining_date, qualification, is_hod)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(teacherId, userId, employeeId, photo_url || null, date_of_birth || null, phone || null, email || null, address || null,
      department_id || null, designation, joining_date || null, qualification || null, is_hod ? 1 : 0);
  });

  try {
    createTx();
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create teacher: ' + err.message });
  }

  logAudit(req, 'TEACHER_CREATED', 'teacher_profiles', teacherId, { name, designation, department_id });

  return res.status(201).json({ success: true, id: teacherId, employeeId, message: 'Teaching staff created successfully.' });
});

// 4. Update teacher profile
staffRouter.put('/teaching/:id', authenticate, requireRoles('ADMIN', 'PRINCIPAL', 'HOD'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    name, email, phone, address, date_of_birth,
    department_id, designation, joining_date, qualification, is_hod, photo_url
  } = req.body;

  const teacher = db.prepare(`SELECT * FROM teacher_profiles WHERE id = ?`).get(id) as any;
  if (!teacher) {
    return res.status(404).json({ error: 'Teacher not found.' });
  }

  db.prepare(`
    UPDATE teacher_profiles SET
      photo_url = COALESCE(?, photo_url),
      date_of_birth = COALESCE(?, date_of_birth),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      address = COALESCE(?, address),
      department_id = COALESCE(?, department_id),
      designation = COALESCE(?, designation),
      joining_date = COALESCE(?, joining_date),
      qualification = COALESCE(?, qualification),
      is_hod = COALESCE(?, is_hod)
    WHERE id = ?
  `).run(photo_url, date_of_birth, phone, email, address, department_id, designation, joining_date, qualification,
    is_hod === undefined ? null : (is_hod ? 1 : 0), id);

  if (name || email || phone || photo_url) {
    db.prepare(`
      UPDATE users SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        avatar_url = COALESCE(?, avatar_url)
      WHERE id = ?
    `).run(name || null, email || null, phone || null, photo_url || null, teacher.user_id);
  }

  logAudit(req, 'TEACHER_UPDATED', 'teacher_profiles', id, { name, designation });

  return res.json({ success: true, message: 'Teaching staff profile updated successfully.' });
});

// 5. Deactivate / reactivate teacher (soft delete keeps historical academic records intact)
staffRouter.delete('/teaching/:id', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const teacher = db.prepare(`SELECT * FROM teacher_profiles WHERE id = ?`).get(id) as any;
  if (!teacher) {
    return res.status(404).json({ error: 'Teacher not found.' });
  }

  db.prepare(`UPDATE users SET is_active = 0 WHERE id = ?`).run(teacher.user_id);
  logAudit(req, 'TEACHER_DEACTIVATED', 'teacher_profiles', id, {});

  return res.json({ success: true, message: 'Teaching staff deactivated successfully.' });
});

// 6. Record teacher leave/absence
staffRouter.post('/teaching/:id/leave', authenticate, requireRoles('ADMIN', 'PRINCIPAL', 'HOD'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { date, reason } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'date is required.' });
  }

  const leaveId = 'abs-' + crypto.randomUUID();
  db.prepare(`
    INSERT INTO teacher_absences (id, teacher_id, date, reason, status)
    VALUES (?, ?, ?, ?, 'RECORDED')
  `).run(leaveId, id, date, reason || null);

  logAudit(req, 'TEACHER_LEAVE_RECORDED', 'teacher_absences', leaveId, { teacher_id: id, date, reason });

  return res.status(201).json({ success: true, id: leaveId, message: 'Leave recorded successfully.' });
});

// 7. Upload staff photo (used by both teaching & non-teaching forms)
staffRouter.post('/photo/upload', authenticate, photoUpload.single('photo'), (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Photo file is required.' });
  }
  return res.json({ success: true, fileUrl: `/uploads/staff_photos/${req.file.filename}` });
});

/* ============================== NON-TEACHING STAFF ============================== */
// Categories: FLOOR_INCHARGE, CLEANING, BUS, WARDEN, MESS

// 8. List non-teaching staff
staffRouter.get('/non-teaching', authenticate, (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;
  const { category, search } = req.query as Record<string, string>;

  let query = `SELECT * FROM staff_profiles WHERE branch_id = ?`;
  const params: any[] = [branchId];

  if (category) {
    query += ` AND category = ?`;
    params.push(category);
  }
  if (search) {
    query += ` AND (name LIKE ? OR employee_id LIKE ? OR phone LIKE ?)`;
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  query += ` ORDER BY category ASC, name ASC`;

  const staff = db.prepare(query).all(...params);
  return res.json({ staff });
});

// 9. Get single non-teaching staff profile (+ leaves)
staffRouter.get('/non-teaching/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const staff = db.prepare(`SELECT * FROM staff_profiles WHERE id = ?`).get(id) as any;
  if (!staff) {
    return res.status(404).json({ error: 'Staff member not found.' });
  }

  const leaves = db.prepare(`SELECT * FROM staff_leaves WHERE staff_id = ? ORDER BY date DESC LIMIT 50`).all(id);
  return res.json({ profile: staff, leaves });
});

// 10. Create non-teaching staff
staffRouter.post('/non-teaching', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), (req: AuthRequest, res: Response) => {
  const {
    name, phone, email, address, date_of_birth, category,
    assigned_area, shift, joining_date, photo_url, branch_id
  } = req.body;

  if (!name || !category) {
    return res.status(400).json({ error: 'name and category are required.' });
  }
  const validCategories = ['FLOOR_INCHARGE', 'CLEANING', 'BUS', 'WARDEN', 'MESS'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: `category must be one of: ${validCategories.join(', ')}` });
  }

  const id = 'stf-' + crypto.randomUUID();
  const employeeId = 'NST' + Math.floor(100000 + Math.random() * 900000);
  const targetBranchId = branch_id || req.user!.branch_id;

  db.prepare(`
    INSERT INTO staff_profiles (id, branch_id, employee_id, name, photo_url, date_of_birth, phone, email, address, category, assigned_area, shift, joining_date, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(id, targetBranchId, employeeId, name, photo_url || null, date_of_birth || null, phone || null, email || null, address || null,
    category, assigned_area || null, shift || null, joining_date || null);

  logAudit(req, 'NON_TEACHING_STAFF_CREATED', 'staff_profiles', id, { name, category, assigned_area });

  return res.status(201).json({ success: true, id, employeeId, message: 'Non-teaching staff created successfully.' });
});

// 11. Update non-teaching staff
staffRouter.put('/non-teaching/:id', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    name, phone, email, address, date_of_birth, category,
    assigned_area, shift, joining_date, photo_url
  } = req.body;

  const staff = db.prepare(`SELECT id FROM staff_profiles WHERE id = ?`).get(id);
  if (!staff) {
    return res.status(404).json({ error: 'Staff member not found.' });
  }

  db.prepare(`
    UPDATE staff_profiles SET
      name = COALESCE(?, name),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      address = COALESCE(?, address),
      date_of_birth = COALESCE(?, date_of_birth),
      category = COALESCE(?, category),
      assigned_area = COALESCE(?, assigned_area),
      shift = COALESCE(?, shift),
      joining_date = COALESCE(?, joining_date),
      photo_url = COALESCE(?, photo_url)
    WHERE id = ?
  `).run(name, phone, email, address, date_of_birth, category, assigned_area, shift, joining_date, photo_url, id);

  logAudit(req, 'NON_TEACHING_STAFF_UPDATED', 'staff_profiles', id, { name, category });

  return res.json({ success: true, message: 'Non-teaching staff updated successfully.' });
});

// 12. Deactivate non-teaching staff
staffRouter.delete('/non-teaching/:id', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const staff = db.prepare(`SELECT id FROM staff_profiles WHERE id = ?`).get(id);
  if (!staff) {
    return res.status(404).json({ error: 'Staff member not found.' });
  }

  db.prepare(`UPDATE staff_profiles SET is_active = 0 WHERE id = ?`).run(id);
  logAudit(req, 'NON_TEACHING_STAFF_DEACTIVATED', 'staff_profiles', id, {});

  return res.json({ success: true, message: 'Non-teaching staff deactivated successfully.' });
});

// 13. Record non-teaching staff leave
staffRouter.post('/non-teaching/:id/leave', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { date, reason } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'date is required.' });
  }

  const leaveId = 'abs-' + crypto.randomUUID();
  db.prepare(`
    INSERT INTO staff_leaves (id, staff_type, staff_id, date, reason, status)
    VALUES (?, 'NON_TEACHING', ?, ?, ?, 'RECORDED')
  `).run(leaveId, id, date, reason || null);

  logAudit(req, 'STAFF_LEAVE_RECORDED', 'staff_leaves', leaveId, { staff_id: id, date, reason });

  return res.status(201).json({ success: true, id: leaveId, message: 'Leave recorded successfully.' });
});
