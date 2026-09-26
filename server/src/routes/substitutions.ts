import { Router, Response } from 'express';
import { query, queryOne, execute } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import crypto from 'crypto';

export const substitutionsRouter = Router();

// Resolves the calling HOD's own department (or null if not an HOD / no
// department assigned). Reused to scope the substitution hub so an HOD only
// ever sees their own department's faculty and absences — not the whole
// branch. Mirrors the same pattern used for invigilator-request scoping in
// examManagement.ts.
async function resolveHodDepartmentId(req: AuthRequest): Promise<string | null> {
  if (req.user!.role !== 'HOD') return null;
  const dept = await queryOne<{ id: string }>(`SELECT id FROM departments WHERE hod_user_id = $1`, [req.user!.id]);
  return dept ? dept.id : null;
}

// 1. Mark Teacher Absent (System auto-identifies affected timetable periods and creates substitution required entries)
// A real upsert keyed on (teacher_id, date) — teacher_absences has a
// UNIQUE(teacher_id, date) constraint, so marking the same teacher absent
// on the same date more than once (double-click, resubmission, re-marking
// after a refresh) updates the same row instead of silently inserting a
// duplicate. Duplicates were the root cause of the "N faculty absent" stat
// and the "Affected Timetable Periods" list both inflating/duplicating.
substitutionsRouter.post('/absence', authenticate, requireRoles('HOD', 'PRINCIPAL', 'ADMIN', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  const { teacher_id, date, reason } = req.body;

  if (!teacher_id || !date) {
    return res.status(400).json({ error: 'teacher_id and date are required.' });
  }

  // A plain TEACHER can only mark themselves absent, never another faculty
  // member.
  if (req.user!.role === 'TEACHER') {
    const own = await queryOne<{ id: string }>(`SELECT id FROM teacher_profiles WHERE user_id = $1`, [req.user!.id]);
    if (!own || own.id !== teacher_id) {
      return res.status(403).json({ error: 'You can only mark yourself absent.' });
    }
  }

  try {
    // Determine day of week for that date
    const targetDate = new Date(date);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[targetDate.getDay()] === 'Sunday' ? 'Monday' : dayNames[targetDate.getDay()];

    const absenceId = 'abs-' + crypto.randomUUID();
    await execute(`
      INSERT INTO teacher_absences (id, teacher_id, date, reason, status)
      VALUES ($1, $2, $3, $4, 'RECORDED')
      ON CONFLICT (teacher_id, date) DO UPDATE SET reason = EXCLUDED.reason, status = 'RECORDED'
    `, [absenceId, teacher_id, date, reason || 'Absent/Leave']);

    // Find all affected timetable periods for this teacher on this day of week
    const affectedPeriods = await query(`
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
      WHERE tt.teacher_id = $1 AND tt.day_of_week = $2
      ORDER BY tt.period_number ASC
    `, [teacher_id, dayOfWeek]);

    await logAudit(req, 'TEACHER_MARKED_ABSENT', 'teacher_absences', absenceId, {
      teacher_id,
      date,
      affected_count: affectedPeriods.length,
      periods: affectedPeriods.map((p: any) => ({ period: p.period_number, subject: p.subject_name, class: p.class_name, room: p.room_number }))
    });

    return res.json({
      success: true,
      message: `Teacher marked absent. ${affectedPeriods.length} timetable period(s) require substitution.`,
      absenceId,
      affectedPeriods
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Substitution Center (HOD & Principal view: list affected periods & find available teachers)
// An HOD only ever sees their own department here — never the whole branch,
// and never non-teaching staff (this endpoint only ever touches
// teacher_profiles, so non-teaching staff were never included).
substitutionsRouter.get('/center', authenticate, requireRoles('HOD', 'PRINCIPAL', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const targetDate = new Date(date);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[targetDate.getDay()] === 'Sunday' ? 'Monday' : dayNames[targetDate.getDay()];
    const hodDepartmentId = await resolveHodDepartmentId(req);

    // All teaching staff visible in this scope (branch, or just the HOD's
    // department) — used both to list who is currently present/eligible to
    // be marked absent, and to compute the absent count/list below.
    const scopedTeachersParams: any[] = [branchId];
    let scopedTeachersSql = `
      SELECT tp.id as teacher_id, u.name as teacher_name, tp.employee_id, d.name as department_name, d.id as department_id
      FROM teacher_profiles tp
      JOIN users u ON tp.user_id = u.id
      LEFT JOIN departments d ON tp.department_id = d.id
      WHERE u.branch_id = $1 AND u.is_active = 1
    `;
    if (hodDepartmentId) {
      scopedTeachersParams.push(hodDepartmentId);
      scopedTeachersSql += ` AND tp.department_id = $${scopedTeachersParams.length}`;
    }
    scopedTeachersSql += ` ORDER BY u.name ASC`;
    const scopedTeachers = await query(scopedTeachersSql, scopedTeachersParams);

    // Get all absent teachers for this date (scoped to the HOD's department
    // when the caller is an HOD).
    const absenceParams: any[] = [date, branchId];
    let absenceSql = `
      SELECT ta.*, u.name as teacher_name, u.phone as teacher_phone, tp.employee_id, d.name as department_name, d.id as department_id
      FROM teacher_absences ta
      JOIN teacher_profiles tp ON ta.teacher_id = tp.id
      JOIN users u ON tp.user_id = u.id
      LEFT JOIN departments d ON tp.department_id = d.id
      WHERE ta.date = $1 AND ta.status = 'RECORDED' AND u.branch_id = $2
    `;
    if (hodDepartmentId) {
      absenceParams.push(hodDepartmentId);
      absenceSql += ` AND tp.department_id = $${absenceParams.length}`;
    }
    const absences = await query(absenceSql, absenceParams);
    const absentTeacherIds = absences.map((a: any) => a.teacher_id);
    const presentTeachers = scopedTeachers.filter((t: any) => !absentTeacherIds.includes(t.teacher_id));

    // For each absent teacher, find their timetable entries and check if already assigned a substitute
    const substitutionRequirements: any[] = [];

    for (const abs of absences) {
      const entries = await query(`
        SELECT tt.*, s.name as subject_name, s.code as subject_code,
               c.name as class_name, sec.name as section_name, b.name as batch_name,
               r.room_number, r.floor
        FROM timetable_entries tt
        JOIN subjects s ON tt.subject_id = s.id
        JOIN classes c ON tt.class_id = c.id
        JOIN sections sec ON tt.section_id = sec.id
        JOIN batches b ON tt.batch_id = b.id
        JOIN rooms r ON tt.room_id = r.id
        WHERE tt.teacher_id = $1 AND tt.day_of_week = $2
        ORDER BY tt.period_number ASC
      `, [abs.teacher_id, dayOfWeek]);

      for (const entry of entries) {
        // Check existing assignment
        const existingSub = await queryOne(`
          SELECT sa.*, sub_u.name as substitute_teacher_name, sub_tp.employee_id as substitute_employee_id
          FROM substitution_assignments sa
          JOIN teacher_profiles sub_tp ON sa.substitute_teacher_id = sub_tp.id
          JOIN users sub_u ON sub_tp.user_id = sub_u.id
          WHERE sa.timetable_entry_id = $1 AND sa.date = $2
        `, [entry.id, date]);

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
      absences,
      absentTeacherIds,
      presentTeachers,
      scopedToDepartment: hodDepartmentId,
      requirements: substitutionRequirements
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Find Available Teachers for a specific Timetable Period (Prioritizes Free Teachers)
substitutionsRouter.get('/available-teachers', authenticate, requireRoles('HOD', 'PRINCIPAL', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const dayOfWeek = (req.query.day_of_week as string) || 'Monday';
    const periodNumber = parseInt(req.query.period_number as string, 10) || 1;
    const hodDepartmentId = await resolveHodDepartmentId(req);
    // An HOD's proxy pool defaults to their own department unless they
    // explicitly ask for a different one.
    const departmentId = (req.query.department_id as string) || hodDepartmentId || undefined;
    const excludeTeacherId = req.query.exclude_teacher_id as string;

    // 1. Get all active teachers in branch
    let sqlQuery = `
      SELECT tp.id as teacher_id, tp.employee_id, u.name, u.phone, u.avatar_url,
             d.id as department_id, d.name as department_name, d.code as department_code,
             tp.designation, tp.qualification
      FROM teacher_profiles tp
      JOIN users u ON tp.user_id = u.id
      LEFT JOIN departments d ON tp.department_id = d.id
      WHERE u.branch_id = $1 AND u.is_active = 1
    `;
    const params: any[] = [branchId];

    if (departmentId) {
      params.push(departmentId);
      sqlQuery += ` AND tp.department_id = $${params.length}`;
    }
    if (excludeTeacherId) {
      params.push(excludeTeacherId);
      sqlQuery += ` AND tp.id != $${params.length}`;
    }

    sqlQuery += ` ORDER BY u.name ASC`;
    const allTeachers = await query(sqlQuery, params);

    // 2. Find which teachers are BUSY during this period on this day
    const busyTeachers = (await query(`
      SELECT DISTINCT teacher_id FROM timetable_entries
      WHERE branch_id = $1 AND day_of_week = $2 AND period_number = $3
    `, [branchId, dayOfWeek, periodNumber])).map((r: any) => r.teacher_id);

    // 3. Find which teachers are already assigned substitution in this period today
    const busySubstitutes = (await query(`
      SELECT sa.substitute_teacher_id FROM substitution_assignments sa
      JOIN timetable_entries tt ON sa.timetable_entry_id = tt.id
      WHERE tt.branch_id = $1 AND sa.date = $2 AND tt.period_number = $3
    `, [branchId, date, periodNumber])).map((r: any) => r.substitute_teacher_id);

    // 4. Find absent teachers today
    const absentTeachers = (await query(`
      SELECT teacher_id FROM teacher_absences WHERE date = $1 AND status = 'RECORDED'
    `, [date])).map((r: any) => r.teacher_id);

    // Classify each teacher
    const evaluatedTeachers = allTeachers.map((t: any) => {
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
    evaluatedTeachers.sort((a: any, b: any) => (b.isFree ? 1 : 0) - (a.isFree ? 1 : 0));

    return res.json({
      periodNumber,
      dayOfWeek,
      date,
      teachers: evaluatedTeachers
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Assign Substitute Teacher
substitutionsRouter.post('/assign', authenticate, requireRoles('HOD', 'PRINCIPAL', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const { timetable_entry_id, date, original_teacher_id, substitute_teacher_id, remarks } = req.body;

  if (!timetable_entry_id || !date || !original_teacher_id || !substitute_teacher_id) {
    return res.status(400).json({ error: 'Missing required parameters for substitution assignment.' });
  }

  try {
    const id = 'sub-' + crypto.randomUUID();
    const assignedBy = req.user!.id;

    await execute(`
      INSERT INTO substitution_assignments (
        id, timetable_entry_id, date, original_teacher_id, substitute_teacher_id, assigned_by, status, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, 'ASSIGNED', $7)
      ON CONFLICT (id) DO UPDATE SET
        substitute_teacher_id = EXCLUDED.substitute_teacher_id,
        remarks = EXCLUDED.remarks
    `, [id, timetable_entry_id, date, original_teacher_id, substitute_teacher_id, assignedBy, remarks || 'Assigned by HOD']);

    // Also update or create the lecture session record to reflect the substitute teacher
    const timetable = await queryOne(`SELECT * FROM timetable_entries WHERE id = $1`, [timetable_entry_id]);
    if (timetable) {
      const existingLec = await queryOne(`SELECT id FROM lecture_sessions WHERE timetable_entry_id = $1 AND date = $2`, [timetable_entry_id, date]);
      if (existingLec) {
        await execute(`
          UPDATE lecture_sessions 
          SET substitute_teacher_id = $1, teacher_status = 'SUBSTITUTE'
          WHERE id = $2
        `, [substitute_teacher_id, existingLec.id]);
      } else {
        const lecId = 'lec-' + crypto.randomUUID();
        const room = await queryOne<{ floor: number }>('SELECT floor FROM rooms WHERE id = $1', [timetable.room_id]);
        await execute(`
          INSERT INTO lecture_sessions (
            id, branch_id, timetable_entry_id, date, academic_year, class_id, section_id, batch_id,
            subject_id, teacher_id, substitute_teacher_id, room_id, floor, scheduled_start, scheduled_end,
            teacher_status, finalization_status
          ) VALUES ($1, $2, $3, $4, '2026-27', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'SUBSTITUTE', 'PENDING')
        `, [
          lecId, timetable.branch_id, timetable_entry_id, date,
          timetable.class_id, timetable.section_id, timetable.batch_id,
          timetable.subject_id, original_teacher_id, substitute_teacher_id,
          timetable.room_id, room ? room.floor : 1, timetable.start_time, timetable.end_time
        ]);
      }
    }

    await logAudit(req, 'SUBSTITUTION_ASSIGNED', 'substitution_assignments', id, {
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
