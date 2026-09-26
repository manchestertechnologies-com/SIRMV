import { Router, Response } from 'express';
import { query, queryOne, execute, transaction } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { createNotification } from './notifications';
import { sendPushToUser } from '../services/pushService';
import crypto from 'crypto';
import {
  RoomInfo,
  BatchInfo,
  selectRoomsAutomatic,
  generateRoomSeatSlots,
  assignSeatsInRoom,
  summarizeAllocation,
  roomCapacity,
  selectInvigilatorsAutomatic,
  timeRangesOverlap,
  TeacherAvailability
} from '../services/examAllocationEngine';

export const examManagementRouter = Router();

// Exam Department, plus Admin/Principal who retain access to everything.
const EXAM_ROLES = ['ADMIN', 'PRINCIPAL', 'EXAM_DEPARTMENT'] as const;

// ---------------------------------------------------------------------------
// Rooms + bench configuration
// ---------------------------------------------------------------------------

// List branch rooms with their exam bench/seat configuration (defaults if unset).
examManagementRouter.get('/rooms', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    const rooms = await query(
      `SELECT r.id as room_id, r.room_number, r.floor, r.building,
              COALESCE(c.benches, 15) as benches,
              COALESCE(c.seats_per_bench, 2) as seats_per_bench,
              COALESCE(c.is_available_for_exams, 1) as is_available_for_exams,
              c.assigned_class_id, c.assigned_section_id,
              ac.name as assigned_class_name, asec.name as assigned_section_name
       FROM rooms r
       LEFT JOIN exam_room_configs c ON c.room_id = r.id
       LEFT JOIN classes ac ON ac.id = c.assigned_class_id
       LEFT JOIN sections asec ON asec.id = c.assigned_section_id
       WHERE r.branch_id = $1
       ORDER BY r.floor ASC, r.room_number ASC`,
      [branchId]
    );

    // Auto-detect: a room already assigned to a section as its regular
    // classroom (set on the Classes page, sections.room_id) — this is the
    // most reliable source, since it's ground truth the college already
    // maintains, not a guess. Used whenever a room hasn't been explicitly
    // (re-)assigned on this Room Configuration screen.
    const autoRooms = await query<any>(
      `SELECT sec.room_id, sec.class_id, sec.id as section_id, c.name as class_name, sec.name as section_name
       FROM sections sec
       JOIN classes c ON c.id = sec.class_id
       WHERE sec.room_id IS NOT NULL AND c.branch_id = $1`,
      [branchId]
    );
    const autoRoomByRoomId = new Map(autoRooms.map((a: any) => [a.room_id, a]));

    // Fallback: the class/section that regularly occupies each room, per the
    // normal teaching timetable (its "home" class) — used only when neither
    // of the above two sources has an answer for this room.
    const homeRooms = await query<any>(
      `SELECT room_id, class_id, section_id, class_name, section_name FROM (
         SELECT te.room_id, te.class_id, te.section_id, c.name as class_name, sec.name as section_name,
                ROW_NUMBER() OVER (PARTITION BY te.room_id ORDER BY COUNT(*) DESC) as rn
         FROM timetable_entries te
         JOIN classes c ON c.id = te.class_id
         JOIN sections sec ON sec.id = te.section_id
         WHERE te.branch_id = $1
         GROUP BY te.room_id, te.class_id, te.section_id, c.name, sec.name
       ) ranked WHERE rn = 1`,
      [branchId]
    );
    const homeRoomByRoomId = new Map(homeRooms.map((h: any) => [h.room_id, h]));

    const withCapacity = rooms.map((r: any) => {
      // An explicit assignment (manually set on this screen) always wins;
      // otherwise fall back to the auto-detected section room, then to the
      // timetable-derived guess as a last resort.
      const auto = autoRoomByRoomId.get(r.room_id);
      const home = homeRoomByRoomId.get(r.room_id);
      const classId = r.assigned_class_id || auto?.class_id || home?.class_id || null;
      const sectionId = r.assigned_section_id || auto?.section_id || home?.section_id || null;
      const className = r.assigned_class_id ? r.assigned_class_name : (auto?.class_name || home?.class_name);
      const sectionName = r.assigned_section_id ? r.assigned_section_name : (auto?.section_name || home?.section_name);
      return {
        ...r,
        benches: Number(r.benches),
        seats_per_bench: Number(r.seats_per_bench),
        is_available_for_exams: !!Number(r.is_available_for_exams),
        total_capacity: Number(r.benches) * Number(r.seats_per_bench),
        // The effective class/section (manual assignment, or else the
        // auto-detected one) — this is what the Class/Section dropdowns bind
        // to, so an auto-detected room shows correctly pre-selected even
        // before its first save round-trips through the database.
        assigned_class_id: classId,
        assigned_section_id: sectionId,
        home_class_id: classId,
        home_section_id: sectionId,
        home_class_label: className && sectionName ? `${className} - ${sectionName}` : null,
        is_assigned: !!r.assigned_class_id,
        is_auto_detected: !r.assigned_class_id && !!auto
      };
    });

    // Store the auto-detected assignment on the room's exam config, so it
    // shows up (and can be overridden) in the Class/Section dropdowns
    // instead of only being computed on the fly, and so automatic exam-room
    // allocation (which reads assigned_class_id directly) picks it up too.
    // Never overwrites an existing explicit assignment.
    for (const r of withCapacity) {
      if (r.is_auto_detected) {
        const auto = autoRoomByRoomId.get(r.room_id);
        await execute(
          `INSERT INTO exam_room_configs (room_id, assigned_class_id, assigned_section_id, updated_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
           ON CONFLICT (room_id) DO UPDATE SET
             assigned_class_id = COALESCE(exam_room_configs.assigned_class_id, $2),
             assigned_section_id = COALESCE(exam_room_configs.assigned_section_id, $3),
             updated_at = CURRENT_TIMESTAMP
           WHERE exam_room_configs.assigned_class_id IS NULL`,
          [r.room_id, auto.class_id, auto.section_id]
        ).catch((err) => console.error('Auto-store exam room assignment failed:', err.message));
      }
    }

    return res.json({ rooms: withCapacity });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Add a brand-new physical room (there was previously no way to create one
// at all — only to configure benches/seats on rooms already seeded). Room
// number + floor + building place it; it then appears positioned on the
// 3D building view for that floor immediately, same as any other room.
examManagementRouter.post('/rooms', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { branch_id, room_number, floor, building, benches, seats_per_bench, is_available_for_exams } = req.body;
    if (!room_number || `${room_number}`.trim() === '') {
      return res.status(400).json({ error: 'room_number is required.' });
    }
    if (floor === undefined || floor === null || Number.isNaN(Number(floor))) {
      return res.status(400).json({ error: 'floor is required and must be a number (use 0 for the ground floor).' });
    }
    const branchId = branch_id || req.user!.branch_id;

    const existing = await queryOne(
      `SELECT id FROM rooms WHERE branch_id = $1 AND floor = $2 AND LOWER(room_number) = LOWER($3)`,
      [branchId, Number(floor), `${room_number}`.trim()]
    );
    if (existing) {
      return res.status(409).json({ error: `Room ${room_number} already exists on that floor.` });
    }

    const benchesN = Number.isInteger(benches) && benches > 0 ? benches : 15;
    const seatsPerBenchN = Number.isInteger(seats_per_bench) && seats_per_bench > 0 ? seats_per_bench : 2;
    const roomId = 'room-' + crypto.randomUUID();

    await transaction(async (client) => {
      await client.query(
        `INSERT INTO rooms (id, branch_id, room_number, floor, building, capacity) VALUES ($1,$2,$3,$4,$5,$6)`,
        [roomId, branchId, `${room_number}`.trim(), Number(floor), building && `${building}`.trim() ? `${building}`.trim() : 'Main Academic Block', benchesN * seatsPerBenchN]
      );
      await client.query(
        `INSERT INTO exam_room_configs (room_id, benches, seats_per_bench, is_available_for_exams)
         VALUES ($1,$2,$3,$4)`,
        [roomId, benchesN, seatsPerBenchN, is_available_for_exams === false ? 0 : 1]
      );
    });

    await logAudit(req, 'EXAM_ROOM_CREATED', 'rooms', roomId, { room_number, floor, building, benches: benchesN, seats_per_bench: seatsPerBenchN });
    return res.status(201).json({ success: true, room_id: roomId, message: `Room ${room_number} added to floor ${floor}.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Configure a room's benches / seats-per-bench / exam availability.
examManagementRouter.put('/rooms/:roomId/config', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const { benches, seats_per_bench, is_available_for_exams } = req.body;

    const room = await queryOne(`SELECT id FROM rooms WHERE id = $1`, [roomId]);
    if (!room) return res.status(404).json({ error: 'Room not found.' });

    if (benches !== undefined && (!Number.isInteger(benches) || benches <= 0)) {
      return res.status(400).json({ error: 'benches must be a positive integer.' });
    }
    if (seats_per_bench !== undefined && (!Number.isInteger(seats_per_bench) || seats_per_bench <= 0)) {
      return res.status(400).json({ error: 'seats_per_bench must be a positive integer.' });
    }

    // The class/section a room is explicitly assigned to (so the exam 3D
    // view can show it and auto-allocation can prioritize it, even before
    // any teaching timetable exists for that section). Both fields are
    // optional and only touched when the caller actually sends them —
    // sending an empty string clears the assignment, omitting the field
    // leaves whatever was set before untouched.
    const hasClassField = Object.prototype.hasOwnProperty.call(req.body, 'assigned_class_id');
    const hasSectionField = Object.prototype.hasOwnProperty.call(req.body, 'assigned_section_id');
    const assignedClassId: string | null = hasClassField ? (req.body.assigned_class_id || null) : null;
    const assignedSectionId: string | null = hasSectionField ? (req.body.assigned_section_id || null) : null;

    if (hasSectionField && assignedSectionId && !assignedClassId && !hasClassField) {
      return res.status(400).json({ error: 'A class must be selected before assigning a section.' });
    }
    if (assignedClassId) {
      const cls = await queryOne(`SELECT id FROM classes WHERE id = $1`, [assignedClassId]);
      if (!cls) return res.status(400).json({ error: 'Selected class was not found.' });
    }
    if (assignedSectionId) {
      const sec = await queryOne<{ id: string; class_id: string }>(`SELECT id, class_id FROM sections WHERE id = $1`, [assignedSectionId]);
      if (!sec) return res.status(400).json({ error: 'Selected section was not found.' });
      if (assignedClassId && sec.class_id !== assignedClassId) {
        return res.status(400).json({ error: 'Selected section does not belong to the selected class.' });
      }
    }

    await execute(
      `INSERT INTO exam_room_configs (room_id, benches, seats_per_bench, is_available_for_exams, assigned_class_id, assigned_section_id, updated_at)
       VALUES ($1, COALESCE($2, 15), COALESCE($3, 2), COALESCE($4, 1), $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (room_id) DO UPDATE SET
         benches = COALESCE($2, exam_room_configs.benches),
         seats_per_bench = COALESCE($3, exam_room_configs.seats_per_bench),
         is_available_for_exams = COALESCE($4, exam_room_configs.is_available_for_exams),
         assigned_class_id = CASE WHEN $7 THEN $5 ELSE exam_room_configs.assigned_class_id END,
         assigned_section_id = CASE WHEN $8 THEN $6 ELSE exam_room_configs.assigned_section_id END,
         updated_at = CURRENT_TIMESTAMP`,
      [
        roomId,
        benches ?? null,
        seats_per_bench ?? null,
        is_available_for_exams === undefined ? null : (is_available_for_exams ? 1 : 0),
        assignedClassId,
        assignedSectionId,
        hasClassField,
        hasSectionField
      ]
    );

    await logAudit(req, 'EXAM_ROOM_CONFIGURED', 'exam_room_configs', roomId, { benches, seats_per_bench, is_available_for_exams, assigned_class_id: assignedClassId, assigned_section_id: assignedSectionId });
    return res.json({ success: true, message: 'Room exam configuration saved.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Exams
// ---------------------------------------------------------------------------

examManagementRouter.get('/subjects', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    const subjects = await query(
      `SELECT sub.id, sub.name, sub.code, d.name as department_name
       FROM subjects sub JOIN departments d ON d.id = sub.department_id
       WHERE d.branch_id = $1 ORDER BY sub.name ASC`,
      [branchId]
    );
    return res.json({ subjects });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

examManagementRouter.get('/academic-years', authenticate, requireRoles(...EXAM_ROLES), async (_req: AuthRequest, res: Response) => {
  try {
    const academicYears = await query(`SELECT * FROM academic_years ORDER BY is_current DESC, name DESC`);
    return res.json({ academicYears });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

examManagementRouter.get('/dashboard', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    const today = new Date().toISOString().slice(0, 10);

    const [statusCounts, upcomingRow, activeRow, requestRows, roomRow, invigilatorRow, seatRow, dupSeatRow, dupStudentRow] = await Promise.all([
      query<any>(`SELECT status, COUNT(*) as count FROM pu_exams WHERE branch_id = $1 GROUP BY status`, [branchId]),
      queryOne<any>(
        `SELECT COUNT(DISTINCT e.id) as count FROM pu_exams e JOIN exam_sessions s ON s.exam_id = e.id WHERE e.branch_id = $1 AND s.exam_date > $2`,
        [branchId, today]
      ),
      queryOne<any>(
        `SELECT COUNT(DISTINCT e.id) as count FROM pu_exams e JOIN exam_sessions s ON s.exam_id = e.id WHERE e.branch_id = $1 AND s.exam_date = $2`,
        [branchId, today]
      ),
      query<any>(
        `SELECT r.status, COUNT(*) as count FROM exam_invigilator_requests r
         JOIN exam_sessions s ON s.id = r.exam_session_id JOIN pu_exams e ON e.id = s.exam_id
         WHERE e.branch_id = $1 GROUP BY r.status`,
        [branchId]
      ),
      queryOne<any>(
        `SELECT COUNT(*) as room_count, COALESCE(SUM(COALESCE(c.benches, 15) * COALESCE(c.seats_per_bench, 2)), 0) as total_capacity
         FROM exam_room_allocations ra
         JOIN exam_sessions s ON s.id = ra.exam_session_id JOIN pu_exams e ON e.id = s.exam_id
         LEFT JOIN exam_room_configs c ON c.room_id = ra.room_id
         WHERE e.branch_id = $1`,
        [branchId]
      ),
      queryOne<any>(
        `SELECT COUNT(*) as count FROM exam_invigilator_assignments ia JOIN exam_sessions s ON s.id = ia.exam_session_id JOIN pu_exams e ON e.id = s.exam_id WHERE e.branch_id = $1`,
        [branchId]
      ),
      queryOne<any>(
        `SELECT COUNT(*) as count FROM exam_student_allocations sa JOIN exam_sessions s ON s.id = sa.exam_session_id JOIN pu_exams e ON e.id = s.exam_id WHERE e.branch_id = $1`,
        [branchId]
      ),
      queryOne<any>(
        `SELECT COUNT(*) as count FROM (
           SELECT sa.exam_session_id, sa.room_id, sa.seat_number FROM exam_student_allocations sa
           JOIN exam_sessions s ON s.id = sa.exam_session_id JOIN pu_exams e ON e.id = s.exam_id WHERE e.branch_id = $1
           GROUP BY sa.exam_session_id, sa.room_id, sa.seat_number HAVING COUNT(*) > 1
         ) dup`,
        [branchId]
      ),
      queryOne<any>(
        `SELECT COUNT(*) as count FROM (
           SELECT sa.exam_session_id, sa.student_id FROM exam_student_allocations sa
           JOIN exam_sessions s ON s.id = sa.exam_session_id JOIN pu_exams e ON e.id = s.exam_id WHERE e.branch_id = $1
           GROUP BY sa.exam_session_id, sa.student_id HAVING COUNT(*) > 1
         ) dup`,
        [branchId]
      )
    ]);

    const byStatus: Record<string, number> = {};
    for (const row of statusCounts) byStatus[row.status] = Number(row.count);

    let pendingRequests = 0;
    for (const row of requestRows) if (row.status === 'PENDING' || row.status === 'PARTIAL') pendingRequests += Number(row.count);

    // Total students expected vs allocated, computed exam-by-exam since
    // "expected" depends on each exam's own selected batches.
    const exams = await query<any>(`SELECT id FROM pu_exams WHERE branch_id = $1`, [branchId]);
    let totalStudentsExpected = 0;
    for (const e of exams) {
      const batches = await loadSessionBatches(e.id);
      totalStudentsExpected += batches.reduce((sum, b) => sum + b.studentIds.length, 0);
    }
    const seatsAllocated = Number(seatRow?.count || 0);
    const totalCapacity = Number(roomRow?.total_capacity || 0);

    return res.json({
      upcomingExams: Number(upcomingRow?.count || 0),
      activeExams: Number(activeRow?.count || 0),
      draftExams: byStatus['DRAFT'] || 0,
      publishedExams: byStatus['PUBLISHED'] || 0,
      readyToPublishExams: byStatus['READY_TO_PUBLISH'] || 0,
      pendingHodRequests: pendingRequests,
      invigilatorsRequired: Number(roomRow?.room_count || 0),
      invigilatorsAssigned: Number(invigilatorRow?.count || 0),
      studentsExpected: totalStudentsExpected,
      studentsAllocated: seatsAllocated,
      roomUtilizationPercent: totalCapacity > 0 ? Math.round((seatsAllocated / totalCapacity) * 10000) / 100 : 0,
      conflicts: Number(dupSeatRow?.count || 0) + Number(dupStudentRow?.count || 0)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

examManagementRouter.get('/exams', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    const exams = await query(
      `SELECT e.*, ay.name as academic_year_name,
              (SELECT COUNT(*) FROM exam_sessions s WHERE s.exam_id = e.id) as session_count,
              (SELECT COUNT(*) FROM exam_batches b WHERE b.exam_id = e.id) as batch_count
       FROM pu_exams e
       LEFT JOIN academic_years ay ON ay.id = e.academic_year_id
       WHERE e.branch_id = $1
       ORDER BY e.created_at DESC`,
      [branchId]
    );
    return res.json({ exams });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create an exam with its sessions (papers) and participating batches, all
// in one transaction so an exam never exists half-configured.
examManagementRouter.post('/exams', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const {
      branch_id, academic_year_id, name, pu_level, instructions,
      seating_layout, separate_same_class, batches, sessions
    } = req.body;

    if (!academic_year_id || !name || !pu_level || !['1 PU', '2 PU'].includes(pu_level)) {
      return res.status(400).json({ error: 'academic_year_id, name and a valid pu_level (1 PU / 2 PU) are required.' });
    }
    if (!Array.isArray(batches) || batches.length === 0) {
      return res.status(400).json({ error: 'At least one batch (class + section) must be selected.' });
    }
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return res.status(400).json({ error: 'At least one exam session (subject/date/time) is required.' });
    }

    const branchId = branch_id || req.user!.branch_id;
    const examId = 'exam-' + crypto.randomUUID();

    await transaction(async (client) => {
      await client.query(
        `INSERT INTO pu_exams (id, branch_id, academic_year_id, name, pu_level, instructions, seating_layout, separate_same_class, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'DRAFT',$9)`,
        [
          examId, branchId, academic_year_id, name, pu_level, instructions || null,
          seating_layout === 'USHAPE' ? 'USHAPE' : 'ZIGZAG',
          separate_same_class === false ? 0 : 1, req.user!.id
        ]
      );

      for (const b of batches) {
        await client.query(
          `INSERT INTO exam_batches (id, exam_id, class_id, section_id) VALUES ($1,$2,$3,$4)`,
          ['exbatch-' + crypto.randomUUID(), examId, b.class_id, b.section_id]
        );
      }

      for (const s of sessions) {
        if (!s.subject_id || !s.exam_date || !s.start_time || !s.end_time) {
          throw new Error('Each session requires subject_id, exam_date, start_time and end_time.');
        }
        await client.query(
          `INSERT INTO exam_sessions (id, exam_id, subject_id, exam_date, start_time, end_time, reporting_time)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          ['exses-' + crypto.randomUUID(), examId, s.subject_id, s.exam_date, s.start_time, s.end_time, s.reporting_time || null]
        );
      }
    });

    await logAudit(req, 'EXAM_CREATED', 'exams', examId, { name, pu_level, batchCount: batches.length, sessionCount: sessions.length });
    return res.status(201).json({ success: true, id: examId, message: 'Exam created successfully.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

examManagementRouter.get('/exams/:id', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await queryOne(
      `SELECT e.*, ay.name as academic_year_name FROM pu_exams e
       LEFT JOIN academic_years ay ON ay.id = e.academic_year_id WHERE e.id = $1`,
      [id]
    );
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });

    const batches = await query(
      `SELECT b.*, c.name as class_name, s.name as section_name,
              (SELECT COUNT(*) FROM student_profiles sp WHERE sp.class_id = b.class_id AND sp.section_id = b.section_id) as student_count,
              (SELECT COUNT(*) FROM student_profiles sp WHERE sp.class_id = b.class_id AND sp.section_id = b.section_id AND sp.gender = 'MALE') as male_count,
              (SELECT COUNT(*) FROM student_profiles sp WHERE sp.class_id = b.class_id AND sp.section_id = b.section_id AND sp.gender = 'FEMALE') as female_count
       FROM exam_batches b
       JOIN classes c ON c.id = b.class_id
       JOIN sections s ON s.id = b.section_id
       WHERE b.exam_id = $1
       ORDER BY c.name ASC, s.name ASC`,
      [id]
    );

    const sessions = await query(
      `SELECT s.*, sub.name as subject_name,
              (SELECT COUNT(*) FROM exam_room_allocations ra WHERE ra.exam_session_id = s.id) as rooms_allocated,
              (SELECT COUNT(*) FROM exam_student_allocations sa WHERE sa.exam_session_id = s.id) as students_allocated
       FROM exam_sessions s
       JOIN subjects sub ON sub.id = s.subject_id
       WHERE s.exam_id = $1
       ORDER BY s.exam_date ASC, s.start_time ASC`,
      [id]
    );

    const totalStudents = batches.reduce((sum: number, b: any) => sum + Number(b.student_count), 0);

    return res.json({
      exam,
      batches: batches.map((b: any) => ({
        ...b,
        student_count: Number(b.student_count),
        male_count: Number(b.male_count),
        female_count: Number(b.female_count),
        label: `${exam.pu_level} ${b.class_name} ${b.section_name}`
      })),
      sessions: sessions.map((s: any) => ({ ...s, rooms_allocated: Number(s.rooms_allocated), students_allocated: Number(s.students_allocated) })),
      totalStudents
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

examManagementRouter.put('/exams/:id', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, instructions, seating_layout, separate_same_class } = req.body;
    const exam = await queryOne<any>(`SELECT id, status FROM pu_exams WHERE id = $1`, [id]);
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });
    if (exam.status === 'PUBLISHED') return res.status(400).json({ error: 'Cannot edit a published exam.' });

    await execute(
      `UPDATE pu_exams SET
        name = COALESCE($1, name),
        instructions = COALESCE($2, instructions),
        seating_layout = COALESCE($3, seating_layout),
        separate_same_class = COALESCE($4, separate_same_class)
       WHERE id = $5`,
      [name, instructions, seating_layout, separate_same_class === undefined ? null : (separate_same_class ? 1 : 0), id]
    );
    await logAudit(req, 'EXAM_UPDATED', 'exams', id, req.body);
    return res.json({ success: true, message: 'Exam updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

examManagementRouter.delete('/exams/:id', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await queryOne<any>(`SELECT id, status FROM pu_exams WHERE id = $1`, [id]);
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });
    if (exam.status === 'PUBLISHED') return res.status(400).json({ error: 'Cannot delete a published exam.' });

    await execute(`DELETE FROM pu_exams WHERE id = $1`, [id]);
    await logAudit(req, 'EXAM_DELETED', 'exams', id, {});
    return res.json({ success: true, message: 'Exam deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Helpers shared by room-suggestion / automatic + manual allocation
// ---------------------------------------------------------------------------

async function loadBranchRooms(branchId: string): Promise<RoomInfo[]> {
  const rows = await query(
    `SELECT r.id as room_id, r.room_number, r.floor,
            COALESCE(c.benches, 15) as benches,
            COALESCE(c.seats_per_bench, 2) as seats_per_bench,
            COALESCE(c.is_available_for_exams, 1) as is_available_for_exams
     FROM rooms r
     LEFT JOIN exam_room_configs c ON c.room_id = r.id
     WHERE r.branch_id = $1`,
    [branchId]
  );
  return rows.map((r: any) => ({
    roomId: r.room_id,
    roomNumber: r.room_number,
    floor: Number(r.floor),
    benches: Number(r.benches),
    seatsPerBench: Number(r.seats_per_bench),
    isAvailableForExams: !!Number(r.is_available_for_exams)
  }));
}

async function loadSessionBatches(examId: string): Promise<BatchInfo[]> {
  const batches = await query(
    `SELECT b.class_id, b.section_id, c.name as class_name, s.name as section_name
     FROM exam_batches b JOIN classes c ON c.id = b.class_id JOIN sections s ON s.id = b.section_id
     WHERE b.exam_id = $1`,
    [examId]
  );
  const result: BatchInfo[] = [];
  for (const b of batches as any[]) {
    const students = await query<any>(
      `SELECT id FROM student_profiles WHERE class_id = $1 AND section_id = $2`,
      [b.class_id, b.section_id]
    );
    result.push({
      classId: b.class_id,
      sectionId: b.section_id,
      label: `${b.class_name} ${b.section_name}`,
      studentIds: students.map((s: any) => s.id)
    });
  }
  return result;
}

// Rooms already booked for an overlapping exam session elsewhere (a
// different exam, same date, overlapping time range).
async function loadConflictingRoomIds(branchId: string, examDate: string, startTime: string, endTime: string, excludeSessionId: string): Promise<Set<string>> {
  const rows = await query<any>(
    `SELECT DISTINCT ra.room_id
     FROM exam_room_allocations ra
     JOIN exam_sessions s ON s.id = ra.exam_session_id
     JOIN rooms r ON r.id = ra.room_id
     WHERE r.branch_id = $1 AND s.exam_date = $2 AND s.id != $3
       AND s.start_time < $4 AND s.end_time > $5`,
    [branchId, examDate, excludeSessionId, endTime, startTime]
  );
  return new Set(rows.map((r) => r.room_id));
}

async function priorityRoomMap(branchId: string, batches: BatchInfo[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const b of batches) {
    // An explicit "assigned class/section" set on the Room Configuration
    // screen always wins — it's the reliable source, since it doesn't
    // depend on the regular teaching timetable having been generated yet.
    const assigned = await queryOne<any>(
      `SELECT c.room_id FROM exam_room_configs c
       JOIN rooms r ON r.id = c.room_id
       WHERE r.branch_id = $1 AND c.assigned_class_id = $2 AND c.assigned_section_id = $3
       LIMIT 1`,
      [branchId, b.classId, b.sectionId]
    );
    if (assigned) {
      map.set(`${b.classId}:${b.sectionId}`, assigned.room_id);
      continue;
    }
    const row = await queryOne<any>(
      `SELECT room_id FROM timetable_entries
       WHERE branch_id = $1 AND class_id = $2 AND section_id = $3
       GROUP BY room_id ORDER BY COUNT(*) DESC LIMIT 1`,
      [branchId, b.classId, b.sectionId]
    );
    if (row) map.set(`${b.classId}:${b.sectionId}`, row.room_id);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Room selection (automatic + manual)
// ---------------------------------------------------------------------------

// Room options for the manual-selection screen: priority rooms first (the
// participating batches' own regular classrooms), then other available rooms.
examManagementRouter.get('/sessions/:sessionId/room-options', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await queryOne<any>(
      `SELECT s.*, e.branch_id, e.id as exam_id FROM exam_sessions s JOIN pu_exams e ON e.id = s.exam_id WHERE s.id = $1`,
      [sessionId]
    );
    if (!session) return res.status(404).json({ error: 'Exam session not found.' });

    const batches = await loadSessionBatches(session.exam_id);
    const allRooms = await loadBranchRooms(session.branch_id);
    const priorityMap = await priorityRoomMap(session.branch_id, batches);
    const conflictingRoomIds = await loadConflictingRoomIds(session.branch_id, session.exam_date, session.start_time, session.end_time, sessionId);
    const priorityRoomIds = new Set(priorityMap.values());
    // "classId:sectionId" -> human-readable label (e.g. "2 PU PCMB A"), so the
    // 3D view can show which exam-conducting class/section each priority
    // room belongs to instead of just an opaque key.
    const labelByKey = new Map(batches.map((b) => [`${b.classId}:${b.sectionId}`, b.label]));

    const withAvailability = allRooms.map((r) => {
      const priorityKeys = [...priorityMap.entries()].filter(([, roomId]) => roomId === r.roomId).map(([key]) => key);
      return {
        ...r,
        capacity: roomCapacity(r),
        isAvailable: r.isAvailableForExams && !conflictingRoomIds.has(r.roomId),
        isPriorityFor: priorityKeys,
        priorityLabels: priorityKeys.map((k) => labelByKey.get(k)).filter(Boolean)
      };
    });

    return res.json({
      priorityRooms: withAvailability.filter((r) => priorityRoomIds.has(r.roomId)),
      otherRooms: withAvailability.filter((r) => !priorityRoomIds.has(r.roomId)),
      requiredSeats: batches.reduce((sum, b) => sum + b.studentIds.length, 0)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

async function persistRoomAllocations(sessionId: string, entries: { roomId: string; isPriorityRoom: boolean; priorityClassId?: string; prioritySectionId?: string }[]) {
  await execute(`DELETE FROM exam_room_allocations WHERE exam_session_id = $1`, [sessionId]);
  await execute(`DELETE FROM exam_student_allocations WHERE exam_session_id = $1`, [sessionId]); // re-allocating rooms invalidates existing seats
  for (const e of entries) {
    await execute(
      `INSERT INTO exam_room_allocations (id, exam_session_id, room_id, is_priority_room, priority_class_id, priority_section_id)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      ['exalloc-' + crypto.randomUUID(), sessionId, e.roomId, e.isPriorityRoom ? 1 : 0, e.priorityClassId || null, e.prioritySectionId || null]
    );
  }
}

examManagementRouter.post('/sessions/:sessionId/allocate-rooms-auto', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await queryOne<any>(
      `SELECT s.*, e.branch_id, e.id as exam_id FROM exam_sessions s JOIN pu_exams e ON e.id = s.exam_id WHERE s.id = $1`,
      [sessionId]
    );
    if (!session) return res.status(404).json({ error: 'Exam session not found.' });

    const batches = await loadSessionBatches(session.exam_id);
    const allRooms = await loadBranchRooms(session.branch_id);
    const priorityMap = await priorityRoomMap(session.branch_id, batches);
    const conflictingRoomIds = await loadConflictingRoomIds(session.branch_id, session.exam_date, session.start_time, session.end_time, sessionId);

    const result = selectRoomsAutomatic(batches, priorityMap, allRooms, conflictingRoomIds);

    if (result.unallocatedStudents > 0) {
      return res.status(400).json({
        error: `Not enough exam-hall capacity: ${result.unallocatedStudents} student(s) could not be placed in any available room. Add more rooms or mark more rooms available for exams.`,
        result
      });
    }

    await persistRoomAllocations(sessionId, result.plan.map((p) => ({
      roomId: p.roomId,
      isPriorityRoom: p.isPriorityRoom,
      priorityClassId: p.priorityClassId,
      prioritySectionId: p.prioritySectionId
    })));
    await execute(`UPDATE pu_exams SET status = 'ROOMS_SELECTED' WHERE id = $1 AND status = 'DRAFT'`, [session.exam_id]);

    await logAudit(req, 'EXAM_ROOMS_AUTO_ALLOCATED', 'exam_sessions', sessionId, { rooms: result.plan.length, requiredSeats: result.requiredSeats });
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

examManagementRouter.put('/sessions/:sessionId/rooms', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { room_ids } = req.body;
    if (!Array.isArray(room_ids) || room_ids.length === 0) {
      return res.status(400).json({ error: 'room_ids must be a non-empty array.' });
    }

    const session = await queryOne<any>(
      `SELECT s.*, e.branch_id, e.id as exam_id FROM exam_sessions s JOIN pu_exams e ON e.id = s.exam_id WHERE s.id = $1`,
      [sessionId]
    );
    if (!session) return res.status(404).json({ error: 'Exam session not found.' });

    const allRooms = await loadBranchRooms(session.branch_id);
    const roomsById = new Map(allRooms.map((r) => [r.roomId, r]));
    const conflictingRoomIds = await loadConflictingRoomIds(session.branch_id, session.exam_date, session.start_time, session.end_time, sessionId);
    const batches = await loadSessionBatches(session.exam_id);
    const priorityMap = await priorityRoomMap(session.branch_id, batches);
    const priorityRoomIds = new Set(priorityMap.values());

    for (const roomId of room_ids) {
      const room = roomsById.get(roomId);
      if (!room) return res.status(400).json({ error: `Room ${roomId} does not belong to this branch.` });
      if (!room.isAvailableForExams) return res.status(400).json({ error: `Room ${room.roomNumber} is not marked available for exams.` });
      if (conflictingRoomIds.has(roomId)) return res.status(400).json({ error: `Room ${room.roomNumber} is already booked for another exam at this time.` });
    }

    const requiredSeats = batches.reduce((sum, b) => sum + b.studentIds.length, 0);
    const selectedCapacity = room_ids.reduce((sum: number, id: string) => sum + roomCapacity(roomsById.get(id)!), 0);
    if (selectedCapacity < requiredSeats) {
      return res.status(400).json({ error: `Selected rooms provide ${selectedCapacity} seats but ${requiredSeats} are required.` });
    }

    await persistRoomAllocations(sessionId, room_ids.map((roomId: string) => ({
      roomId,
      isPriorityRoom: priorityRoomIds.has(roomId)
    })));
    await execute(`UPDATE pu_exams SET status = 'ROOMS_SELECTED' WHERE id = $1 AND status = 'DRAFT'`, [session.exam_id]);

    await logAudit(req, 'EXAM_ROOMS_MANUALLY_SELECTED', 'exam_sessions', sessionId, { room_ids });
    return res.json({ success: true, message: 'Rooms assigned to this session.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Seat allocation
// ---------------------------------------------------------------------------

examManagementRouter.post('/sessions/:sessionId/allocate-seats', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await queryOne<any>(
      `SELECT s.*, e.id as exam_id, e.separate_same_class, e.seating_layout FROM exam_sessions s JOIN pu_exams e ON e.id = s.exam_id WHERE s.id = $1`,
      [sessionId]
    );
    if (!session) return res.status(404).json({ error: 'Exam session not found.' });

    const roomAllocations = await query<any>(
      `SELECT ra.room_id, ra.priority_class_id, ra.priority_section_id, r.room_number,
              COALESCE(c.benches, 15) as benches, COALESCE(c.seats_per_bench, 2) as seats_per_bench
       FROM exam_room_allocations ra
       JOIN rooms r ON r.id = ra.room_id
       LEFT JOIN exam_room_configs c ON c.room_id = ra.room_id
       WHERE ra.exam_session_id = $1
       ORDER BY r.floor ASC, r.room_number ASC`,
      [sessionId]
    );
    if (roomAllocations.length === 0) {
      return res.status(400).json({ error: 'Select exam rooms for this session before allocating seats.' });
    }

    const batches = await loadSessionBatches(session.exam_id);
    // Students not yet placed, in a stable order (largest batch first keeps
    // priority-classroom batches together early).
    const pending = batches.map((b) => ({ ...b, studentIds: [...b.studentIds] })).sort((a, b) => b.studentIds.length - a.studentIds.length);
    const layout = session.seating_layout === 'USHAPE' ? 'USHAPE' : 'ZIGZAG';
    const separate = !!Number(session.separate_same_class);

    const allSeats: { studentId: string; classId: string; sectionId: string; roomId: string; bench: number; seatNumber: number; row: number }[] = [];

    for (const room of roomAllocations) {
      const remainingSeats = Number(room.benches) * Number(room.seats_per_bench) - allSeats.filter((s) => s.roomId === room.room_id).length;
      if (remainingSeats <= 0) continue;
      const slots = generateRoomSeatSlots(Number(room.benches), Number(room.seats_per_bench), layout as 'ZIGZAG' | 'USHAPE');

      // Fill this room's priority batch (its own regular occupants) first if set, then whatever's left.
      const priorityKey = room.priority_class_id ? `${room.priority_class_id}:${room.priority_section_id}` : null;
      const groupsForRoom = pending
        .filter((b) => b.studentIds.length > 0)
        .sort((a, b) => {
          const aPriority = priorityKey === `${a.classId}:${a.sectionId}` ? 0 : 1;
          const bPriority = priorityKey === `${b.classId}:${b.sectionId}` ? 0 : 1;
          return aPriority - bPriority;
        });

      // Only offer as many students per group as the room can take overall;
      // assignSeatsInRoom stops once slots run out and returns the rest as overflow.
      const { seated, overflow } = assignSeatsInRoom(slots, groupsForRoom, separate);
      for (const seat of seated) {
        allSeats.push({ studentId: seat.studentId, classId: seat.classId, sectionId: seat.sectionId, roomId: room.room_id, bench: seat.bench, seatNumber: seat.seatNumber, row: seat.row });
      }

      // Remove seated students from `pending` so the next room doesn't reseat them.
      const seatedIds = new Set(seated.map((s) => s.studentId));
      for (const b of pending) {
        b.studentIds = b.studentIds.filter((id) => !seatedIds.has(id));
      }
    }

    const stillPending = pending.reduce((sum, b) => sum + b.studentIds.length, 0);
    if (stillPending > 0) {
      return res.status(400).json({ error: `${stillPending} student(s) could not be seated — selected rooms don't have enough capacity. Re-run automatic room allocation or add rooms.` });
    }

    await execute(`DELETE FROM exam_student_allocations WHERE exam_session_id = $1`, [sessionId]);
    for (const seat of allSeats) {
      await execute(
        `INSERT INTO exam_student_allocations (id, exam_session_id, student_id, room_id, class_id, section_id, bench_number, seat_number, row_number)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        ['exsa-' + crypto.randomUUID(), sessionId, seat.studentId, seat.roomId, seat.classId, seat.sectionId, seat.bench, seat.seatNumber, seat.row]
      );
    }
    await execute(`UPDATE pu_exams SET status = 'STUDENTS_ALLOCATED' WHERE id = $1`, [session.exam_id]);

    await logAudit(req, 'EXAM_SEATS_ALLOCATED', 'exam_sessions', sessionId, { seated: allSeats.length });
    return res.json({ success: true, seated: allSeats.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Full seating list for a session — used by the admin review screen, the
// lecturer's "View Student Seating", and PDF export in a later phase.
examManagementRouter.get('/sessions/:sessionId/seating', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const seating = await query(
      `SELECT sa.*, sp.name as student_name, sp.register_number, r.room_number, r.floor, c.name as class_name, s.name as section_name
       FROM exam_student_allocations sa
       JOIN student_profiles sp ON sp.id = sa.student_id
       JOIN rooms r ON r.id = sa.room_id
       JOIN classes c ON c.id = sa.class_id
       JOIN sections s ON s.id = sa.section_id
       WHERE sa.exam_session_id = $1
       ORDER BY r.floor ASC, r.room_number ASC, sa.seat_number ASC`,
      [sessionId]
    );
    return res.json({ seating });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Manual: move one student to a different room/seat, validating no conflict.
examManagementRouter.put('/sessions/:sessionId/seats/move', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { student_id, room_id, seat_number, bench_number, row_number } = req.body;
    if (!student_id || !room_id || !seat_number || !bench_number) {
      return res.status(400).json({ error: 'student_id, room_id, bench_number and seat_number are required.' });
    }

    const clash = await queryOne(
      `SELECT id FROM exam_student_allocations WHERE exam_session_id = $1 AND room_id = $2 AND seat_number = $3 AND student_id != $4`,
      [sessionId, room_id, seat_number, student_id]
    );
    if (clash) return res.status(400).json({ error: 'That seat is already taken.' });

    const allocated = await queryOne(
      `SELECT id FROM exam_room_allocations WHERE exam_session_id = $1 AND room_id = $2`,
      [sessionId, room_id]
    );
    if (!allocated) return res.status(400).json({ error: 'That room is not allocated to this exam session.' });

    await execute(
      `UPDATE exam_student_allocations SET room_id = $1, bench_number = $2, seat_number = $3, row_number = $4, updated_at = CURRENT_TIMESTAMP
       WHERE exam_session_id = $5 AND student_id = $6`,
      [room_id, bench_number, seat_number, row_number || null, sessionId, student_id]
    );
    await logAudit(req, 'EXAM_SEAT_MOVED', 'exam_student_allocations', student_id, { sessionId, room_id, seat_number });
    return res.json({ success: true, message: 'Seat updated.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Manual: swap two students' seats.
examManagementRouter.put('/sessions/:sessionId/seats/swap', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { student_id_a, student_id_b } = req.body;
    if (!student_id_a || !student_id_b) return res.status(400).json({ error: 'student_id_a and student_id_b are required.' });

    const a = await queryOne<any>(`SELECT * FROM exam_student_allocations WHERE exam_session_id = $1 AND student_id = $2`, [sessionId, student_id_a]);
    const b = await queryOne<any>(`SELECT * FROM exam_student_allocations WHERE exam_session_id = $1 AND student_id = $2`, [sessionId, student_id_b]);
    if (!a || !b) return res.status(404).json({ error: 'Both students must already have a seat in this session.' });

    await transaction(async (client) => {
      // Stage through a temporary seat number to dodge the UNIQUE(session, room, seat) constraint mid-swap.
      await client.query(`UPDATE exam_student_allocations SET seat_number = -1 WHERE id = $1`, [a.id]);
      await client.query(
        `UPDATE exam_student_allocations SET room_id = $1, bench_number = $2, seat_number = $3, row_number = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5`,
        [b.room_id, b.bench_number, b.seat_number, b.row_number, a.id]
      );
      await client.query(
        `UPDATE exam_student_allocations SET room_id = $1, bench_number = $2, seat_number = $3, row_number = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5`,
        [a.room_id, a.bench_number, a.seat_number, a.row_number, b.id]
      );
    });

    await logAudit(req, 'EXAM_SEATS_SWAPPED', 'exam_student_allocations', sessionId, { student_id_a, student_id_b });
    return res.json({ success: true, message: 'Seats swapped.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Validation + publish
// ---------------------------------------------------------------------------

examManagementRouter.get('/sessions/:sessionId/summary', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await queryOne<any>(`SELECT s.*, e.id as exam_id FROM exam_sessions s JOIN pu_exams e ON e.id = s.exam_id WHERE s.id = $1`, [sessionId]);
    if (!session) return res.status(404).json({ error: 'Exam session not found.' });

    const batches = await loadSessionBatches(session.exam_id);
    const expectedStudentIds = batches.flatMap((b) => b.studentIds);
    const allocations = await query<any>(
      `SELECT student_id, room_id, seat_number FROM exam_student_allocations WHERE exam_session_id = $1`,
      [sessionId]
    );

    const summary = summarizeAllocation(
      expectedStudentIds,
      allocations.map((a) => ({ studentId: a.student_id, roomId: a.room_id, seatNumber: Number(a.seat_number) }))
    );
    return res.json({ summary });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Reports (data for the client-side printable PDFs — Phase 3)
// ---------------------------------------------------------------------------

examManagementRouter.get('/exams/:id/invigilator-report', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await queryOne<any>(`SELECT * FROM pu_exams WHERE id = $1`, [id]);
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });

    const rows = await query(
      `SELECT s.exam_date, s.start_time, s.end_time, s.reporting_time, sub.name as subject_name,
              r.room_number, r.floor, u.name as teacher_name, d.name as department_name
       FROM exam_invigilator_assignments ia
       JOIN exam_sessions s ON s.id = ia.exam_session_id
       JOIN subjects sub ON sub.id = s.subject_id
       JOIN rooms r ON r.id = ia.room_id
       JOIN teacher_profiles tp ON tp.id = ia.teacher_id
       JOIN users u ON u.id = tp.user_id
       LEFT JOIN teacher_assignments ta ON ta.teacher_id = tp.id
       LEFT JOIN departments d ON d.id = ta.department_id
       WHERE s.exam_id = $1
       GROUP BY s.exam_date, s.start_time, s.end_time, s.reporting_time, sub.name, r.room_number, r.floor, u.name, d.name
       ORDER BY s.exam_date ASC, r.floor ASC, r.room_number ASC`,
      [id]
    );
    return res.json({ exam, rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

examManagementRouter.get('/exams/:id/seating-report', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { room_id, class_id, section_id } = req.query as Record<string, string | undefined>;
    const exam = await queryOne<any>(`SELECT * FROM pu_exams WHERE id = $1`, [id]);
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });

    const conditions = ['s.exam_id = $1'];
    const params: any[] = [id];
    if (room_id) { params.push(room_id); conditions.push(`sa.room_id = $${params.length}`); }
    if (class_id) { params.push(class_id); conditions.push(`sa.class_id = $${params.length}`); }
    if (section_id) { params.push(section_id); conditions.push(`sa.section_id = $${params.length}`); }

    const rows = await query(
      `SELECT s.exam_date, s.start_time, s.end_time, sub.name as subject_name,
              r.room_number, r.floor, sa.bench_number, sa.seat_number,
              sp.name as student_name, sp.register_number, c.name as class_name, sec.name as section_name
       FROM exam_student_allocations sa
       JOIN exam_sessions s ON s.id = sa.exam_session_id
       JOIN subjects sub ON sub.id = s.subject_id
       JOIN rooms r ON r.id = sa.room_id
       JOIN student_profiles sp ON sp.id = sa.student_id
       JOIN classes c ON c.id = sa.class_id
       JOIN sections sec ON sec.id = sa.section_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY s.exam_date ASC, r.floor ASC, r.room_number ASC, sa.seat_number ASC`,
      params
    );
    return res.json({ exam, rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

examManagementRouter.post('/exams/:id/mark-ready', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await queryOne<any>(`SELECT * FROM pu_exams WHERE id = $1`, [id]);
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });

    const sessions = await query<any>(`SELECT id FROM exam_sessions WHERE exam_id = $1`, [id]);
    const batches = await loadSessionBatches(id);
    const expectedStudentIds = batches.flatMap((b) => b.studentIds);

    const problems: string[] = [];
    for (const s of sessions) {
      const allocations = await query<any>(`SELECT student_id, room_id, seat_number FROM exam_student_allocations WHERE exam_session_id = $1`, [s.id]);
      const summary = summarizeAllocation(expectedStudentIds, allocations.map((a) => ({ studentId: a.student_id, roomId: a.room_id, seatNumber: Number(a.seat_number) })));
      if (summary.unallocated > 0) problems.push(`Session ${s.id}: ${summary.unallocated} student(s) unallocated.`);
      if (summary.conflicts.length > 0) problems.push(...summary.conflicts.map((c) => `Session ${s.id}: ${c}`));

      const roomCount = await queryOne<any>(`SELECT COUNT(*) as count FROM exam_room_allocations WHERE exam_session_id = $1`, [s.id]);
      const invigilatorCount = await queryOne<any>(`SELECT COUNT(*) as count FROM exam_invigilator_assignments WHERE exam_session_id = $1`, [s.id]);
      if (Number(roomCount?.count || 0) > Number(invigilatorCount?.count || 0)) {
        problems.push(`Session ${s.id}: ${Number(roomCount.count) - Number(invigilatorCount.count)} room(s) still need an invigilator.`);
      }
    }

    if (problems.length > 0) {
      return res.status(400).json({ error: `Cannot mark ready — ${problems.join('; ')}`, problems });
    }

    await execute(`UPDATE pu_exams SET status = 'READY_TO_PUBLISH' WHERE id = $1`, [id]);
    await logAudit(req, 'EXAM_MARKED_READY', 'exams', id, {});
    return res.json({ success: true, message: 'Exam marked ready to publish.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

examManagementRouter.post('/exams/:id/publish', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await queryOne<any>(`SELECT * FROM pu_exams WHERE id = $1`, [id]);
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });
    if (exam.status !== 'READY_TO_PUBLISH') {
      return res.status(400).json({ error: 'Mark the exam ready to publish first (all sessions must be fully, validly allocated).' });
    }

    await execute(`UPDATE pu_exams SET status = 'PUBLISHED', published_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
    await logAudit(req, 'EXAM_PUBLISHED', 'exams', id, {});

    // Notify every invigilator and every participating student/parent —
    // only fires once the exam is actually published, per the workflow.
    const sessions = await query<any>(
      `SELECT s.*, sub.name as subject_name FROM exam_sessions s JOIN subjects sub ON sub.id = s.subject_id WHERE s.exam_id = $1`,
      [id]
    );
    for (const session of sessions) {
      const invigilators = await query<any>(
        `SELECT ia.teacher_id, ia.room_id, tp.user_id, r.room_number, r.floor
         FROM exam_invigilator_assignments ia
         JOIN teacher_profiles tp ON tp.id = ia.teacher_id
         JOIN rooms r ON r.id = ia.room_id
         WHERE ia.exam_session_id = $1`,
        [session.id]
      );
      for (const inv of invigilators) {
        const message = `${exam.name} — ${session.subject_name} on ${session.exam_date} at ${session.start_time}. Room ${inv.room_number}, Floor ${inv.floor}. Reporting time: ${session.reporting_time || 'as per instructions'}.`;
        await createNotification(inv.user_id, 'Exam Duty Assigned', message, 'my-exam-duty');
        await sendPushToUser(inv.user_id, { title: `Exam Duty – Room ${inv.room_number}`, body: message, data: { type: 'exam_duty', id: session.id } });
      }

      const students = await query<any>(
        `SELECT sa.student_id, sp.user_id as student_user_id, sp.parent_user_id, r.room_number, r.floor, sa.seat_number, sa.bench_number
         FROM exam_student_allocations sa
         JOIN student_profiles sp ON sp.id = sa.student_id
         JOIN rooms r ON r.id = sa.room_id
         WHERE sa.exam_session_id = $1`,
        [session.id]
      );
      for (const st of students) {
        const message = `${exam.name} — ${session.subject_name} on ${session.exam_date} at ${session.start_time}. Room ${st.room_number}, Floor ${st.floor}, Seat ${st.seat_number}.`;
        if (st.student_user_id) {
          await createNotification(st.student_user_id, 'Exam Seating Published', message, 'exam-seating');
          await sendPushToUser(st.student_user_id, { title: 'Exam Seating Published', body: message, data: { type: 'exam_seating', id: session.id } });
        }
        if (st.parent_user_id) {
          await createNotification(st.parent_user_id, 'Exam Seating Published', message, 'exam-seating');
          await sendPushToUser(st.parent_user_id, { title: 'Exam Seating Published', body: message, data: { type: 'exam_seating', id: session.id } });
        }
      }
    }

    return res.json({ success: true, message: 'Exam published.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Re-publish after a change: if the exam department edits rooms/seats/
// invigilators/time after a previous publish, this re-sends notifications
// only to the sessions actually touched — callers pass the session ids
// that changed so unrelated students/teachers aren't spammed.
examManagementRouter.post('/exams/:id/notify-changes', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { session_ids } = req.body;
    if (!Array.isArray(session_ids) || session_ids.length === 0) {
      return res.status(400).json({ error: 'session_ids is required.' });
    }
    const exam = await queryOne<any>(`SELECT * FROM pu_exams WHERE id = $1`, [id]);
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });

    let notified = 0;
    for (const sessionId of session_ids) {
      const session = await queryOne<any>(
        `SELECT s.*, sub.name as subject_name FROM exam_sessions s JOIN subjects sub ON sub.id = s.subject_id WHERE s.id = $1 AND s.exam_id = $2`,
        [sessionId, id]
      );
      if (!session) continue;

      const invigilators = await query<any>(
        `SELECT tp.user_id, r.room_number, r.floor FROM exam_invigilator_assignments ia
         JOIN teacher_profiles tp ON tp.id = ia.teacher_id JOIN rooms r ON r.id = ia.room_id
         WHERE ia.exam_session_id = $1`,
        [sessionId]
      );
      const students = await query<any>(
        `SELECT sp.user_id as student_user_id, sp.parent_user_id, r.room_number, r.floor, sa.seat_number
         FROM exam_student_allocations sa JOIN student_profiles sp ON sp.id = sa.student_id JOIN rooms r ON r.id = sa.room_id
         WHERE sa.exam_session_id = $1`,
        [sessionId]
      );

      for (const inv of invigilators) {
        const message = `Allocation changed for ${exam.name} — ${session.subject_name} on ${session.exam_date}. You are now assigned to Room ${inv.room_number}, Floor ${inv.floor}.`;
        await createNotification(inv.user_id, 'Exam Duty Changed', message, 'my-exam-duty');
        notified++;
      }
      for (const st of students) {
        const message = `Allocation changed for ${exam.name} — ${session.subject_name} on ${session.exam_date}. Your new seat: Room ${st.room_number}, Floor ${st.floor}, Seat ${st.seat_number}.`;
        if (st.student_user_id) { await createNotification(st.student_user_id, 'Exam Seating Changed', message, 'exam-seating'); notified++; }
        if (st.parent_user_id) { await createNotification(st.parent_user_id, 'Exam Seating Changed', message, 'exam-seating'); notified++; }
      }
    }

    await logAudit(req, 'EXAM_CHANGE_NOTIFIED', 'exams', id, { session_ids, notified });
    return res.json({ success: true, notified });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Invigilator allocation (Phase 2)
// ---------------------------------------------------------------------------

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function weekdayName(dateStr: string): string {
  return WEEKDAYS[new Date(dateStr + 'T00:00:00').getDay()];
}

async function loadTeacherAvailability(branchId: string, sessionId: string, departmentId?: string): Promise<TeacherAvailability[]> {
  const session = await queryOne<any>(`SELECT * FROM exam_sessions WHERE id = $1`, [sessionId]);
  const weekday = weekdayName(session.exam_date);

  const teachers = await query<any>(
    `SELECT DISTINCT tp.id as teacher_id, u.name, ta.department_id, d.name as department_name
     FROM teacher_profiles tp
     JOIN users u ON u.id = tp.user_id
     JOIN teacher_assignments ta ON ta.teacher_id = tp.id
     JOIN departments d ON d.id = ta.department_id
     WHERE u.branch_id = $1 ${departmentId ? 'AND ta.department_id = $2' : ''}`,
    departmentId ? [branchId, departmentId] : [branchId]
  );

  const result: TeacherAvailability[] = [];
  for (const t of teachers as any[]) {
    // Already seen (a teacher can have multiple assignments/departments) — skip dupes.
    if (result.some((r) => r.teacherId === t.teacher_id)) continue;

    const teachingConflict = await queryOne(
      `SELECT 1 FROM timetable_entries WHERE teacher_id = $1 AND day_of_week = $2 AND start_time < $3 AND end_time > $4 LIMIT 1`,
      [t.teacher_id, weekday, session.end_time, session.start_time]
    );
    const invigilationConflict = await queryOne(
      `SELECT 1 FROM exam_invigilator_assignments ia JOIN exam_sessions es ON es.id = ia.exam_session_id
       WHERE ia.teacher_id = $1 AND es.exam_date = $2 AND es.start_time < $3 AND es.end_time > $4 LIMIT 1`,
      [t.teacher_id, session.exam_date, session.end_time, session.start_time]
    );
    const countRow = await queryOne<any>(
      `SELECT COUNT(*) as count FROM exam_invigilator_assignments ia JOIN exam_sessions es ON es.id = ia.exam_session_id
       WHERE ia.teacher_id = $1 AND es.exam_date = $2`,
      [t.teacher_id, session.exam_date]
    );

    result.push({
      teacherId: t.teacher_id,
      name: t.name,
      departmentId: t.department_id,
      departmentName: t.department_name,
      isAvailable: !teachingConflict && !invigilationConflict,
      unavailableReason: teachingConflict ? 'Already teaching a regular class at this time' : invigilationConflict ? 'Already assigned as an invigilator at an overlapping time' : undefined,
      currentInvigilationCount: Number(countRow?.count || 0)
    });
  }
  return result;
}

// Which teachers an HOD has actually approved as invigilators for this
// session, across every department request raised for it. Selecting WHO
// invigilates is always the HOD's call (via the request/fulfill workflow
// below) — the Exam Department can only ever allocate ROOMS to teachers
// already in this pool, whether automatically or one room at a time.
async function loadApprovedInvigilatorPool(sessionId: string): Promise<Set<string>> {
  const rows = await query<any>(
    `SELECT DISTINCT sel.teacher_id
     FROM exam_invigilator_request_selections sel
     JOIN exam_invigilator_requests r ON r.id = sel.request_id
     WHERE r.exam_session_id = $1`,
    [sessionId]
  );
  return new Set(rows.map((r) => r.teacher_id));
}

examManagementRouter.get('/sessions/:sessionId/invigilator-options', authenticate, requireRoles(...EXAM_ROLES, 'HOD'), async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const departmentId = req.query.department_id as string | undefined;
    const session = await queryOne<any>(`SELECT s.*, e.branch_id FROM exam_sessions s JOIN pu_exams e ON e.id = s.exam_id WHERE s.id = $1`, [sessionId]);
    if (!session) return res.status(404).json({ error: 'Exam session not found.' });

    const pool = await loadApprovedInvigilatorPool(sessionId);
    const teachers = (await loadTeacherAvailability(session.branch_id, sessionId, departmentId))
      .map((t) => ({ ...t, isInPool: pool.has(t.teacherId) }));
    const roomsNeedingInvigilators = await query<any>(
      `SELECT ra.room_id, r.room_number, r.floor
       FROM exam_room_allocations ra JOIN rooms r ON r.id = ra.room_id
       LEFT JOIN exam_invigilator_assignments ia ON ia.exam_session_id = ra.exam_session_id AND ia.room_id = ra.room_id
       WHERE ra.exam_session_id = $1 AND ia.id IS NULL`,
      [sessionId]
    );

    return res.json({ teachers, roomsNeedingInvigilators, poolSize: pool.size });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

examManagementRouter.post('/sessions/:sessionId/invigilators/auto', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await queryOne<any>(`SELECT s.*, e.branch_id, e.id as exam_id FROM exam_sessions s JOIN pu_exams e ON e.id = s.exam_id WHERE s.id = $1`, [sessionId]);
    if (!session) return res.status(404).json({ error: 'Exam session not found.' });

    // "Auto-assign" allocates ROOMS to lecturers an HOD has already
    // approved for this session — it never picks which lecturer
    // invigilates. That choice is always made by the HOD, via the
    // invigilator-request workflow (see below).
    const pool = await loadApprovedInvigilatorPool(sessionId);
    if (pool.size === 0) {
      return res.status(400).json({ error: 'No HOD-approved invigilators yet for this session. Send an invigilator request to a department first, and wait for the HOD to select lecturers.' });
    }
    const teachers = (await loadTeacherAvailability(session.branch_id, sessionId)).filter((t) => pool.has(t.teacherId));
    const roomsNeedingInvigilators = await query<any>(
      `SELECT ra.room_id, r.room_number
       FROM exam_room_allocations ra JOIN rooms r ON r.id = ra.room_id
       LEFT JOIN exam_invigilator_assignments ia ON ia.exam_session_id = ra.exam_session_id AND ia.room_id = ra.room_id
       WHERE ra.exam_session_id = $1 AND ia.id IS NULL`,
      [sessionId]
    );

    const { plan, unfilledRoomIds } = selectInvigilatorsAutomatic(
      roomsNeedingInvigilators.map((r: any) => ({ roomId: r.room_id, roomNumber: r.room_number })),
      teachers
    );

    for (const p of plan) {
      await execute(
        `INSERT INTO exam_invigilator_assignments (id, exam_session_id, room_id, teacher_id, assigned_via) VALUES ($1,$2,$3,$4,'AUTO')`,
        ['exinvasn-' + crypto.randomUUID(), sessionId, p.roomId, p.teacherId]
      );
    }

    const totalRooms = await queryOne<any>(`SELECT COUNT(*) as count FROM exam_room_allocations WHERE exam_session_id = $1`, [sessionId]);
    const assignedRooms = await queryOne<any>(`SELECT COUNT(*) as count FROM exam_invigilator_assignments WHERE exam_session_id = $1`, [sessionId]);
    if (Number(totalRooms?.count) > 0 && Number(totalRooms?.count) === Number(assignedRooms?.count)) {
      await execute(`UPDATE pu_exams SET status = 'INVIGILATORS_ALLOCATED' WHERE id = $1 AND status != 'PUBLISHED'`, [session.exam_id]);
    }

    await logAudit(req, 'EXAM_INVIGILATORS_AUTO_ASSIGNED', 'exam_sessions', sessionId, { assigned: plan.length, unfilled: unfilledRoomIds.length });
    return res.json({ success: true, assigned: plan.length, unfilledRoomIds });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

examManagementRouter.put('/sessions/:sessionId/invigilators/manual', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { room_id, teacher_id } = req.body;
    if (!room_id || !teacher_id) return res.status(400).json({ error: 'room_id and teacher_id are required.' });

    const session = await queryOne<any>(`SELECT * FROM exam_sessions WHERE id = $1`, [sessionId]);
    if (!session) return res.status(404).json({ error: 'Exam session not found.' });

    const allocated = await queryOne(`SELECT id FROM exam_room_allocations WHERE exam_session_id = $1 AND room_id = $2`, [sessionId, room_id]);
    if (!allocated) return res.status(400).json({ error: 'That room is not allocated to this exam session.' });

    // Even a "manual" room pick can only choose among lecturers an HOD has
    // already approved for this session — the Exam Department allocates
    // rooms, it never selects which lecturer invigilates.
    const pool = await loadApprovedInvigilatorPool(sessionId);
    if (!pool.has(teacher_id)) {
      return res.status(400).json({ error: 'That lecturer has not been approved by their HOD for this session yet. Send (or wait on) an invigilator request first.' });
    }

    const conflict = await queryOne(
      `SELECT 1 FROM exam_invigilator_assignments ia JOIN exam_sessions es ON es.id = ia.exam_session_id
       WHERE ia.teacher_id = $1 AND es.exam_date = $2 AND es.start_time < $3 AND es.end_time > $4 AND NOT (ia.exam_session_id = $5 AND ia.room_id = $6)`,
      [teacher_id, session.exam_date, session.end_time, session.start_time, sessionId, room_id]
    );
    if (conflict) return res.status(400).json({ error: 'This lecturer is already assigned elsewhere at an overlapping time.' });

    await execute(`DELETE FROM exam_invigilator_assignments WHERE exam_session_id = $1 AND room_id = $2`, [sessionId, room_id]);
    await execute(
      `INSERT INTO exam_invigilator_assignments (id, exam_session_id, room_id, teacher_id, assigned_via) VALUES ($1,$2,$3,$4,'MANUAL')`,
      ['exinvasn-' + crypto.randomUUID(), sessionId, room_id, teacher_id]
    );

    await logAudit(req, 'EXAM_INVIGILATOR_MANUALLY_ASSIGNED', 'exam_sessions', sessionId, { room_id, teacher_id });
    return res.json({ success: true, message: 'Invigilator assigned.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

examManagementRouter.get('/sessions/:sessionId/invigilators', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const assignments = await query(
      `SELECT ia.*, u.name as teacher_name, r.room_number, r.floor
       FROM exam_invigilator_assignments ia
       JOIN teacher_profiles tp ON tp.id = ia.teacher_id
       JOIN users u ON u.id = tp.user_id
       JOIN rooms r ON r.id = ia.room_id
       WHERE ia.exam_session_id = $1`,
      [sessionId]
    );
    return res.json({ assignments });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// HOD invigilator-request workflow
// ---------------------------------------------------------------------------

examManagementRouter.post('/invigilator-requests', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { exam_session_id, department_id, required_count } = req.body;
    if (!exam_session_id || !department_id || !required_count || required_count < 1) {
      return res.status(400).json({ error: 'exam_session_id, department_id and a positive required_count are required.' });
    }
    const session = await queryOne<any>(`SELECT s.*, e.name as exam_name FROM exam_sessions s JOIN pu_exams e ON e.id = s.exam_id WHERE s.id = $1`, [exam_session_id]);
    if (!session) return res.status(404).json({ error: 'Exam session not found.' });

    const dept = await queryOne<any>(`SELECT * FROM departments WHERE id = $1`, [department_id]);
    if (!dept) return res.status(404).json({ error: 'Department not found.' });

    const requestId = 'exinvreq-' + crypto.randomUUID();
    await execute(
      `INSERT INTO exam_invigilator_requests (id, exam_session_id, department_id, required_count, status, requested_by)
       VALUES ($1,$2,$3,$4,'PENDING',$5)`,
      [requestId, exam_session_id, department_id, required_count, req.user!.id]
    );

    if (dept.hod_user_id) {
      const message = `${session.exam_name} — ${required_count} invigilator(s) needed from your department for the session on ${session.exam_date} at ${session.start_time}.`;
      await createNotification(dept.hod_user_id, 'Invigilator Request', message, 'invigilator-requests');
      await sendPushToUser(dept.hod_user_id, { title: 'Invigilator Request', body: message, data: { type: 'invigilator_request', id: requestId } });
    }

    await logAudit(req, 'EXAM_INVIGILATOR_REQUEST_CREATED', 'exam_invigilator_requests', requestId, { department_id, required_count });
    return res.status(201).json({ success: true, id: requestId, message: 'Invigilator request sent to the department HOD.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Requests for the calling HOD's own department (or any, for Exam Dept/Admin review).
examManagementRouter.get('/invigilator-requests', authenticate, requireRoles(...EXAM_ROLES, 'HOD'), async (req: AuthRequest, res: Response) => {
  try {
    let departmentFilter = '';
    const params: any[] = [];
    if (req.user!.role === 'HOD') {
      const dept = await queryOne<any>(`SELECT id FROM departments WHERE hod_user_id = $1`, [req.user!.id]);
      if (!dept) return res.json({ requests: [] });
      departmentFilter = 'WHERE r.department_id = $1';
      params.push(dept.id);
    }

    const requests = await query(
      `SELECT r.*, d.name as department_name, s.exam_date, s.start_time, s.end_time, sub.name as subject_name, e.name as exam_name,
              (SELECT COUNT(*) FROM exam_invigilator_request_selections sel WHERE sel.request_id = r.id) as selected_count
       FROM exam_invigilator_requests r
       JOIN departments d ON d.id = r.department_id
       JOIN exam_sessions s ON s.id = r.exam_session_id
       JOIN subjects sub ON sub.id = s.subject_id
       JOIN pu_exams e ON e.id = s.exam_id
       ${departmentFilter}
       ORDER BY r.requested_at DESC`,
      params
    );
    return res.json({ requests: requests.map((r: any) => ({ ...r, selected_count: Number(r.selected_count), remaining: Number(r.required_count) - Number(r.selected_count) })) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Candidate lecturers for a request (HOD's own department, with availability flagged).
examManagementRouter.get('/invigilator-requests/:id/candidates', authenticate, requireRoles(...EXAM_ROLES, 'HOD'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const req2 = await queryOne<any>(
      `SELECT r.*, e.branch_id, r.exam_session_id FROM exam_invigilator_requests r
       JOIN exam_sessions s ON s.id = r.exam_session_id
       JOIN pu_exams e ON e.id = s.exam_id
       WHERE r.id = $1`,
      [id]
    );
    if (!req2) return res.status(404).json({ error: 'Request not found.' });

    const candidates = await loadTeacherAvailability(req2.branch_id, req2.exam_session_id, req2.department_id);
    const alreadySelected = await query<any>(`SELECT teacher_id FROM exam_invigilator_request_selections WHERE request_id = $1`, [id]);
    const selectedIds = new Set(alreadySelected.map((s: any) => s.teacher_id));

    return res.json({
      request: req2,
      candidates: candidates.map((c) => ({ ...c, isSelected: selectedIds.has(c.teacherId) }))
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// HOD submits their chosen lecturers for a request.
examManagementRouter.put('/invigilator-requests/:id/fulfill', authenticate, requireRoles('HOD', ...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { teacher_ids } = req.body;
    if (!Array.isArray(teacher_ids)) return res.status(400).json({ error: 'teacher_ids must be an array.' });

    const request = await queryOne<any>(`SELECT * FROM exam_invigilator_requests WHERE id = $1`, [id]);
    if (!request) return res.status(404).json({ error: 'Request not found.' });

    const session = await queryOne<any>(`SELECT * FROM exam_sessions WHERE id = $1`, [request.exam_session_id]);

    for (const teacherId of teacher_ids) {
      const conflict = await queryOne(
        `SELECT 1 FROM exam_invigilator_assignments ia JOIN exam_sessions es ON es.id = ia.exam_session_id
         WHERE ia.teacher_id = $1 AND es.exam_date = $2 AND es.start_time < $3 AND es.end_time > $4`,
        [teacherId, session.exam_date, session.end_time, session.start_time]
      );
      if (conflict) {
        return res.status(400).json({ error: `One of the selected lecturers is already unavailable at this time. Refresh candidates and try again.` });
      }
    }

    await transaction(async (client) => {
      await client.query(`DELETE FROM exam_invigilator_request_selections WHERE request_id = $1`, [id]);
      for (const teacherId of teacher_ids) {
        await client.query(
          `INSERT INTO exam_invigilator_request_selections (id, request_id, teacher_id, selected_by) VALUES ($1,$2,$3,$4)`,
          ['exinvsel-' + crypto.randomUUID(), id, teacherId, req.user!.id]
        );
      }
      const status = teacher_ids.length >= request.required_count ? 'FULFILLED' : teacher_ids.length > 0 ? 'PARTIAL' : 'PENDING';
      await client.query(`UPDATE exam_invigilator_requests SET status = $1 WHERE id = $2`, [status, id]);
    });

    await logAudit(req, 'EXAM_INVIGILATOR_REQUEST_FULFILLED', 'exam_invigilator_requests', id, { teacher_ids });
    return res.json({ success: true, message: 'Selection submitted to the Exam Department.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Exam Department assigns an HOD-approved teacher from the pool to a specific room.
examManagementRouter.post('/invigilator-requests/:id/assign-room', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { teacher_id, room_id } = req.body;
    if (!teacher_id || !room_id) return res.status(400).json({ error: 'teacher_id and room_id are required.' });

    const request = await queryOne<any>(`SELECT * FROM exam_invigilator_requests WHERE id = $1`, [id]);
    if (!request) return res.status(404).json({ error: 'Request not found.' });

    const inPool = await queryOne(`SELECT 1 FROM exam_invigilator_request_selections WHERE request_id = $1 AND teacher_id = $2`, [id, teacher_id]);
    if (!inPool) return res.status(400).json({ error: 'That lecturer was not approved by the HOD for this request.' });

    const allocated = await queryOne(`SELECT id FROM exam_room_allocations WHERE exam_session_id = $1 AND room_id = $2`, [request.exam_session_id, room_id]);
    if (!allocated) return res.status(400).json({ error: 'That room is not allocated to this exam session.' });

    await execute(`DELETE FROM exam_invigilator_assignments WHERE exam_session_id = $1 AND room_id = $2`, [request.exam_session_id, room_id]);
    await execute(
      `INSERT INTO exam_invigilator_assignments (id, exam_session_id, room_id, teacher_id, assigned_via, request_id) VALUES ($1,$2,$3,$4,'HOD',$5)`,
      ['exinvasn-' + crypto.randomUUID(), request.exam_session_id, room_id, teacher_id, id]
    );

    await logAudit(req, 'EXAM_INVIGILATOR_ASSIGNED_FROM_POOL', 'exam_invigilator_requests', id, { teacher_id, room_id });
    return res.json({ success: true, message: 'Invigilator assigned from the HOD-approved pool.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Lecturer-facing: "My Exam Duties"
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Student / Parent portal: exam seating (Phase 3)
// ---------------------------------------------------------------------------

// A student sees only their own seating — student_id is resolved from the
// authenticated user, never taken from the request body/query.
examManagementRouter.get('/my-seating', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const studentProfile = await queryOne<any>(`SELECT id FROM student_profiles WHERE user_id = $1`, [req.user!.id]);
    if (!studentProfile) return res.json({ seating: [] });

    const seating = await query(
      `SELECT e.name as exam_name, e.pu_level, e.instructions, s.exam_date, s.start_time, s.end_time, s.reporting_time,
              sub.name as subject_name, r.room_number, r.floor, sa.bench_number, sa.seat_number
       FROM exam_student_allocations sa
       JOIN exam_sessions s ON s.id = sa.exam_session_id
       JOIN pu_exams e ON e.id = s.exam_id
       JOIN subjects sub ON sub.id = s.subject_id
       JOIN rooms r ON r.id = sa.room_id
       WHERE sa.student_id = $1 AND e.status = 'PUBLISHED'
       ORDER BY s.exam_date ASC, s.start_time ASC`,
      [studentProfile.id]
    );
    return res.json({ seating });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// A parent sees only their linked child's seating — resolved from
// student_profiles.parent_user_id = the authenticated parent, never from a
// student_id the frontend supplies.
examManagementRouter.get('/child-seating', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const children = await query<any>(`SELECT id, name FROM student_profiles WHERE parent_user_id = $1`, [req.user!.id]);
    if (children.length === 0) return res.json({ seating: [] });

    const childIds = children.map((c: any) => c.id);
    const placeholders = childIds.map((_: any, i: number) => `$${i + 1}`).join(',');
    const seating = await query(
      `SELECT sa.student_id, sp.name as student_name, e.name as exam_name, e.pu_level, e.instructions,
              s.exam_date, s.start_time, s.end_time, s.reporting_time, sub.name as subject_name,
              r.room_number, r.floor, sa.bench_number, sa.seat_number
       FROM exam_student_allocations sa
       JOIN student_profiles sp ON sp.id = sa.student_id
       JOIN exam_sessions s ON s.id = sa.exam_session_id
       JOIN pu_exams e ON e.id = s.exam_id
       JOIN subjects sub ON sub.id = s.subject_id
       JOIN rooms r ON r.id = sa.room_id
       WHERE e.status = 'PUBLISHED' AND sa.student_id IN (${placeholders})
       ORDER BY s.exam_date ASC, s.start_time ASC`,
      childIds
    );
    return res.json({ seating });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

examManagementRouter.get('/my-duties', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const teacherProfile = await queryOne<any>(`SELECT id FROM teacher_profiles WHERE user_id = $1`, [req.user!.id]);
    if (!teacherProfile) return res.json({ duties: [] });

    const duties = await query(
      `SELECT ia.room_id, r.room_number, r.floor, s.exam_date, s.start_time, s.end_time, s.reporting_time,
              sub.name as subject_name, e.name as exam_name, e.pu_level, e.instructions, s.id as session_id
       FROM exam_invigilator_assignments ia
       JOIN exam_sessions s ON s.id = ia.exam_session_id
       JOIN pu_exams e ON e.id = s.exam_id
       JOIN subjects sub ON sub.id = s.subject_id
       JOIN rooms r ON r.id = ia.room_id
       WHERE ia.teacher_id = $1 AND e.status = 'PUBLISHED'
       ORDER BY s.exam_date ASC, s.start_time ASC`,
      [teacherProfile.id]
    );
    return res.json({ duties });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
