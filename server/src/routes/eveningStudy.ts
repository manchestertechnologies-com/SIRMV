import { Router, Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import crypto from 'crypto';

export const eveningStudyRouter = Router();

// 1. Get or Create Evening Study Session for today/date
eveningStudyRouter.get('/session', authenticate, (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const studyHall = (req.query.study_hall as string) || 'Study Hall 1 (Dr. Sir MV Block)';

  let session = db.prepare(`
    SELECT ess.*, u.name as supervisor_name
    FROM evening_study_sessions ess
    LEFT JOIN users u ON ess.supervisor_id = u.id
    WHERE ess.branch_id = ? AND ess.date = ? AND ess.study_hall = ?
  `).get(branchId, date, studyHall) as any;

  if (!session) {
    // Create new session
    const id = 'ess-' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO evening_study_sessions (id, branch_id, date, study_hall, floor, start_time, end_time, supervisor_id, remarks)
      VALUES (?, ?, ?, ?, 2, '18:30', '21:00', ?, 'Evening study session')
    `).run(id, branchId, date, studyHall, req.user!.id);

    session = db.prepare(`
      SELECT ess.*, u.name as supervisor_name
      FROM evening_study_sessions ess
      LEFT JOIN users u ON ess.supervisor_id = u.id
      WHERE ess.id = ?
    `).get(id);
  }

  // Fetch hostelite / enrolled students with evening study attendance records
  const students = db.prepare(`
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
  `).all(session.id, branchId);

  return res.json({ session, students });
});

// 2. Mark / Update Evening Study Attendance
eveningStudyRouter.post('/mark', authenticate, requireRoles('WARDEN', 'TEACHER', 'FLOOR_ATTENDER', 'ADMIN', 'PRINCIPAL'), (req: AuthRequest, res: Response) => {
  const { session_id, records } = req.body; // records: Array<{ student_id, entry_time, exit_time, duration_minutes, status, remarks }>

  if (!session_id || !Array.isArray(records)) {
    return res.status(400).json({ error: 'session_id and records array are required.' });
  }

  const upsertStmt = db.prepare(`
    INSERT INTO evening_study_attendance (id, session_id, student_id, entry_time, exit_time, duration_minutes, status, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id, student_id) DO UPDATE SET
      entry_time = excluded.entry_time,
      exit_time = excluded.exit_time,
      duration_minutes = excluded.duration_minutes,
      status = excluded.status,
      remarks = excluded.remarks
  `);

  const tx = db.transaction((rows: any[]) => {
    for (const r of rows) {
      const id = 'esa-' + crypto.randomUUID();
      upsertStmt.run(id, session_id, r.student_id, r.entry_time || '18:30', r.exit_time || '21:00', r.duration_minutes || 150, r.status || 'PRESENT', r.remarks || '');
    }
  });

  tx(records);

  logAudit(req, 'EVENING_STUDY_ATTENDANCE_MARKED', 'evening_study_sessions', session_id, {
    totalRecords: records.length
  });

  return res.json({ success: true, message: 'Evening study attendance saved successfully.' });
});

// 3. Evening Study Attendance Reports (Daily, Weekly, Monthly, Student-wise, Hall-wise)
eveningStudyRouter.get('/reports', authenticate, (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;
  const startDate = (req.query.start_date as string) || '2026-09-01';
  const endDate = (req.query.end_date as string) || '2026-09-30';
  const studentId = req.query.student_id as string;
  const studyHall = req.query.study_hall as string;

  let query = `
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
    query += ` AND esa.student_id = ?`;
    params.push(studentId);
  }
  if (studyHall) {
    query += ` AND ess.study_hall = ?`;
    params.push(studyHall);
  }

  query += ` ORDER BY ess.date DESC, sp.name ASC`;

  const report = db.prepare(query).all(...params);

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
