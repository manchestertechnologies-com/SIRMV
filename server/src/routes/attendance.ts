import { Router, Response } from 'express';
import { query, queryOne, execute, transaction } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { faceDetectionService } from '../services/faceDetectionService';
import crypto from 'crypto';

export const attendanceRouter = Router();

// 1. Get Students for Attendance Sheet (with existing marks if recorded)
attendanceRouter.get('/lecture/:lectureSessionId', authenticate, async (req: AuthRequest, res: Response) => {
  const { lectureSessionId } = req.params;

  const lecture = await queryOne(`
    SELECT ls.*, c.name as class_name, sec.name as section_name, b.name as batch_name, s.name as subject_name
    FROM lecture_sessions ls
    JOIN classes c ON ls.class_id = c.id
    JOIN sections sec ON ls.section_id = sec.id
    JOIN batches b ON ls.batch_id = b.id
    JOIN subjects s ON ls.subject_id = s.id
    WHERE ls.id = ?
  `, [lectureSessionId]);

  if (!lecture) {
    return res.status(404).json({ error: 'Lecture session not found.' });
  }

  // Get all enrolled students for this class/section/batch
  const students = await query(`
    SELECT sp.*, u.username,
           ar.id as attendance_record_id,
           ar.status as current_status,
           ar.detection_confidence,
           ar.match_status,
           ar.updated_at as attendance_updated_at
    FROM student_profiles sp
    LEFT JOIN users u ON sp.user_id = u.id
    LEFT JOIN attendance_records ar ON ar.student_id = sp.id AND ar.lecture_session_id = ?
    WHERE sp.class_id = ? AND sp.section_id = ? AND sp.batch_id = ?
    ORDER BY sp.name ASC
  `, [lectureSessionId, lecture.class_id, lecture.section_id, lecture.batch_id]);

  return res.json({
    lecture,
    isFinalized: lecture.finalization_status === 'COMPLETED',
    students: students.map((s: any) => ({
      ...s,
      status: s.current_status || 'PRESENT', // default to PRESENT for fast marking
      match_status: s.match_status || 'MANUAL',
      detection_confidence: s.detection_confidence !== null ? Number(s.detection_confidence) : 1.0
    }))
  });
});

// 2. Save Manual Attendance (Draft / Live before Finalization)
attendanceRouter.post('/save-draft', authenticate, requireRoles('FLOOR_ATTENDER', 'TEACHER', 'HOD', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const { lecture_session_id, records } = req.body; // records: Array<{ student_id: string, status: string, match_status?: string, confidence?: number }>

  if (!lecture_session_id || !Array.isArray(records)) {
    return res.status(400).json({ error: 'lecture_session_id and records array are required.' });
  }

  // Check if finalized
  const lecture = await queryOne(`SELECT finalization_status FROM lecture_sessions WHERE id = ?`, [lecture_session_id]);
  if (!lecture) {
    return res.status(404).json({ error: 'Lecture session not found.' });
  }
  if (lecture.finalization_status === 'COMPLETED' && req.user!.role !== 'ADMIN' && req.user!.role !== 'PRINCIPAL') {
    return res.status(400).json({ error: 'Attendance has already been finalized and locked.' });
  }

  await transaction(async (client) => {
    for (const r of records) {
      const id = 'att-' + crypto.randomUUID();
      await client.query(`
        INSERT INTO attendance_records (id, lecture_session_id, student_id, status, detection_confidence, match_status, marked_by, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT(lecture_session_id, student_id) DO UPDATE SET
          status = EXCLUDED.status,
          detection_confidence = EXCLUDED.detection_confidence,
          match_status = EXCLUDED.match_status,
          marked_by = EXCLUDED.marked_by,
          updated_at = CURRENT_TIMESTAMP
      `, [id, lecture_session_id, r.student_id, r.status, r.confidence || null, r.match_status || 'MANUAL', req.user!.id]);
    }
  });

  logAudit(req, 'ATTENDANCE_DRAFT_SAVED', 'attendance_records', lecture_session_id, {
    count: records.length,
    presentCount: records.filter((r: any) => r.status === 'PRESENT').length
  });

  return res.json({ success: true, message: 'Attendance draft saved successfully.' });
});

