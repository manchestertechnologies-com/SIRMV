import { Router, Response } from 'express';
import { query, queryOne } from '../database/pgDb';
import { authenticate, AuthRequest } from '../middleware/auth';

export const lecturesRouter = Router();

// 1. One-Page Consolidated Lecture Record (for Admin, Principal, HOD, Teacher, Floor Attender)
lecturesRouter.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const lecture = await queryOne(`
    SELECT ls.*,
           c.name as class_name, sec.name as section_name, b.name as batch_name,
           s.name as subject_name, s.code as subject_code,
           r.room_number, r.floor as room_floor,
           u_orig.name as original_teacher_name, tp_orig.employee_id as original_teacher_empid,
           u_sub.name as substitute_teacher_name, tp_sub.employee_id as substitute_teacher_empid,
           u_fa.name as floor_attender_name, u_fa.phone as floor_attender_phone,
           br.name as branch_name, br.code as branch_code, br.city as branch_city, br.principal_name
    FROM lecture_sessions ls
    JOIN branches br ON ls.branch_id = br.id
    JOIN classes c ON ls.class_id = c.id
    JOIN sections sec ON ls.section_id = sec.id
    JOIN batches b ON ls.batch_id = b.id
    JOIN subjects s ON ls.subject_id = s.id
    JOIN rooms r ON ls.room_id = r.id
    JOIN teacher_profiles tp_orig ON ls.teacher_id = tp_orig.id
    JOIN users u_orig ON tp_orig.user_id = u_orig.id
    LEFT JOIN teacher_profiles tp_sub ON ls.substitute_teacher_id = tp_sub.id
    LEFT JOIN users u_sub ON tp_sub.user_id = u_sub.id
    LEFT JOIN users u_fa ON ls.floor_attender_id = u_fa.id
    WHERE ls.id = ?
  `, [id]);

  if (!lecture) {
    return res.status(404).json({ error: 'Lecture session record not found.' });
  }

  // Fetch Concept Taught
  const concept = await queryOne(`
    SELECT * FROM lecture_concepts WHERE lecture_session_id = ?
  `, [id]);

  // Fetch Student Attendance Breakdown
  const attendanceRecords = await query(`
    SELECT ar.*, sp.name as student_name, sp.register_number, sp.photo_url as student_photo,
           sp.is_hostelite
    FROM attendance_records ar
    JOIN student_profiles sp ON ar.student_id = sp.id
    WHERE ar.lecture_session_id = ?
    ORDER BY sp.name ASC
  `, [id]);

  // Attendance summary metrics
  const total = attendanceRecords.length;
  const present = attendanceRecords.filter((a: any) => a.status === 'PRESENT').length;
  const absent = attendanceRecords.filter((a: any) => a.status === 'ABSENT').length;
  const late = attendanceRecords.filter((a: any) => a.status === 'LATE').length;
  const excused = attendanceRecords.filter((a: any) => a.status === 'EXCUSED').length;
  const medical = attendanceRecords.filter((a: any) => a.status === 'MEDICAL').length;
  const onLeave = attendanceRecords.filter((a: any) => a.status === 'ON_LEAVE').length;

  return res.json({
    lecture,
    concept: concept || { chapter: 'Not Specified', concept: 'Not Specified', topic_taught: 'Not Specified' },
    attendanceSummary: {
      total,
      present,
      absent,
      late,
      excused,
      medical,
      onLeave,
      attendancePercentage: total > 0 ? ((present + late) / total * 100).toFixed(1) : 0
    },
    attendanceRecords,
    hasRecording: !!(lecture.recording_url && lecture.recording_url.trim().length > 0)
  });
});

