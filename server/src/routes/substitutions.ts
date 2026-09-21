import { Router, Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import crypto from 'crypto';

export const substitutionsRouter = Router();

// 1. Mark Teacher Absent (System auto-identifies affected timetable periods and creates substitution required entries)
substitutionsRouter.post('/absence', authenticate, requireRoles('HOD', 'PRINCIPAL', 'ADMIN', 'TEACHER'), (req: AuthRequest, res: Response) => {
  const { teacher_id, date, reason } = req.body;

  if (!teacher_id || !date) {
    return res.status(400).json({ error: 'teacher_id and date are required.' });
  }

  // Determine day of week for that date
  const targetDate = new Date(date);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = dayNames[targetDate.getDay()] === 'Sunday' ? 'Monday' : dayNames[targetDate.getDay()];

  const absenceId = 'abs-' + crypto.randomUUID();
  db.prepare(`
    INSERT OR REPLACE INTO teacher_absences (id, teacher_id, date, reason, status)
    VALUES (?, ?, ?, ?, 'RECORDED')
  `).run(absenceId, teacher_id, date, reason || 'Absent/Leave');

  // Find all affected timetable periods for this teacher on this day of week
  const affectedPeriods = db.prepare(`
    SELECT tt.*, s.name as subject_name, c.name as class_name, sec.name as section_name, b.name as batch_name,
           r.room_number, r.floor,
           u.name as teacher_name
    FROM timetable_entries tt
    JOIN subjects s ON tt.subject_id = s.id
    JOIN classes c ON tt.class_id = c.id
    JOIN sections sec ON tt.section_id = sec.id
    JOIN batches b ON tt.batch_id = b.id
    JOIN rooms r ON tt.room_id = r.id
    JOIN teacher_profiles tp ON tt.teacher_id = tp.id
    JOIN users u ON tp.user_id = u.id
    WHERE tt.teacher_id = ? AND tt.day_of_week = ?
    ORDER BY tt.period_number ASC
  `).all(teacher_id, dayOfWeek) as any[];

  logAudit(req, 'TEACHER_MARKED_ABSENT', 'teacher_absences', absenceId, {
    teacher_id,
    date,
    affected_count: affectedPeriods.length,
    periods: affectedPeriods.map((p) => ({ period: p.period_number, subject: p.subject_name, class: p.class_name, room: p.room_number }))
  });

  return res.json({
    success: true,
    message: `Teacher marked absent. ${affectedPeriods.length} timetable period(s) require substitution.`,
    absenceId,
    affectedPeriods
  });
});

// 2. Substitution Center (HOD & Principal view: list affected periods & find available teachers)
substitutionsRouter.get('/center', authenticate, requireRoles('HOD', 'PRINCIPAL', 'ADMIN'), (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const targetDate = new Date(date);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = dayNames[targetDate.getDay()] === 'Sunday' ? 'Monday' : dayNames[targetDate.getDay()];

  // Get all absent teachers for this date
  const absences = db.prepare(`
    SELECT ta.*, u.name as teacher_name, u.phone as teacher_phone, tp.employee_id, d.name as department_name, d.id as department_id
    FROM teacher_absences ta
    JOIN teacher_profiles tp ON ta.teacher_id = tp.id
    JOIN users u ON tp.user_id = u.id
    LEFT JOIN departments d ON tp.department_id = d.id
    WHERE ta.date = ? AND ta.status = 'RECORDED' AND u.branch_id = ?
  `).all(date, branchId) as any[];

  // For each absent teacher, find their timetable entries and check if already assigned a substitute
  const substitutionRequirements: any[] = [];

  for (const abs of absences) {
    const entries = db.prepare(`
      SELECT tt.*, s.name as subject_name, s.code as subject_code,
             c.name as class_name, sec.name as section_name, b.name as batch_name,
             r.room_number, r.floor
      FROM timetable_entries tt
      JOIN subjects s ON tt.subject_id = s.id
      JOIN classes c ON tt.class_id = c.id
      JOIN sections sec ON tt.section_id = sec.id
      JOIN batches b ON tt.batch_id = b.id
      JOIN rooms r ON tt.room_id = r.id
      WHERE tt.teacher_id = ? AND tt.day_of_week = ?
      ORDER BY tt.period_number ASC
    `).all(abs.teacher_id, dayOfWeek) as any[];

    for (const entry of entries) {
      // Check existing assignment
      const existingSub = db.prepare(`
        SELECT sa.*, sub_u.name as substitute_teacher_name, sub_tp.employee_id as substitute_employee_id
        FROM substitution_assignments sa
        JOIN teacher_profiles sub_tp ON sa.substitute_teacher_id = sub_tp.id
        JOIN users sub_u ON sub_tp.user_id = sub_u.id
        WHERE sa.timetable_entry_id = ? AND sa.date = ?
      `).get(entry.id, date) as any;

      substitutionRequirements.push({
        absence: abs,
        timetableEntry: entry,
        dayOfWeek,
        date,
        substitutionAssignment: existingSub || null,
        status: existingSub ? existingSub.status : 'SUBSTITUTION REQUIRED'
      });
    }
  }

  return res.json({
    date,
    dayOfWeek,
    absentTeacherCount: absences.length,
    requirements: substitutionRequirements
  });
});

// 3. Find Available Teachers for a specific Timetable Period (Prioritizes Free Teachers)
substitutionsRouter.get('/available-teachers', authenticate, requireRoles('HOD', 'PRINCIPAL', 'ADMIN'), (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const dayOfWeek = (req.query.day_of_week as string) || 'Monday';
  const periodNumber = parseInt(req.query.period_number as string, 10) || 1;
  const departmentId = req.query.department_id as string;
  const excludeTeacherId = req.query.exclude_teacher_id as string;

  // 1. Get all active teachers in branch
  let query = `
    SELECT tp.id as teacher_id, tp.employee_id, u.name, u.phone, u.avatar_url,
           d.id as department_id, d.name as department_name, d.code as department_code,
           tp.designation, tp.qualification
    FROM teacher_profiles tp
    JOIN users u ON tp.user_id = u.id
    LEFT JOIN departments d ON tp.department_id = d.id
    WHERE u.branch_id = ? AND u.is_active = 1
  `;
  const params: any[] = [branchId];

  if (departmentId) {
    query += ` AND tp.department_id = ?`;
    params.push(departmentId);
  }
  if (excludeTeacherId) {
    query += ` AND tp.id != ?`;
    params.push(excludeTeacherId);
  }

  query += ` ORDER BY u.name ASC`;
  const allTeachers = db.prepare(query).all(...params) as any[];

  // 2. Find which teachers are BUSY during this period on this day
  const busyTeachers = db.prepare(`
    SELECT DISTINCT teacher_id FROM timetable_entries
    WHERE branch_id = ? AND day_of_week = ? AND period_number = ?
  `).all(branchId, dayOfWeek, periodNumber).map((r: any) => r.teacher_id);

  // 3. Find which teachers are already assigned substitution in this period today
  const busySubstitutes = db.prepare(`
    SELECT sa.substitute_teacher_id FROM substitution_assignments sa
    JOIN timetable_entries tt ON sa.timetable_entry_id = tt.id
    WHERE tt.branch_id = ? AND sa.date = ? AND tt.period_number = ?
  `).all(branchId, date, periodNumber).map((r: any) => r.substitute_teacher_id);

  // 4. Find absent teachers today
  const absentTeachers = db.prepare(`
    SELECT teacher_id FROM teacher_absences WHERE date = ? AND status = 'RECORDED'
  `).all(date).map((r: any) => r.teacher_id);

  // Classify each teacher
  const evaluatedTeachers = allTeachers.map((t) => {
    const isAbsent = absentTeachers.includes(t.teacher_id);
    const hasTimetableClass = busyTeachers.includes(t.teacher_id);
    const hasSubDuty = busySubstitutes.includes(t.teacher_id);
    const isFree = !isAbsent && !hasTimetableClass && !hasSubDuty;

    return {
      ...t,
      isFree,
      isAbsent,
      hasTimetableClass,
      hasSubDuty,
      statusLabel: isAbsent ? 'ABSENT' : (hasTimetableClass ? 'IN CLASS' : (hasSubDuty ? 'ON SUB DUTY' : 'FREE PERIOD'))
    };
  });

  // Sort free teachers first
  evaluatedTeachers.sort((a, b) => (b.isFree ? 1 : 0) - (a.isFree ? 1 : 0));

  return res.json({
    periodNumber,
    dayOfWeek,
    date,
    teachers: evaluatedTeachers
  });
});

// 4. Assign Substitute Teacher
substitutionsRouter.post('/assign', authenticate, requireRoles('HOD', 'PRINCIPAL', 'ADMIN'), (req: AuthRequest, res: Response) => {
  const { timetable_entry_id, date, original_teacher_id, substitute_teacher_id, remarks } = req.body;

  if (!timetable_entry_id || !date || !original_teacher_id || !substitute_teacher_id) {
    return res.status(400).json({ error: 'Missing required parameters for substitution assignment.' });
  }

  const id = 'sub-' + crypto.randomUUID();
  const assignedBy = req.user!.id;

  db.prepare(`
    INSERT OR REPLACE INTO substitution_assignments (
      id, timetable_entry_id, date, original_teacher_id, substitute_teacher_id, assigned_by, status, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, 'ASSIGNED', ?)
  `).run(id, timetable_entry_id, date, original_teacher_id, substitute_teacher_id, assignedBy, remarks || 'Assigned by HOD');

  // Also update or create the lecture session record to reflect the substitute teacher
  const timetable = db.prepare(`SELECT * FROM timetable_entries WHERE id = ?`).get(timetable_entry_id) as any;
  if (timetable) {
    const existingLec = db.prepare(`SELECT id FROM lecture_sessions WHERE timetable_entry_id = ? AND date = ?`).get(timetable_entry_id, date) as any;
    if (existingLec) {
      db.prepare(`
        UPDATE lecture_sessions 
        SET substitute_teacher_id = ?, teacher_status = 'SUBSTITUTE'
        WHERE id = ?
      `).run(substitute_teacher_id, existingLec.id);
    } else {
      const lecId = 'lec-' + crypto.randomUUID();
      const room = db.prepare('SELECT floor FROM rooms WHERE id = ?').get(timetable.room_id) as { floor: number };
      db.prepare(`
        INSERT INTO lecture_sessions (
          id, branch_id, timetable_entry_id, date, academic_year, class_id, section_id, batch_id,
          subject_id, teacher_id, substitute_teacher_id, room_id, floor, scheduled_start, scheduled_end,
          teacher_status, finalization_status
        ) VALUES (?, ?, ?, ?, '2026-27', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBSTITUTE', 'PENDING')
      `).run(
        lecId, timetable.branch_id, timetable_entry_id, date,
        timetable.class_id, timetable.section_id, timetable.batch_id,
        timetable.subject_id, original_teacher_id, substitute_teacher_id,
        timetable.room_id, room ? room.floor : 1, timetable.start_time, timetable.end_time
      );
    }
  }

  logAudit(req, 'SUBSTITUTION_ASSIGNED', 'substitution_assignments', id, {
    timetable_entry_id,
    date,
    original_teacher_id,
    substitute_teacher_id,
    assigned_by: assignedBy
  });

  return res.json({
    success: true,
    message: 'Substitute teacher assigned successfully and notification duty created.',
    substitutionId: id
  });
});
