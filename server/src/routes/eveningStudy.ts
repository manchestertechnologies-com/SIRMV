import { Router, Response } from 'express';
import { query, queryOne, execute, transaction } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import crypto from 'crypto';

export const eveningStudyRouter = Router();

// 1. Get or Create Evening Study Session for today/date
eveningStudyRouter.get('/session', authenticate, async (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const studyHall = (req.query.study_hall as string) || 'Study Hall 1 (Dr. Sir MV Block)';

  let session = await queryOne(`
    SELECT ess.*, u.name as supervisor_name
    FROM evening_study_sessions ess
    LEFT JOIN users u ON ess.supervisor_id = u.id
    WHERE ess.branch_id = ? AND ess.date = ? AND ess.study_hall = ?
  `, [branchId, date, studyHall]);

  if (!session) {
    // Create new session
    const id = 'ess-' + crypto.randomUUID();
    await execute(`
      INSERT INTO evening_study_sessions (id, branch_id, date, study_hall, floor, start_time, end_time, supervisor_id, remarks)
      VALUES (?, ?, ?, ?, 2, '18:30', '21:00', ?, 'Evening study session')
    `, [id, branchId, date, studyHall, req.user!.id]);

    session = await queryOne(`
      SELECT ess.*, u.name as supervisor_name
      FROM evening_study_sessions ess
      LEFT JOIN users u ON ess.supervisor_id = u.id
      WHERE ess.id = ?
    `, [id]);
  }

  // Fetch hostelite / enrolled students with evening study attendance records
  const students = await query(`
    SELECT sp.*, c.name as class_name, sec.name as section_name, b.name as batch_name,
           esa.id as attendance_id,
           esa.entry_time,
           esa.exit_time,
           esa.duration_minutes,
           COALESCE(esa.status, 'PRESENT') as status,
           esa.remarks as student_remarks
    FROM student_profiles sp
    JOIN classes c ON sp.class_id = c.id
    JOIN sections sec ON sp.section_id = sec.id
    JOIN batches b ON sp.batch_id = b.id
    LEFT JOIN evening_study_attendance esa ON esa.student_id = sp.id AND esa.session_id = ?
    WHERE sp.branch_id = ?
    ORDER BY sp.name ASC
  `, [session.id, branchId]);

  return res.json({ session, students });
});

// 2. Mark / Update Evening Study Attendance
eveningStudyRouter.post('/mark', authenticate, requireRoles('WARDEN', 'HEAD_WARDEN', 'TEACHER', 'FLOOR_ATTENDER', 'ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const { session_id, records } = req.body; // records: Array<{ student_id, entry_time, exit_time, duration_minutes, status, remarks }>

  if (!session_id || !Array.isArray(records)) {
    return res.status(400).json({ error: 'session_id and records array are required.' });
  }

  await transaction(async (client) => {
    for (const r of records) {
      const id = 'esa-' + crypto.randomUUID();
      await client.query(`
        INSERT INTO evening_study_attendance (id, session_id, student_id, entry_time, exit_time, duration_minutes, status, remarks)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT(session_id, student_id) DO UPDATE SET
          entry_time = EXCLUDED.entry_time,
          exit_time = EXCLUDED.exit_time,
          duration_minutes = EXCLUDED.duration_minutes,
          status = EXCLUDED.status,
          remarks = EXCLUDED.remarks
      `, [id, session_id, r.student_id, r.entry_time || '18:30', r.exit_time || '21:00', r.duration_minutes || 150, r.status || 'PRESENT', r.remarks || '']);
    }
  });

  logAudit(req, 'EVENING_STUDY_ATTENDANCE_MARKED', 'evening_study_sessions', session_id, {
    totalRecords: records.length
  });

  return res.json({ success: true, message: 'Evening study attendance saved successfully.' });
});

// 3. Evening Study Attendance Reports (Daily, Weekly, Monthly, Student-wise, Hall-wise)
eveningStudyRouter.get('/reports', authenticate, async (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;
  const startDate = (req.query.start_date as string) || '2026-09-01';
  const endDate = (req.query.end_date as string) || '2026-09-30';
  const studentId = req.query.student_id as string;
  const studyHall = req.query.study_hall as string;

  let sql = `
    SELECT esa.*, ess.date, ess.study_hall, ess.floor,
           sp.name as student_name, sp.register_number, sp.is_hostelite,
           c.name as class_name, sec.name as section_name, b.name as batch_name
    FROM evening_study_attendance esa
    JOIN evening_study_sessions ess ON esa.session_id = ess.id
    JOIN student_profiles sp ON esa.student_id = sp.id
    JOIN classes c ON sp.class_id = c.id
    JOIN sections sec ON sp.section_id = sec.id
    JOIN batches b ON sp.batch_id = b.id
    WHERE ess.branch_id = ? AND ess.date BETWEEN ? AND ?
  `;
  const params: any[] = [branchId, startDate, endDate];

  if (studentId) {
    sql += ` AND esa.student_id = ?`;
    params.push(studentId);
  }
  if (studyHall) {
    sql += ` AND ess.study_hall = ?`;
    params.push(studyHall);
  }

  sql += ` ORDER BY ess.date DESC, sp.name ASC`;

  const report = await query(sql, params);

  // Aggregated summary
  const summary = {
    totalSessions: new Set(report.map((r: any) => r.session_id)).size,
    totalRecords: report.length,
    present: report.filter((r: any) => r.status === 'PRESENT').length,
    absent: report.filter((r: any) => r.status === 'ABSENT').length,
    late: report.filter((r: any) => r.status === 'LATE').length,
    leftEarly: report.filter((r: any) => r.status === 'LEFT_EARLY').length,
    onLeave: report.filter((r: any) => r.status === 'ON_LEAVE').length
  };

  return res.json({ summary, report });
});

