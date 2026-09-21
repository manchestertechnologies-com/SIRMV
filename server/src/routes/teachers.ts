import { Router, Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';

export const teachersRouter = Router();

// 1. Get Teacher Profile (Personal Details + Academic Assignments)
teachersRouter.get('/me/profile', authenticate, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const profile = db.prepare(`
    SELECT tp.*, u.name, u.email as user_email, u.phone as user_phone, u.avatar_url,
           d.name as department_name, d.code as department_code,
           b.name as branch_name, b.code as branch_code, b.city as branch_city
    FROM teacher_profiles tp
    JOIN users u ON tp.user_id = u.id
    JOIN branches b ON u.branch_id = b.id
    LEFT JOIN departments d ON tp.department_id = d.id
    WHERE tp.user_id = ? OR tp.id = ?
  `).get(userId, req.user!.teacher_id || '') as any;

  if (!profile) {
    return res.status(404).json({ error: 'Teacher profile not found.' });
  }

  // Fetch Academic Assignments
  const assignments = db.prepare(`
    SELECT ta.*, d.name as department_name, s.name as subject_name, s.code as subject_code,
           c.name as class_name, sec.name as section_name, b.name as batch_name
    FROM teacher_assignments ta
    JOIN departments d ON ta.department_id = d.id
    JOIN subjects s ON ta.subject_id = s.id
    JOIN classes c ON ta.class_id = c.id
    JOIN sections sec ON ta.section_id = sec.id
    JOIN batches b ON ta.batch_id = b.id
    WHERE ta.teacher_id = ?
  `).all(profile.id);

  return res.json({ profile, assignments });
});

// 2. Get Teacher Timetable (Today's & Weekly + Current Status Indicators)
teachersRouter.get('/me/timetable', authenticate, (req: AuthRequest, res: Response) => {
  const teacherId = req.user!.teacher_id;
  if (!teacherId && req.user!.role !== 'ADMIN' && req.user!.role !== 'HOD') {
    return res.status(400).json({ error: 'No teacher profile linked to this account.' });
  }

  const targetTeacherId = (req.query.teacher_id as string) || teacherId;

  // Day determination
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();
  const currentDayName = dayNames[today.getDay()] === 'Sunday' ? 'Monday' : dayNames[today.getDay()];
  const todayDateStr = today.toISOString().split('T')[0];

  // Fetch Weekly Timetable
  const weeklyTimetable = db.prepare(`
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
    WHERE tt.teacher_id = ?
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
  `).all(targetTeacherId) as any[];

  // Filter Today's Timetable
  const todayTimetable = weeklyTimetable.filter((t) => t.day_of_week === currentDayName);

  // Check Substitution Duties assigned to this teacher
  const substitutionDuties = db.prepare(`
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
    WHERE sa.substitute_teacher_id = ? AND sa.date = ?
  `).all(targetTeacherId, todayDateStr) as any[];

  // Check Pending Attendance for this teacher's lectures today
  const pendingAttendanceLectures = db.prepare(`
    SELECT ls.*, s.name as subject_name, c.name as class_name, sec.name as section_name, r.room_number
    FROM lecture_sessions ls
    JOIN subjects s ON ls.subject_id = s.id
    JOIN classes c ON ls.class_id = c.id
    JOIN sections sec ON ls.section_id = sec.id
    JOIN rooms r ON ls.room_id = r.id
    WHERE (ls.teacher_id = ? OR ls.substitute_teacher_id = ?)
      AND ls.date = ? AND ls.finalization_status = 'PENDING'
  `).all(targetTeacherId, targetTeacherId, todayDateStr);

  // Check Upcoming Tests
  const upcomingTests = db.prepare(`
    SELECT es.*, e.name as exam_name, e.exam_type, e.start_date, s.name as subject_name, c.name as class_name
    FROM exam_subjects es
    JOIN exams e ON es.exam_id = e.id
    JOIN subjects s ON es.subject_id = s.id
    JOIN classes c ON es.class_id = c.id
    ORDER BY e.start_date ASC LIMIT 5
  `).all();

  return res.json({
    currentDay: currentDayName,
    todayDate: todayDateStr,
    todayTimetable,
    weeklyTimetable,
    substitutionDuties,
    pendingAttendanceLectures,
    upcomingTests
  });
});

// 3. Acknowledge Substitution Duty
teachersRouter.post('/substitutions/:id/acknowledge', authenticate, requireRoles('TEACHER', 'HOD', 'ADMIN'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const duty = db.prepare(`SELECT * FROM substitution_assignments WHERE id = ?`).get(id) as any;
  if (!duty) {
    return res.status(404).json({ error: 'Substitution duty record not found.' });
  }

  db.prepare(`
    UPDATE substitution_assignments 
    SET status = 'ACKNOWLEDGED', acknowledged_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id);

  logAudit(req, 'SUBSTITUTION_ACKNOWLEDGED', 'substitution_assignments', id, { dutyId: id, substituteId: duty.substitute_teacher_id });

  return res.json({ success: true, message: 'Substitution duty acknowledged successfully.' });
});

// 4. List all teachers for branch (for dropdowns / selectors)
teachersRouter.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;

  const teachers = db.prepare(`
    SELECT tp.*, u.name, u.email, u.phone, u.avatar_url, d.name as department_name, d.code as department_code
    FROM teacher_profiles tp
    JOIN users u ON tp.user_id = u.id
    LEFT JOIN departments d ON tp.department_id = d.id
    WHERE u.branch_id = ?
    ORDER BY u.name ASC
  `).all(branchId);

  return res.json({ teachers });
});