// 3. Photo-Assisted Attendance Suggestions (Local CV Processing)
attendanceRouter.post('/photo-suggestions', authenticate, requireRoles('FLOOR_ATTENDER', 'TEACHER', 'HOD', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const { lecture_session_id, photo_url } = req.body;

  if (!lecture_session_id) {
    return res.status(400).json({ error: 'lecture_session_id is required.' });
  }

  try {
    const analysis = await faceDetectionService.processClassroomPhoto(lecture_session_id, photo_url || '');

    // Record photo reference in attendance_photos
    const photoId = 'att-photo-' + crypto.randomUUID();
    await execute(`
      INSERT INTO attendance_photos (id, lecture_session_id, photo_url, detections_json)
      VALUES (?, ?, ?, ?)
    `, [photoId, lecture_session_id, photo_url || '/uploads/classroom_photos/default.jpg', JSON.stringify(analysis)]);

    // Update classroom_photo_url on the lecture session
    if (photo_url) {
      await execute(`UPDATE lecture_sessions SET classroom_photo_url = ? WHERE id = ?`, [photo_url, lecture_session_id]);
    }

    return res.json({
      success: true,
      message: 'Photo processed through local face detection model. Human verification required before finalization.',
      analysis
    });
  } catch (err: any) {
    console.error('Face detection processing failed:', err);
    return res.status(500).json({ error: 'Local CV model processing failed: ' + err.message });
  }
});

// 4. Finalize Attendance (Locks changes, marks session completed, logs audit)
attendanceRouter.post('/finalize', authenticate, requireRoles('FLOOR_ATTENDER', 'TEACHER', 'HOD', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const { lecture_session_id, records, remarks } = req.body;

  if (!lecture_session_id) {
    return res.status(400).json({ error: 'lecture_session_id is required.' });
  }

  // Save records if provided
  if (Array.isArray(records) && records.length > 0) {
    await transaction(async (client) => {
      for (const r of records) {
        const id = 'att-' + crypto.randomUUID();
        await client.query(`
          INSERT INTO attendance_records (id, lecture_session_id, student_id, status, detection_confidence, match_status, marked_by, verified_by, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
          ON CONFLICT(lecture_session_id, student_id) DO UPDATE SET
            status = EXCLUDED.status,
            detection_confidence = EXCLUDED.detection_confidence,
            match_status = EXCLUDED.match_status,
            verified_by = EXCLUDED.verified_by,
            updated_at = CURRENT_TIMESTAMP
        `, [id, lecture_session_id, r.student_id, r.status, r.confidence || null, r.match_status || 'MANUAL', req.user!.id, req.user!.id]);
      }
    });
  }

  // Update lecture session final status
  await execute(`
    UPDATE lecture_sessions 
    SET finalization_status = 'COMPLETED',
        remarks = COALESCE(?, remarks)
    WHERE id = ?
  `, [remarks || null, lecture_session_id]);

  // Compute final counts
  const counts = await queryOne(`
    SELECT 
      COUNT(*) as total,
      COALESCE(SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END), 0) as present,
      COALESCE(SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END), 0) as absent,
      COALESCE(SUM(CASE WHEN status = 'LATE' THEN 1 ELSE 0 END), 0) as late
    FROM attendance_records
    WHERE lecture_session_id = ?
  `, [lecture_session_id]);

  logAudit(req, 'ATTENDANCE_FINALIZED', 'lecture_sessions', lecture_session_id, {
    total: counts?.total,
    present: counts?.present,
    absent: counts?.absent,
    late: counts?.late,
    finalized_by: req.user!.name
  });

  return res.json({
    success: true,
    message: 'Attendance successfully finalized and locked.',
    counts
  });
});