// 2. Absent Student Portal -> Missed Classes & Class Recording View
lecturesRouter.get('/student/missed-classes', authenticate, async (req: AuthRequest, res: Response) => {
  const studentId = req.user!.student_id;
  const targetStudentId = (req.query.student_id as string) || studentId;

  if (!targetStudentId) {
    return res.status(400).json({ error: 'Student ID required.' });
  }

  // Student and parent permission check
  if (req.user!.role === 'STUDENT' && req.user!.student_id !== targetStudentId) {
    return res.status(403).json({ error: 'Access denied. You can only view your own missed classes.' });
  }

  const missedClasses = await query(`
    SELECT ar.status as attendance_status, ar.updated_at as marked_time,
           ls.id as lecture_session_id, ls.date, ls.scheduled_start, ls.scheduled_end,
           ls.recording_url,
           s.name as subject_name, s.code as subject_code,
           c.name as class_name, sec.name as section_name, b.name as batch_name,
           r.room_number,
           u_t.name as teacher_name,
           lc.chapter, lc.concept, lc.topic_taught
    FROM attendance_records ar
    JOIN lecture_sessions ls ON ar.lecture_session_id = ls.id
    JOIN subjects s ON ls.subject_id = s.id
    JOIN classes c ON ls.class_id = c.id
    JOIN sections sec ON ls.section_id = sec.id
    JOIN batches b ON ls.batch_id = b.id
    JOIN rooms r ON ls.room_id = r.id
    JOIN teacher_profiles tp ON ls.teacher_id = tp.id
    JOIN users u_t ON tp.user_id = u_t.id
    LEFT JOIN lecture_concepts lc ON ls.id = lc.lecture_session_id
    WHERE ar.student_id = ? AND ar.status IN ('ABSENT', 'MEDICAL', 'ON_LEAVE')
    ORDER BY ls.date DESC, ls.scheduled_start DESC
  `, [targetStudentId]);

  return res.json({
    missedClasses: missedClasses.map((mc: any) => ({
      ...mc,
      hasRecording: !!(mc.recording_url && mc.recording_url.trim().length > 0)
    }))
  });
});

// 3. Search and filter all lectures across branch
lecturesRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;
  const date = req.query.date as string;
  const teacherId = req.query.teacher_id as string;
  const subjectId = req.query.subject_id as string;
  const classId = req.query.class_id as string;
  const sectionId = req.query.section_id as string;
  const batchId = req.query.batch_id as string;
  const roomId = req.query.room_id as string;

  let sql = `
    SELECT ls.*,
           c.name as class_name, sec.name as section_name, b.name as batch_name,
           s.name as subject_name, s.code as subject_code,
           r.room_number, r.floor as room_floor,
           u_orig.name as original_teacher_name,
           u_sub.name as substitute_teacher_name,
           lc.chapter, lc.concept
    FROM lecture_sessions ls
    JOIN classes c ON ls.class_id = c.id
    JOIN sections sec ON ls.section_id = sec.id
    JOIN batches b ON ls.batch_id = b.id
    JOIN subjects s ON ls.subject_id = s.id
    JOIN rooms r ON ls.room_id = r.id
    JOIN teacher_profiles tp_orig ON ls.teacher_id = tp_orig.id
    JOIN users u_orig ON tp_orig.user_id = u_orig.id
    LEFT JOIN teacher_profiles tp_sub ON ls.substitute_teacher_id = tp_sub.id
    LEFT JOIN users u_sub ON tp_sub.user_id = u_sub.id
    LEFT JOIN lecture_concepts lc ON ls.id = lc.lecture_session_id
    WHERE ls.branch_id = ?
  `;
  const params: any[] = [branchId];

  if (date) { sql += ` AND ls.date = ?`; params.push(date); }
  if (teacherId) { sql += ` AND (ls.teacher_id = ? OR ls.substitute_teacher_id = ?)`; params.push(teacherId, teacherId); }
  if (subjectId) { sql += ` AND ls.subject_id = ?`; params.push(subjectId); }
  if (classId) { sql += ` AND ls.class_id = ?`; params.push(classId); }
  if (sectionId) { sql += ` AND ls.section_id = ?`; params.push(sectionId); }
  if (batchId) { sql += ` AND ls.batch_id = ?`; params.push(batchId); }
  if (roomId) { sql += ` AND ls.room_id = ?`; params.push(roomId); }

  sql += ` ORDER BY ls.date DESC, ls.scheduled_start DESC LIMIT 100`;

  const lectures = await query(sql, params);
  return res.json({ lectures });
});

