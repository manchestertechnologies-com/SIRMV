import { Router, Response } from 'express';
import { query, queryOne, execute, transaction } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import crypto from 'crypto';
import {
  RoomInfo,
  BatchInfo,
  selectRoomsAutomatic,
  generateRoomSeatSlots,
  assignSeatsInRoom,
  summarizeAllocation,
  roomCapacity
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
              COALESCE(c.is_available_for_exams, 1) as is_available_for_exams
       FROM rooms r
       LEFT JOIN exam_room_configs c ON c.room_id = r.id
       WHERE r.branch_id = $1
       ORDER BY r.floor ASC, r.room_number ASC`,
      [branchId]
    );
    const withCapacity = rooms.map((r: any) => ({
      ...r,
      benches: Number(r.benches),
      seats_per_bench: Number(r.seats_per_bench),
      is_available_for_exams: !!Number(r.is_available_for_exams),
      total_capacity: Number(r.benches) * Number(r.seats_per_bench)
    }));
    return res.json({ rooms: withCapacity });
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

    await execute(
      `INSERT INTO exam_room_configs (room_id, benches, seats_per_bench, is_available_for_exams, updated_at)
       VALUES ($1, COALESCE($2, 15), COALESCE($3, 2), COALESCE($4, 1), CURRENT_TIMESTAMP)
       ON CONFLICT (room_id) DO UPDATE SET
         benches = COALESCE($2, exam_room_configs.benches),
         seats_per_bench = COALESCE($3, exam_room_configs.seats_per_bench),
         is_available_for_exams = COALESCE($4, exam_room_configs.is_available_for_exams),
         updated_at = CURRENT_TIMESTAMP`,
      [roomId, benches ?? null, seats_per_bench ?? null, is_available_for_exams === undefined ? null : (is_available_for_exams ? 1 : 0)]
    );

    await logAudit(req, 'EXAM_ROOM_CONFIGURED', 'exam_room_configs', roomId, { benches, seats_per_bench, is_available_for_exams });
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

examManagementRouter.get('/exams', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    const exams = await query(
      `SELECT e.*, ay.name as academic_year_name,
              (SELECT COUNT(*) FROM exam_sessions s WHERE s.exam_id = e.id) as session_count,
              (SELECT COUNT(*) FROM exam_batches b WHERE b.exam_id = e.id) as batch_count
       FROM exams e
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
        `INSERT INTO exams (id, branch_id, academic_year_id, name, pu_level, instructions, seating_layout, separate_same_class, status, created_by)
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
      `SELECT e.*, ay.name as academic_year_name FROM exams e
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
    const exam = await queryOne<any>(`SELECT id, status FROM exams WHERE id = $1`, [id]);
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });
    if (exam.status === 'PUBLISHED') return res.status(400).json({ error: 'Cannot edit a published exam.' });

    await execute(
      `UPDATE exams SET
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
    const exam = await queryOne<any>(`SELECT id, status FROM exams WHERE id = $1`, [id]);
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });
    if (exam.status === 'PUBLISHED') return res.status(400).json({ error: 'Cannot delete a published exam.' });

    await execute(`DELETE FROM exams WHERE id = $1`, [id]);
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
      `SELECT s.*, e.branch_id, e.id as exam_id FROM exam_sessions s JOIN exams e ON e.id = s.exam_id WHERE s.id = $1`,
      [sessionId]
    );
    if (!session) return res.status(404).json({ error: 'Exam session not found.' });

    const batches = await loadSessionBatches(session.exam_id);
    const allRooms = await loadBranchRooms(session.branch_id);
    const priorityMap = await priorityRoomMap(session.branch_id, batches);
    const conflictingRoomIds = await loadConflictingRoomIds(session.branch_id, session.exam_date, session.start_time, session.end_time, sessionId);
    const priorityRoomIds = new Set(priorityMap.values());

    const withAvailability = allRooms.map((r) => ({
      ...r,
      capacity: roomCapacity(r),
      isAvailable: r.isAvailableForExams && !conflictingRoomIds.has(r.roomId),
      isPriorityFor: [...priorityMap.entries()].filter(([, roomId]) => roomId === r.roomId).map(([key]) => key)
    }));

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
      `SELECT s.*, e.branch_id, e.id as exam_id FROM exam_sessions s JOIN exams e ON e.id = s.exam_id WHERE s.id = $1`,
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
    await execute(`UPDATE exams SET status = 'ROOMS_SELECTED' WHERE id = $1 AND status = 'DRAFT'`, [session.exam_id]);

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
      `SELECT s.*, e.branch_id, e.id as exam_id FROM exam_sessions s JOIN exams e ON e.id = s.exam_id WHERE s.id = $1`,
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
    await execute(`UPDATE exams SET status = 'ROOMS_SELECTED' WHERE id = $1 AND status = 'DRAFT'`, [session.exam_id]);

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
      `SELECT s.*, e.id as exam_id, e.separate_same_class, e.seating_layout FROM exam_sessions s JOIN exams e ON e.id = s.exam_id WHERE s.id = $1`,
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
    await execute(`UPDATE exams SET status = 'STUDENTS_ALLOCATED' WHERE id = $1`, [session.exam_id]);

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
    const session = await queryOne<any>(`SELECT s.*, e.id as exam_id FROM exam_sessions s JOIN exams e ON e.id = s.exam_id WHERE s.id = $1`, [sessionId]);
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

examManagementRouter.post('/exams/:id/mark-ready', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await queryOne<any>(`SELECT * FROM exams WHERE id = $1`, [id]);
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
    }

    if (problems.length > 0) {
      return res.status(400).json({ error: `Cannot mark ready — ${problems.join('; ')}`, problems });
    }

    await execute(`UPDATE exams SET status = 'READY_TO_PUBLISH' WHERE id = $1`, [id]);
    await logAudit(req, 'EXAM_MARKED_READY', 'exams', id, {});
    return res.json({ success: true, message: 'Exam marked ready to publish.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

examManagementRouter.post('/exams/:id/publish', authenticate, requireRoles(...EXAM_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await queryOne<any>(`SELECT * FROM exams WHERE id = $1`, [id]);
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });
    if (exam.status !== 'READY_TO_PUBLISH') {
      return res.status(400).json({ error: 'Mark the exam ready to publish first (all sessions must be fully, validly allocated).' });
    }

    await execute(`UPDATE exams SET status = 'PUBLISHED', published_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
    await logAudit(req, 'EXAM_PUBLISHED', 'exams', id, {});
    // Student/Parent/Teacher portal visibility, PDF reports and push
    // notifications for this module ship in the next phase.
    return res.json({ success: true, message: 'Exam published.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
