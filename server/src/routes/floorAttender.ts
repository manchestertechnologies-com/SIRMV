import { Router, Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export const floorAttenderRouter = Router();

// Configure storage for classroom photos
const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'classroom_photos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'classroom-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// 1. Floor Attender Operational Dashboard
floorAttenderRouter.get('/dashboard', authenticate, requireRoles('FLOOR_ATTENDER', 'ADMIN', 'PRINCIPAL', 'HOD'), (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;
  const floor = parseInt(req.query.floor as string, 10) || 2;
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

  const targetDate = new Date(date);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = dayNames[targetDate.getDay()] === 'Sunday' ? 'Monday' : dayNames[targetDate.getDay()];

  // Get all rooms on this floor
  const rooms = db.prepare(`
    SELECT * FROM rooms 
    WHERE branch_id = ? AND floor = ?
    ORDER BY room_number ASC
  `).all(branchId, floor) as any[];

  // Get timetable entries for these rooms on this day
  const roomIds = rooms.map((r) => r.id);
  const roomPlaceholders = roomIds.map(() => '?').join(',');

  let scheduledLectures: any[] = [];
  if (roomIds.length > 0) {
    scheduledLectures = db.prepare(`
      SELECT tt.*, s.name as subject_name, s.code as subject_code,
             c.name as class_name, sec.name as section_name, b.name as batch_name,
             r.room_number, r.floor,
             tp.employee_id, u.name as teacher_name, u.phone as teacher_phone
      FROM timetable_entries tt
      JOIN subjects s ON tt.subject_id = s.id
      JOIN classes c ON tt.class_id = c.id
      JOIN sections sec ON tt.section_id = sec.id
      JOIN batches b ON tt.batch_id = b.id
      JOIN rooms r ON tt.room_id = r.id
      JOIN teacher_profiles tp ON tt.teacher_id = tp.id
      JOIN users u ON tp.user_id = u.id
      WHERE tt.branch_id = ? AND tt.day_of_week = ? AND tt.room_id IN (${roomPlaceholders})
      ORDER BY tt.period_number ASC, r.room_number ASC
    `).all(branchId, dayOfWeek, ...roomIds) as any[];
  }

  // Combine with actual lecture sessions recorded today
  const lecturesWithStatus = scheduledLectures.map((entry) => {
    // Check if lecture session already initiated
    let session = db.prepare(`
      SELECT ls.*, u_sub.name as substitute_teacher_name,
             u_fa.name as floor_attender_name,
             lc.chapter, lc.concept, lc.topic_taught,
             (SELECT COUNT(*) FROM attendance_records WHERE lecture_session_id = ls.id) as total_students,
             (SELECT COUNT(*) FROM attendance_records WHERE lecture_session_id = ls.id AND status = 'PRESENT') as present_students,
             (SELECT COUNT(*) FROM attendance_records WHERE lecture_session_id = ls.id AND status = 'ABSENT') as absent_students,
             (SELECT COUNT(*) FROM attendance_records WHERE lecture_session_id = ls.id AND status = 'LATE') as late_students
      FROM lecture_sessions ls
      LEFT JOIN teacher_profiles tp_sub ON ls.substitute_teacher_id = tp_sub.id
      LEFT JOIN users u_sub ON tp_sub.user_id = u_sub.id
      LEFT JOIN users u_fa ON ls.floor_attender_id = u_fa.id
      LEFT JOIN lecture_concepts lc ON ls.id = lc.lecture_session_id
      WHERE ls.timetable_entry_id = ? AND ls.date = ?
    `).get(entry.id, date) as any;

    // Check if teacher is marked absent
    const absence = db.prepare(`SELECT * FROM teacher_absences WHERE teacher_id = ? AND date = ? AND status = 'RECORDED'`).get(entry.teacher_id, date);
    
    // Check substitution assignment
    const subAssignment = db.prepare(`
      SELECT sa.*, u.name as substitute_name 
      FROM substitution_assignments sa
      JOIN teacher_profiles tp ON sa.substitute_teacher_id = tp.id
      JOIN users u ON tp.user_id = u.id
      WHERE sa.timetable_entry_id = ? AND sa.date = ?
    `).get(entry.id, date) as any;

    let computedTeacherStatus = 'PENDING';
    if (session) {
      computedTeacherStatus = session.teacher_status;
    } else if (absence) {
      computedTeacherStatus = 'ABSENT';
    }

    return {
      timetableEntry: entry,
      session: session || null,
      isAbsent: !!absence,
      substituteAssignment: subAssignment || null,
      computedTeacherStatus
    };
  });

  // Calculate high-level floor statistics
  const totalClasses = scheduledLectures.length;
  const classesStarted = lecturesWithStatus.filter((l) => l.session && l.session.teacher_time_in).length;
  const classesCompleted = lecturesWithStatus.filter((l) => l.session && l.session.finalization_status === 'COMPLETED').length;
  const attendancePending = lecturesWithStatus.filter((l) => !l.session || l.session.finalization_status === 'PENDING').length;
  const teachersAbsent = lecturesWithStatus.filter((l) => l.isAbsent).length;

  return res.json({
    floor,
    date,
    dayOfWeek,
    rooms,
    stats: {
      totalClasses,
      classesStarted,
      classesCompleted,
      attendancePending,
      teachersAbsent
    },
    lectures: lecturesWithStatus
  });
});

// 2. Initialize or Update Lecture Session (Time In, Time Out, Concept, Status)
floorAttenderRouter.post('/lecture-session', authenticate, requireRoles('FLOOR_ATTENDER', 'TEACHER', 'HOD', 'ADMIN'), (req: AuthRequest, res: Response) => {
  const {
    id: existingId,
    timetable_entry_id,
    date,
    academic_year = '2026-27',
    class_id,
    section_id,
    batch_id,
    subject_id,
    teacher_id,
    substitute_teacher_id,
    room_id,
    floor,
    scheduled_start,
    scheduled_end,
    teacher_time_in,
    lecture_start_time,
    lecture_end_time,
    teacher_time_out,
    teacher_status = 'PRESENT',
    classroom_photo_url,
    recording_url,
    remarks,
    finalization_status = 'PENDING',
    chapter,
    concept,
    topic_taught
  } = req.body;

  let sessionId = existingId;
  const branchId = req.user!.branch_id;
  const floorAttenderId = req.user!.id;

  if (sessionId) {
    // Update existing lecture session
    db.prepare(`
      UPDATE lecture_sessions SET
        teacher_time_in = COALESCE(?, teacher_time_in),
        lecture_start_time = COALESCE(?, lecture_start_time),
        lecture_end_time = COALESCE(?, lecture_end_time),
        teacher_time_out = COALESCE(?, teacher_time_out),
        teacher_status = COALESCE(?, teacher_status),
        substitute_teacher_id = COALESCE(?, substitute_teacher_id),
        classroom_photo_url = COALESCE(?, classroom_photo_url),
        recording_url = COALESCE(?, recording_url),
        floor_attender_id = COALESCE(?, floor_attender_id),
        remarks = COALESCE(?, remarks),
        finalization_status = COALESCE(?, finalization_status)
      WHERE id = ?
    `).run(
      teacher_time_in, lecture_start_time, lecture_end_time, teacher_time_out,
      teacher_status, substitute_teacher_id, classroom_photo_url, recording_url,
      floorAttenderId, remarks, finalization_status, sessionId
    );
  } else {
    // Create new lecture session
    sessionId = 'lec-' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO lecture_sessions (
        id, branch_id, timetable_entry_id, date, academic_year, class_id, section_id, batch_id,
        subject_id, teacher_id, substitute_teacher_id, room_id, floor, scheduled_start, scheduled_end,
        teacher_time_in, lecture_start_time, lecture_end_time, teacher_time_out, teacher_status,
        classroom_photo_url, recording_url, floor_attender_id, remarks, finalization_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sessionId, branchId, timetable_entry_id, date, academic_year, class_id, section_id, batch_id,
      subject_id, teacher_id, substitute_teacher_id || null, room_id, floor, scheduled_start, scheduled_end,
      teacher_time_in, lecture_start_time, lecture_end_time, teacher_time_out, teacher_status,
      classroom_photo_url, recording_url, floorAttenderId, remarks, finalization_status
    );
  }

  // Update Concept Taught if provided
  if (chapter || concept || topic_taught) {
    db.prepare(`
      INSERT INTO lecture_concepts (id, lecture_session_id, chapter, concept, topic_taught)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(lecture_session_id) DO UPDATE SET
        chapter = excluded.chapter,
        concept = excluded.concept,
        topic_taught = excluded.topic_taught,
        updated_at = CURRENT_TIMESTAMP
    `).run('lc-' + crypto.randomUUID(), sessionId, chapter || '', concept || '', topic_taught || '');
  }

  logAudit(req, 'LECTURE_SESSION_UPDATED', 'lecture_sessions', sessionId, {
    teacher_time_in,
    lecture_start_time,
    teacher_status,
    finalization_status
  });

  return res.json({
    success: true,
    message: 'Lecture session recorded successfully.',
    sessionId
  });
});

// 3. Upload Classroom Photo
floorAttenderRouter.post('/upload-photo', authenticate, upload.single('photo'), (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No photo uploaded.' });
  }

  const photoUrl = `/uploads/classroom_photos/${req.file.filename}`;
  return res.json({ success: true, photoUrl });
});