// 5. A student's own attendance calendar for one month — one row per date
//    they had at least one scheduled lecture, with present/absent/late
//    counts and a percentage, so the Student Portal can render a calendar.
// Self-service: a STUDENT can only ever see their own (student_id param is
// ignored for them); staff roles may pass ?student_id= to view someone else's.
attendanceRouter.get('/student/:studentId/calendar', authenticate, async (req: AuthRequest, res: Response) => {
  const requestedId = req.params.studentId;
  const studentId = req.user!.role === 'STUDENT' ? req.user!.student_id : requestedId;
  if (req.user!.role === 'STUDENT' && req.user!.student_id !== requestedId) {
    return res.status(403).json({ error: 'Access denied: you can only view your own attendance.' });
  }
  if (!studentId) {
    return res.status(400).json({ error: 'student_id could not be resolved.' });
  }

  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7); // YYYY-MM

  const rows = await query(`
    SELECT ls.date,
           COUNT(*) as total,
           COALESCE(SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END), 0) as present,
           COALESCE(SUM(CASE WHEN ar.status = 'ABSENT' THEN 1 ELSE 0 END), 0) as absent,
           COALESCE(SUM(CASE WHEN ar.status = 'LATE' THEN 1 ELSE 0 END), 0) as late,
           COALESCE(SUM(CASE WHEN ar.status IN ('EXCUSED', 'MEDICAL', 'ON_LEAVE') THEN 1 ELSE 0 END), 0) as excused
    FROM attendance_records ar
    JOIN lecture_sessions ls ON ar.lecture_session_id = ls.id
    WHERE ar.student_id = ? AND ls.date LIKE ?
    GROUP BY ls.date
    ORDER BY ls.date ASC
  `, [studentId, `${month}%`]);

  const overall = await queryOne<any>(`
    SELECT COUNT(*) as total,
           COALESCE(SUM(CASE WHEN ar.status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END), 0) as attended
    FROM attendance_records ar
    WHERE ar.student_id = ?
  `, [studentId]);

  const overallPercentage = overall && Number(overall.total) > 0
    ? Math.round((Number(overall.attended) / Number(overall.total)) * 1000) / 10
    : 0;

  const days = rows.map((r: any) => {
    const total = Number(r.total);
    const attended = Number(r.present) + Number(r.late);
    return {
      date: r.date,
      total,
      present: Number(r.present),
      absent: Number(r.absent),
      late: Number(r.late),
      excused: Number(r.excused),
      percentage: total > 0 ? Math.round((attended / total) * 1000) / 10 : 0,
      // Day-level status: ABSENT only if every period that day was ABSENT.
      status: Number(r.absent) === total ? 'ABSENT' : attended === total ? 'PRESENT' : 'PARTIAL'
    };
  });

  return res.json({
    month,
    days,
    overallPercentage,
    overallTotal: Number(overall?.total || 0),
    overallAttended: Number(overall?.attended || 0)
  });
});

// 6. Period-wise breakdown for one date — what the calendar drills into when
//    a student clicks a day.
attendanceRouter.get('/student/:studentId/day', authenticate, async (req: AuthRequest, res: Response) => {
  const requestedId = req.params.studentId;
  const studentId = req.user!.role === 'STUDENT' ? req.user!.student_id : requestedId;
  if (req.user!.role === 'STUDENT' && req.user!.student_id !== requestedId) {
    return res.status(403).json({ error: 'Access denied: you can only view your own attendance.' });
  }
  const date = req.query.date as string;
  if (!date) {
    return res.status(400).json({ error: 'date is required (YYYY-MM-DD).' });
  }

  const periods = await query(`
    SELECT ls.id as lecture_session_id, ls.scheduled_start, ls.scheduled_end,
           te.period_number,
           s.name as subject_name,
           u.name as teacher_name,
           r.room_number,
           COALESCE(ar.status, 'NOT_MARKED') as status,
           ar.remarks as attendance_remarks
    FROM lecture_sessions ls
    JOIN subjects s ON ls.subject_id = s.id
    JOIN teacher_profiles tp ON ls.teacher_id = tp.id
    JOIN users u ON tp.user_id = u.id
    JOIN rooms r ON ls.room_id = r.id
    LEFT JOIN timetable_entries te ON ls.timetable_entry_id = te.id
    LEFT JOIN attendance_records ar ON ar.lecture_session_id = ls.id AND ar.student_id = ?
    WHERE ls.date = ? AND ls.class_id = (SELECT class_id FROM student_profiles WHERE id = ?)
      AND ls.section_id = (SELECT section_id FROM student_profiles WHERE id = ?)
      AND ls.batch_id = (SELECT batch_id FROM student_profiles WHERE id = ?)
    ORDER BY COALESCE(te.period_number, 0) ASC, ls.scheduled_start ASC
  `, [studentId, date, studentId, studentId, studentId]);

  return res.json({ date, periods });
});
