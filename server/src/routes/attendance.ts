import { Router, Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { faceDetectionService } from '../services/faceDetectionService';
import crypto from 'crypto';

export const attendanceRouter = Router();

// 1. Get Students for Attendance Sheet (with existing marks if recorded)
attendanceRouter.get('/lecture/:lectureSessionId', authenticate, (req: AuthRequest, res: Response) => {
  const { lectureSessionId } = req.params;

  const lecture = db.prepare(`
    SELECT ls.*, c.name as class_name, sec.name as section_name, b.name as batch_name, s.name as subject_name
    FROM lecture_sessions ls
    JOIN classes c ON ls.class_id = c.id
    JOIN sections sec ON ls.section_id = sec.id
    JOIN batches b ON ls.batch_id = b.id
    JOIN subjects s ON ls.subject_id = s.id
    WHERE ls.id = ?
  `).get(lectureSessionId) as any;

  if (!lecture) {
    return res.status(404).json({ error: 'Lecture session not found.' });
  }

  // Get all enrolled students for this class/section/batch
  const students = db.prepare(`
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
  `).all(lectureSessionId, lecture.class_id, lecture.section_id, lecture.batch_id) as any[];

  return res.json({
    lecture,
    isFinalized: lecture.finalization_status === 'COMPLETED',
    students: students.map((s) => ({
      ...s,
      status: s.current_status || 'PRESENT', // default to PRESENT for fast marking
      match_status: s.match_status || 'MANUAL',
      detection_confidence: s.detection_confidence !== null ? s.detection_confidence : 1.0
    }))
  });
});

// 2. Save Manual Attendance (Draft / Live before Finalization)
attendanceRouter.post('/save-draft', authenticate, requireRoles('FLOOR_ATTENDER', 'TEACHER', 'HOD', 'ADMIN'), (req: AuthRequest, res: Response) => {
  const { lecture_session_id, records } = req.body; // records: Array<{ student_id: string, status: string, match_status?: string, confidence?: number }>

  if (!lecture_session_id || !Array.isArray(records)) {
    return res.status(400).json({ error: 'lecture_session_id and records array are required.' });
  }

  // Check if finalized
  const lecture = db.prepare(`SELECT finalization_status FROM lecture_sessions WHERE id = ?`).get(lecture_session_id) as any;
  if (!lecture) {
    return res.status(404).json({ error: 'Lecture session not found.' });
  }
  if (lecture.finalization_status === 'COMPLETED' && req.user!.role !== 'ADMIN' && req.user!.role !== 'PRINCIPAL') {
    return res.status(400).json({ error: 'Attendance has already been finalized and locked.' });
  }

  const upsertStmt = db.prepare(`
    INSERT INTO attendance_records (id, lecture_session_id, student_id, status, detection_confidence, match_status, marked_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(lecture_session_id, student_id) DO UPDATE SET
      status = excluded.status,
      detection_confidence = excluded.detection_confidence,
      match_status = excluded.match_status,
      marked_by = excluded.marked_by,
      updated_at = CURRENT_TIMESTAMP
  `);

  const saveTransaction = db.transaction((rows: any[]) => {
    for (const r of rows) {
      const id = 'att-' + crypto.randomUUID();
      upsertStmt.run(
        id, lecture_session_id, r.student_id, r.status,
        r.confidence || null, r.match_status || 'MANUAL', req.user!.id
      );
    }
  });

  saveTransaction(records);

  logAudit(req, 'ATTENDANCE_DRAFT_SAVED', 'attendance_records', lecture_session_id, {
    count: records.length,
    presentCount: records.filter((r) => r.status === 'PRESENT').length
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
    db.prepare(`
      INSERT INTO attendance_photos (id, lecture_session_id, photo_url, detections_json)
      VALUES (?, ?, ?, ?)
    `).run(photoId, lecture_session_id, photo_url || '/uploads/classroom_photos/default.jpg', JSON.stringify(analysis));

    // Update classroom_photo_url on the lecture session
    if (photo_url) {
      db.prepare(`UPDATE lecture_sessions SET classroom_photo_url = ? WHERE id = ?`).run(photo_url, lecture_session_id);
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
attendanceRouter.post('/finalize', authenticate, requireRoles('FLOOR_ATTENDER', 'TEACHER', 'HOD', 'ADMIN'), (req: AuthRequest, res: Response) => {
  const { lecture_session_id, records, remarks } = req.body;

  if (!lecture_session_id) {
    return res.status(400).json({ error: 'lecture_session_id is required.' });
  }

  // Save records if provided
  if (Array.isArray(records) && records.length > 0) {
    const upsertStmt = db.prepare(`
      INSERT INTO attendance_records (id, lecture_session_id, student_id, status, detection_confidence, match_status, marked_by, verified_by, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(lecture_session_id, student_id) DO UPDATE SET
        status = excluded.status,
        detection_confidence = excluded.detection_confidence,
        match_status = excluded.match_status,
        verified_by = excluded.verified_by,
        updated_at = CURRENT_TIMESTAMP
    `);

    const finalizeTx = db.transaction((rows: any[]) => {
      for (const r of rows) {
        const id = 'att-' + crypto.randomUUID();
        upsertStmt.run(
          id, lecture_session_id, r.student_id, r.status,
          r.confidence || null, r.match_status || 'MANUAL', req.user!.id, req.user!.id
        );
      }
    });

    finalizeTx(records);
  }

  // Update lecture session final status
  db.prepare(`
    UPDATE lecture_sessions 
    SET finalization_status = 'COMPLETED',
        remarks = COALESCE(?, remarks)
    WHERE id = ?
  `).run(remarks || null, lecture_session_id);

  // Compute final counts
  const counts = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) as absent,
      SUM(CASE WHEN status = 'LATE' THEN 1 ELSE 0 END) as late
    FROM attendance_records
    WHERE lecture_session_id = ?
  `).get(lecture_session_id) as any;

  logAudit(req, 'ATTENDANCE_FINALIZED', 'lecture_sessions', lecture_session_id, {
    total: counts.total,
    present: counts.present,
    absent: counts.absent,
    late: counts.late,
    finalized_by: req.user!.name
  });

  return res.json({
    success: true,
    message: 'Attendance successfully finalized and locked.',
    counts
  });
});
