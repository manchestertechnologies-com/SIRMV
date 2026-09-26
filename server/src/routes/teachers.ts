import { Router, Response } from 'express';
import { query, queryOne, execute, transaction } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const teachersRouter = Router();

export const TEACHER_DESIGNATIONS = ['Professor & HOD', 'Senior Faculty', 'Faculty', 'Lab Faculty'];

// 1. Get Departments List
teachersRouter.get('/departments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    const departments = await query(`
      SELECT * FROM departments 
      WHERE branch_id = $1 OR branch_id IS NULL 
      ORDER BY name ASC
    `, [branchId]);
    return res.json({ departments });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 1b. Get allowed Designations list (for the registration/edit dropdown)
teachersRouter.get('/designations', authenticate, async (_req: AuthRequest, res: Response) => {
  return res.json({ designations: TEACHER_DESIGNATIONS });
});

// 2. Get Classes, Sections, Batches, and Subjects for assignment dropdowns
teachersRouter.get('/metadata/options', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    const [departments, classes, sections, batches, subjects] = await Promise.all([
      query(`SELECT * FROM departments WHERE branch_id = $1 OR branch_id IS NULL ORDER BY name ASC`, [branchId]),
      query(`SELECT * FROM classes WHERE branch_id = $1 ORDER BY name ASC`, [branchId]),
      query(`SELECT * FROM sections ORDER BY name ASC`),
      query(`SELECT * FROM batches ORDER BY name ASC`),
      query(`SELECT * FROM subjects ORDER BY name ASC`)
    ]);

    return res.json({
      departments,
      classes,
      sections,
      batches,
      subjects
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Get Current Teacher Profile (Personal Details + Academic Assignments)
teachersRouter.get('/me/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const profile = await queryOne(`
      SELECT tp.*, u.name, u.email as user_email, u.phone as user_phone, u.avatar_url,
             d.name as department_name, d.code as department_code,
             b.name as branch_name, b.code as branch_code, b.city as branch_city
      FROM teacher_profiles tp
      JOIN users u ON tp.user_id = u.id
      JOIN branches b ON u.branch_id = b.id
      LEFT JOIN departments d ON tp.department_id = d.id
      WHERE tp.user_id = $1 OR tp.id = $2
    `, [userId, req.user!.teacher_id || '']);

    if (!profile) {
      return res.status(404).json({ error: 'Teacher profile not found.' });
    }

    // Fetch Academic Assignments
    const assignments = await query(`
      SELECT ta.*, d.name as department_name, s.name as subject_name, s.code as subject_code,
             c.name as class_name, sec.name as section_name, b.name as batch_name
      FROM teacher_assignments ta
      JOIN departments d ON ta.department_id = d.id
      JOIN subjects s ON ta.subject_id = s.id
      JOIN classes c ON ta.class_id = c.id
      JOIN sections sec ON ta.section_id = sec.id
      JOIN batches b ON ta.batch_id = b.id
      WHERE ta.teacher_id = $1
    `, [profile.id]);

    return res.json({ profile, assignments });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Get Current Teacher Timetable (Today's & Weekly + Current Status Indicators)
teachersRouter.get('/me/timetable', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user!.teacher_id;
    if (!teacherId && req.user!.role !== 'ADMIN' && req.user!.role !== 'HOD' && req.user!.role !== 'PRINCIPAL') {
      return res.status(400).json({ error: 'No teacher profile linked to this account.' });
    }

    const targetTeacherId = (req.query.teacher_id as string) || teacherId;

    // Day determination
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const currentDayName = dayNames[today.getDay()] === 'Sunday' ? 'Monday' : dayNames[today.getDay()];
    const todayDateStr = today.toISOString().split('T')[0];

    // Fetch Weekly Timetable
    const weeklyTimetable = await query(`
      SELECT tt.*, s.name as subject_name, s.code as subject_code,
             c.name as class_name, sec.name as section_name, b.name as batch_name,
             r.room_number, r.floor,
             tp.employee_id, u.name as teacher_name
      FROM timetable_entries tt
      JOIN subjects s ON tt.subject_id = s.id
      JOIN classes c ON tt.class_id = c.id
      JOIN sections sec ON tt.section_id = sec.id
      JOIN batches b ON tt.batch_id = b.id
      JOIN rooms r ON tt.room_id = r.id
      JOIN teacher_profiles tp ON tt.teacher_id = tp.id
      JOIN users u ON tp.user_id = u.id
      WHERE tt.teacher_id = $1
      ORDER BY 
        CASE tt.day_of_week
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
          ELSE 7
        END,
        tt.period_number ASC
    `, [targetTeacherId]);

    // Filter Today's Timetable
    const todayTimetable = weeklyTimetable.filter((t: any) => t.day_of_week === currentDayName);

    // Check Substitution Duties assigned to this teacher
    const substitutionDuties = await query(`
      SELECT sa.*, tt.period_number, tt.start_time, tt.end_time,
             s.name as subject_name, c.name as class_name, sec.name as section_name, b.name as batch_name,
             r.room_number, r.floor,
             orig_u.name as original_teacher_name,
             assigner.name as assigned_by_name
      FROM substitution_assignments sa
      JOIN timetable_entries tt ON sa.timetable_entry_id = tt.id
      JOIN subjects s ON tt.subject_id = s.id
      JOIN classes c ON tt.class_id = c.id
      JOIN sections sec ON tt.section_id = sec.id
      JOIN batches b ON tt.batch_id = b.id
      JOIN rooms r ON tt.room_id = r.id
      JOIN teacher_profiles orig_tp ON sa.original_teacher_id = orig_tp.id
      JOIN users orig_u ON orig_tp.user_id = orig_u.id
      JOIN users assigner ON sa.assigned_by = assigner.id
      WHERE sa.substitute_teacher_id = $1 AND sa.date = $2
    `, [targetTeacherId, todayDateStr]);

    // Check Pending Attendance for this teacher's lectures today
    const pendingAttendanceLectures = await query(`
      SELECT ls.*, s.name as subject_name, c.name as class_name, sec.name as section_name, r.room_number
      FROM lecture_sessions ls
      JOIN subjects s ON ls.subject_id = s.id
      JOIN classes c ON ls.class_id = c.id
      JOIN sections sec ON ls.section_id = sec.id
      JOIN rooms r ON ls.room_id = r.id
      WHERE (ls.teacher_id = $1 OR ls.substitute_teacher_id = $2)
        AND ls.date = $3 AND ls.finalization_status = 'PENDING'
    `, [targetTeacherId, targetTeacherId, todayDateStr]);

    // Check Upcoming Tests
    const upcomingTests = await query(`
      SELECT es.*, e.name as exam_name, e.exam_type, e.start_date, s.name as subject_name, c.name as class_name
      FROM exam_subjects es
      JOIN exams e ON es.exam_id = e.id
      JOIN subjects s ON es.subject_id = s.id
      JOIN classes c ON es.class_id = c.id
      ORDER BY e.start_date ASC LIMIT 5
    `);

    return res.json({
      currentDay: currentDayName,
      todayDate: todayDateStr,
      todayTimetable,
      weeklyTimetable,
      substitutionDuties,
      pendingAttendanceLectures,
      upcomingTests
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Acknowledge Substitution Duty
teachersRouter.post('/substitutions/:id/acknowledge', authenticate, requireRoles('TEACHER', 'HOD', 'ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const duty = await queryOne(`SELECT * FROM substitution_assignments WHERE id = $1`, [id]);
    if (!duty) {
      return res.status(404).json({ error: 'Substitution duty record not found.' });
    }

    await execute(`
      UPDATE substitution_assignments 
      SET status = 'ACKNOWLEDGED', acknowledged_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);

    await logAudit(req, 'SUBSTITUTION_ACKNOWLEDGED', 'substitution_assignments', id, { dutyId: id, substituteId: duty.substitute_teacher_id });

    return res.json({ success: true, message: 'Substitution duty acknowledged successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. List all teachers for branch (with department, contact, and assignments count)
teachersRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    const departmentId = req.query.department_id as string;
    const search = req.query.search as string;

    let sql = `
      SELECT tp.*, u.name, u.email, u.phone, u.avatar_url, u.is_active,
             d.name as department_name, d.code as department_code,
             b.name as branch_name,
             (SELECT COUNT(*) FROM teacher_assignments ta WHERE ta.teacher_id = tp.id) as assignment_count,
             (SELECT COUNT(*) FROM timetable_entries tt WHERE tt.teacher_id = tp.id) as period_count,
             EXISTS(
               SELECT 1 FROM teacher_absences ab
               WHERE ab.teacher_id = tp.id AND ab.status = 'RECORDED' AND ab.date = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
             ) as is_absent_today
      FROM teacher_profiles tp
      JOIN users u ON tp.user_id = u.id
      JOIN branches b ON u.branch_id = b.id
      LEFT JOIN departments d ON tp.department_id = d.id
      WHERE u.branch_id = $1
    `;
    const params: any[] = [branchId];

    if (departmentId) {
      params.push(departmentId);
      sql += ` AND tp.department_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(u.name) LIKE $${params.length} OR LOWER(tp.employee_id) LIKE $${params.length} OR LOWER(tp.qualification) LIKE $${params.length})`;
    }

    sql += ` ORDER BY u.name ASC`;

    const teachers = await query(sql, params);
    return res.json({ teachers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. Get specific teacher details by ID
teachersRouter.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const profile = await queryOne(`
      SELECT tp.*, u.name, u.email as user_email, u.phone as user_phone, u.avatar_url, u.is_active,
             d.name as department_name, d.code as department_code,
             b.name as branch_name, b.code as branch_code, b.city as branch_city
      FROM teacher_profiles tp
      JOIN users u ON tp.user_id = u.id
      JOIN branches b ON u.branch_id = b.id
      LEFT JOIN departments d ON tp.department_id = d.id
      WHERE tp.id = $1
    `, [id]);

    if (!profile) {
      return res.status(404).json({ error: 'Teacher not found.' });
    }

    const assignments = await query(`
      SELECT ta.*, d.name as department_name, s.name as subject_name, s.code as subject_code,
             c.name as class_name, sec.name as section_name, b.name as batch_name
      FROM teacher_assignments ta
      JOIN departments d ON ta.department_id = d.id
      JOIN subjects s ON ta.subject_id = s.id
      JOIN classes c ON ta.class_id = c.id
      JOIN sections sec ON ta.section_id = sec.id
      JOIN batches b ON ta.batch_id = b.id
      WHERE ta.teacher_id = $1
    `, [id]);

    // Today's date, used only to surface a substitution against the row
    // whose day_of_week matches today — substitution_assignments are keyed
    // by a specific calendar date, while this grid is the static weekly
    // template, so "today" is the only date a cell can unambiguously show
    // a live replacement for.
    const todayDateStr = new Date().toISOString().split('T')[0];

    const timetable = await query(`
      SELECT tt.*, s.name as subject_name, s.code as subject_code,
             c.name as class_name, sec.name as section_name, b.name as batch_name,
             r.room_number, r.floor,
             sa.status as substitution_status, sa.date as substitution_date,
             sub_u.name as substitute_teacher_name, sub_tp.employee_id as substitute_employee_id
      FROM timetable_entries tt
      JOIN subjects s ON tt.subject_id = s.id
      JOIN classes c ON tt.class_id = c.id
      JOIN sections sec ON tt.section_id = sec.id
      JOIN batches b ON tt.batch_id = b.id
      JOIN rooms r ON tt.room_id = r.id
      LEFT JOIN substitution_assignments sa ON sa.timetable_entry_id = tt.id AND sa.date = $2
      LEFT JOIN teacher_profiles sub_tp ON sa.substitute_teacher_id = sub_tp.id
      LEFT JOIN users sub_u ON sub_tp.user_id = sub_u.id
      WHERE tt.teacher_id = $1
      ORDER BY
        CASE tt.day_of_week
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
          ELSE 7
        END,
        tt.period_number ASC
    `, [id, todayDateStr]);

    return res.json({ profile, assignments, timetable });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 8. Create new Teacher (Admin/Principal/HOD)
teachersRouter.post('/', authenticate, requireRoles('ADMIN', 'PRINCIPAL', 'HOD'), async (req: AuthRequest, res: Response) => {
  const {
    name,
    email,
    phone,
    department_id,
    employee_id,
    designation,
    qualification,
    specialization,
    experience_years,
    password
  } = req.body;

  if (!name || !employee_id || !department_id) {
    return res.status(400).json({ error: 'Name, employee ID, and department are required.' });
  }

  if (designation && !TEACHER_DESIGNATIONS.includes(designation)) {
    return res.status(400).json({ error: `Invalid designation. Allowed: ${TEACHER_DESIGNATIONS.join(', ')}` });
  }

  try {
    const branchId = req.user!.branch_id;
    const userId = 'usr-' + crypto.randomUUID();
    const teacherId = 'tchr-' + crypto.randomUUID();
    const username = email ? email.split('@')[0] : employee_id.toLowerCase();
    const passwordHash = await bcrypt.hash(password || 'Demo@12345', 10);

    await transaction(async (client) => {
      // Create user
      await client.query(`
        INSERT INTO users (id, branch_id, role, username, email, password_hash, name, phone, is_active)
        VALUES ($1, $2, 'TEACHER', $3, $4, $5, $6, $7, 1)
      `, [userId, branchId, username, email || `${username}@sirmv.edu.in`, passwordHash, name, phone || '']);

      // Create teacher profile
      await client.query(`
        INSERT INTO teacher_profiles (
          id, user_id, department_id, employee_id, designation, qualification, specialization, experience_years
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        teacherId,
        userId,
        department_id,
        employee_id,
        designation || 'Faculty',
        qualification || 'M.Sc., B.Ed',
        specialization || '',
        experience_years || 2
      ]);
    });

    await logAudit(req, 'TEACHER_CREATED', 'teacher_profiles', teacherId, { name, employee_id, department_id });

    return res.status(201).json({
      success: true,
      message: 'Teacher profile and account created successfully.',
      teacherId,
      userId
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 9. Update Teacher Profile
teachersRouter.put('/:id', authenticate, requireRoles('ADMIN', 'PRINCIPAL', 'HOD'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    name,
    phone,
    department_id,
    employee_id,
    designation,
    qualification,
    specialization,
    experience_years,
    is_active
  } = req.body;

  if (designation && !TEACHER_DESIGNATIONS.includes(designation)) {
    return res.status(400).json({ error: `Invalid designation. Allowed: ${TEACHER_DESIGNATIONS.join(', ')}` });
  }

  try {
    const teacher = await queryOne<{ user_id: string }>(`SELECT user_id FROM teacher_profiles WHERE id = $1`, [id]);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher profile not found.' });
    }

    await transaction(async (client) => {
      if (name || phone !== undefined || is_active !== undefined) {
        await client.query(`
          UPDATE users
          SET name = COALESCE($1, name),
              phone = COALESCE($2, phone),
              is_active = COALESCE($3, is_active),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [name, phone, is_active, teacher.user_id]);
      }

      await client.query(`
        UPDATE teacher_profiles
        SET department_id = COALESCE($1, department_id),
            employee_id = COALESCE($2, employee_id),
            designation = COALESCE($3, designation),
            qualification = COALESCE($4, qualification),
            specialization = COALESCE($5, specialization),
            experience_years = COALESCE($6, experience_years)
        WHERE id = $7
      `, [department_id, employee_id, designation, qualification, specialization, experience_years, id]);
    });

    await logAudit(req, 'TEACHER_UPDATED', 'teacher_profiles', id, { designation, qualification });

    return res.json({ success: true, message: 'Teacher profile updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 10. Assign Academic Subject/Class to Teacher
teachersRouter.post('/:id/assign', authenticate, requireRoles('ADMIN', 'PRINCIPAL', 'HOD'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { department_id, subject_id, class_id, section_id, batch_id, is_class_teacher } = req.body;

  if (!subject_id || !class_id || !section_id || !batch_id) {
    return res.status(400).json({ error: 'Subject, class, section, and batch are required.' });
  }

  try {
    const asgId = 'asg-' + crypto.randomUUID();
    const deptId = department_id || (await queryOne<{ department_id: string }>('SELECT department_id FROM teacher_profiles WHERE id = $1', [id]))?.department_id;

    await execute(`
      INSERT INTO teacher_assignments (
        id, teacher_id, department_id, subject_id, class_id, section_id, batch_id, academic_year_id, is_class_teacher
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ay-2026-27', $8)
    `, [asgId, id, deptId, subject_id, class_id, section_id, batch_id, is_class_teacher ? 1 : 0]);

    await logAudit(req, 'TEACHER_ASSIGNED', 'teacher_assignments', asgId, { teacherId: id, subject_id, class_id });

    return res.status(201).json({ success: true, message: 'Academic assignment saved successfully.', assignmentId: asgId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
