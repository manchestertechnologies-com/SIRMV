// Exam Management allocation engine — pure functions, no DB access, so the
// rules below can't be bypassed or duplicated by the frontend. The route
// layer (examManagement.ts) loads data, calls these functions, and persists
// the result.
//
// Covers: room capacity math, automatic room selection with the
// batch-classroom priority rule, deterministic zig-zag / U-shape seat
// numbering with a same-class-separation constraint, and validation /
// conflict detection before publish.

export interface RoomInfo {
  roomId: string;
  roomNumber: string;
  floor: number;
  benches: number;
  seatsPerBench: number;
  isAvailableForExams: boolean;
}

export interface BatchInfo {
  classId: string;
  sectionId: string;
  label: string; // e.g. "2 PU PCMB A" — for display/reporting only
  studentIds: string[];
}

export interface RoomPlanEntry {
  roomId: string;
  capacity: number;
  isPriorityRoom: boolean;
  priorityClassId?: string;
  prioritySectionId?: string;
  studentsAssigned: number;
}

export interface RoomSelectionResult {
  plan: RoomPlanEntry[];
  requiredSeats: number;
  selectedCapacity: number;
  unusedSeats: number;
  unallocatedStudents: number; // > 0 only if genuinely out of capacity
}

export function roomCapacity(room: Pick<RoomInfo, 'benches' | 'seatsPerBench'>): number {
  return room.benches * room.seatsPerBench;
}

/**
 * Automatic room selection.
 *
 * Priority order (per spec):
 *  1. The exam-conducting batch's own regular classroom (if available and
 *     has capacity) — use it first, even if it can't hold the whole batch;
 *     the remainder spills into the next room.
 *  2. Overflow: rooms that belong to ANY of the exam-conducting batches
 *     (i.e. another participating class/section's regular classroom) —
 *     these are reliably free at exam time, since their own class is
 *     sitting the same exam rather than having a normal lecture there.
 *     Smallest-fit-first among these.
 *  3. Only once every exam-conducting batch's own room is exhausted, fall
 *     back to other available rooms outside the exam (a class NOT sitting
 *     this exam may still be in a live lecture there) — smallest-fit-first.
 */
export function selectRoomsAutomatic(
  batches: BatchInfo[],
  priorityRoomByBatch: Map<string, string>, // key: `${classId}:${sectionId}` -> roomId
  availableRooms: RoomInfo[],
  alreadyUsedRoomIds: Set<string> // rooms already booked elsewhere for this exact session time
): RoomSelectionResult {
  const roomsById = new Map(availableRooms.map((r) => [r.roomId, r]));
  const usedCapacity = new Map<string, number>(); // roomId -> seats already committed in this plan
  const plan: RoomPlanEntry[] = [];
  let unallocatedStudents = 0;

  const remainingCapacity = (roomId: string) => {
    const room = roomsById.get(roomId);
    if (!room) return 0;
    return roomCapacity(room) - (usedCapacity.get(roomId) || 0);
  };

  const commitToRoom = (roomId: string, count: number, isPriority: boolean, batch: BatchInfo) => {
    usedCapacity.set(roomId, (usedCapacity.get(roomId) || 0) + count);
    let entry = plan.find((p) => p.roomId === roomId);
    if (!entry) {
      const room = roomsById.get(roomId)!;
      entry = {
        roomId,
        capacity: roomCapacity(room),
        isPriorityRoom: isPriority,
        priorityClassId: isPriority ? batch.classId : undefined,
        prioritySectionId: isPriority ? batch.sectionId : undefined,
        studentsAssigned: 0
      };
      plan.push(entry);
    } else if (isPriority && !entry.isPriorityRoom) {
      // A later batch claimed this room as its own regular classroom too
      // (e.g. an overflow room for one batch turns out to be another
      // batch's priority room) — reflect that in the UI/3D view.
      entry.isPriorityRoom = true;
      entry.priorityClassId = batch.classId;
      entry.prioritySectionId = batch.sectionId;
    }
    entry.studentsAssigned += count;
  };

  // Every room that's a regular classroom for one of THIS exam's batches —
  // these are free during the exam (their own class is sitting it, not
  // holding a lecture), so overflow should draw from them before touching
  // any room belonging to a class that isn't part of this exam at all.
  const examBatchRoomIds = new Set(priorityRoomByBatch.values());

  // Rooms not yet touched by any batch, sorted with exam-conducting
  // classes' own rooms first (see above), then smallest-capacity-first
  // within each group so automatic overflow allocation doesn't waste a
  // large room on a small remainder ("minimize unused seating capacity").
  const genericPool = () =>
    availableRooms
      .filter((r) => r.isAvailableForExams && !alreadyUsedRoomIds.has(r.roomId))
      .sort((a, b) => {
        const aOwn = examBatchRoomIds.has(a.roomId) ? 0 : 1;
        const bOwn = examBatchRoomIds.has(b.roomId) ? 0 : 1;
        if (aOwn !== bOwn) return aOwn - bOwn;
        return roomCapacity(a) - roomCapacity(b);
      });

  // Track each batch's still-unseated count across both passes.
  const remainingByBatch = new Map<BatchInfo, number>(batches.map((b) => [b, b.studentIds.length]));

  // Pass 1: every batch claims its OWN regular classroom first, in full,
  // before any batch starts overflowing into anyone else's room. Doing this
  // as its own pass (rather than interleaved per-batch) guarantees an early
  // batch's overflow can never eat into a later batch's not-yet-claimed
  // priority room.
  for (const batch of batches) {
    let remaining = remainingByBatch.get(batch)!;
    if (remaining === 0) continue;

    const key = `${batch.classId}:${batch.sectionId}`;
    const priorityRoomId = priorityRoomByBatch.get(key);
    if (priorityRoomId && roomsById.has(priorityRoomId) && !alreadyUsedRoomIds.has(priorityRoomId)) {
      const room = roomsById.get(priorityRoomId)!;
      if (room.isAvailableForExams) {
        const free = remainingCapacity(priorityRoomId);
        if (free > 0) {
          const take = Math.min(free, remaining);
          commitToRoom(priorityRoomId, take, true, batch);
          remaining -= take;
          remainingByBatch.set(batch, remaining);
        }
      }
    }
  }

  // Pass 2 (overflow): fill any batch still short of seats, preferring
  // other exam-conducting batches' rooms before any room outside this exam
  // (see genericPool's ordering above), and reusing rooms already opened by
  // this plan first so students aren't spread across more rooms than
  // necessary.
  for (const batch of batches) {
    let remaining = remainingByBatch.get(batch)!;
    if (remaining === 0) continue;

    while (remaining > 0) {
      const openRoom = plan
        .filter((p) => remainingCapacityFor(p, roomsById) > 0)
        .sort((a, b) => remainingCapacityFor(a, roomsById) - remainingCapacityFor(b, roomsById))[0];

      if (openRoom) {
        const free = remainingCapacityFor(openRoom, roomsById);
        const take = Math.min(free, remaining);
        usedCapacity.set(openRoom.roomId, (usedCapacity.get(openRoom.roomId) || 0) + take);
        openRoom.studentsAssigned += take;
        remaining -= take;
        continue;
      }

      const candidate = genericPool().find((r) => remainingCapacity(r.roomId) === roomCapacity(r) && !plan.some((p) => p.roomId === r.roomId));
      if (!candidate) {
        // Truly out of capacity — report rather than silently drop students.
        unallocatedStudents += remaining;
        break;
      }
      const free = remainingCapacity(candidate.roomId);
      const take = Math.min(free, remaining);
      commitToRoom(candidate.roomId, take, false, batch);
      remaining -= take;
    }
  }

  const requiredSeats = batches.reduce((sum, b) => sum + b.studentIds.length, 0);
  const selectedCapacity = plan.reduce((sum, p) => sum + p.capacity, 0);

  return {
    plan,
    requiredSeats,
    selectedCapacity,
    unusedSeats: Math.max(0, selectedCapacity - requiredSeats + unallocatedStudents),
    unallocatedStudents
  };
}

function remainingCapacityFor(entry: RoomPlanEntry, roomsById: Map<string, RoomInfo>): number {
  return entry.capacity - entry.studentsAssigned;
}

// ---------------------------------------------------------------------
// Seat numbering
// ---------------------------------------------------------------------

export interface SeatSlot {
  bench: number; // 1-based
  seatInBench: number; // 1-based
  seatNumber: number; // 1-based, sequential in the room per the chosen pattern
  row: number; // 1-based
}

// Benches are laid out in rows of this width. Configurable here rather
// than hard-coded per call site; a room with fewer benches than this just
// gets one (possibly partial) row.
const BENCH_COLUMNS = 5;

/**
 * Generates every seat slot in a room in the deterministic order dictated
 * by the chosen layout. Callers assign students to slots in this order —
 * that's what makes zig-zag vs U-shape an actual seating difference and
 * not just a label.
 */
export function generateRoomSeatSlots(benches: number, seatsPerBench: number, layout: 'ZIGZAG' | 'USHAPE'): SeatSlot[] {
  const rows = Math.ceil(benches / BENCH_COLUMNS);
  // benchGrid[row][col] = bench number (1-based), or 0 if no bench there
  const benchGrid: number[][] = [];
  let benchCounter = 1;
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < BENCH_COLUMNS; c++) {
      if (benchCounter <= benches) {
        row.push(benchCounter);
        benchCounter++;
      } else {
        row.push(0);
      }
    }
    benchGrid.push(row);
  }

  const orderedBenchCells: { bench: number; row: number }[] = [];

  if (layout === 'ZIGZAG') {
    for (let r = 0; r < rows; r++) {
      const cols = r % 2 === 0 ? [...Array(BENCH_COLUMNS).keys()] : [...Array(BENCH_COLUMNS).keys()].reverse();
      for (const c of cols) {
        const bench = benchGrid[r][c];
        if (bench) orderedBenchCells.push({ bench, row: r + 1 });
      }
    }
  } else {
    // USHAPE: trace the perimeter of the grid first (left column down,
    // bottom row across, right column up), then sweep any remaining
    // interior benches in row order so every seat is still usable —
    // capacity must never be sacrificed for the shape.
    const visited = new Set<string>();
    const key = (r: number, c: number) => `${r}:${c}`;
    const lastRow = rows - 1;
    const lastCol = BENCH_COLUMNS - 1;

    const addCell = (r: number, c: number) => {
      if (r < 0 || r >= rows || c < 0 || c > lastCol) return;
      const k = key(r, c);
      if (visited.has(k)) return;
      const bench = benchGrid[r][c];
      if (!bench) return;
      visited.add(k);
      orderedBenchCells.push({ bench, row: r + 1 });
    };

    // Left column, top -> bottom.
    for (let r = 0; r <= lastRow; r++) addCell(r, 0);
    // Bottom row, left -> right.
    for (let c = 1; c <= lastCol; c++) addCell(lastRow, c);
    // Right column, bottom -> top.
    for (let r = lastRow - 1; r >= 0; r--) addCell(r, lastCol);
    // Any interior benches left over, in plain row order.
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < BENCH_COLUMNS; c++) addCell(r, c);
    }
  }

  const slots: SeatSlot[] = [];
  let seatNumber = 1;
  for (const cell of orderedBenchCells) {
    for (let s = 1; s <= seatsPerBench; s++) {
      slots.push({ bench: cell.bench, seatInBench: s, seatNumber: seatNumber++, row: cell.row });
    }
  }
  return slots;
}

export interface StudentSeat {
  studentId: string;
  classId: string;
  sectionId: string;
  bench: number;
  seatNumber: number;
  row: number;
}

/**
 * Fills a room's seat slots with students from possibly multiple batches.
 * When `separateSameClass` is on, batches are interleaved round-robin so
 * consecutive seats come from different class+section groups wherever the
 * room has more than one group to draw from. Returns the seated students
 * plus any that didn't fit (should be empty if callers sized rooms via
 * selectRoomsAutomatic first).
 */
export function assignSeatsInRoom(
  slots: SeatSlot[],
  groups: BatchInfo[],
  separateSameClass: boolean
): { seated: StudentSeat[]; overflow: string[] } {
  const seated: StudentSeat[] = [];
  const queues = groups.map((g) => ({ ...g, remaining: [...g.studentIds] })).filter((g) => g.remaining.length > 0);

  const pickNext = (lastClassSection: string | null): typeof queues[number] | null => {
    if (queues.length === 0) return null;
    if (separateSameClass && queues.length > 1) {
      const candidate = queues.find((q) => `${q.classId}:${q.sectionId}` !== lastClassSection && q.remaining.length > 0);
      if (candidate) return candidate;
    }
    return queues.find((q) => q.remaining.length > 0) || null;
  };

  let lastKey: string | null = null;
  for (const slot of slots) {
    const group = pickNext(lastKey);
    if (!group) break;
    const studentId = group.remaining.shift()!;
    seated.push({
      studentId,
      classId: group.classId,
      sectionId: group.sectionId,
      bench: slot.bench,
      seatNumber: slot.seatNumber,
      row: slot.row
    });
    lastKey = `${group.classId}:${group.sectionId}`;
    // Drop emptied queues so pickNext stops considering them.
    for (let i = queues.length - 1; i >= 0; i--) {
      if (queues[i].remaining.length === 0) queues.splice(i, 1);
    }
  }

  const overflow = queues.flatMap((q) => q.remaining);
  return { seated, overflow };
}

// ---------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------

export interface AllocationSummary {
  totalStudents: number;
  allocated: number;
  unallocated: number;
  roomsUsed: number;
  seatsUsed: number;
  conflicts: string[];
}

// ---------------------------------------------------------------------
// Invigilator allocation (Phase 2)
// ---------------------------------------------------------------------

export interface TeacherAvailability {
  teacherId: string;
  name: string;
  departmentId: string;
  departmentName: string;
  isAvailable: boolean;
  unavailableReason?: string;
  currentInvigilationCount: number; // load-balancing signal, e.g. today's assignments so far
}

export interface RoomInvigilatorNeed {
  roomId: string;
  roomNumber: string;
}

export interface InvigilatorAssignmentPlan {
  roomId: string;
  teacherId: string;
}

/**
 * Assigns one invigilator per room from the pool of already-filtered
 * available teachers (availability/conflict checks happen in the route
 * layer, which has the DB). Picks the least-loaded eligible teacher first
 * so invigilation duty is spread out ("maximum workload if configured").
 * The result stays fully editable — callers persist it, the exam
 * department can override any assignment before publishing.
 */
export function selectInvigilatorsAutomatic(
  rooms: RoomInvigilatorNeed[],
  availableTeachers: TeacherAvailability[]
): { plan: InvigilatorAssignmentPlan[]; unfilledRoomIds: string[] } {
  const pool = availableTeachers
    .filter((t) => t.isAvailable)
    .sort((a, b) => a.currentInvigilationCount - b.currentInvigilationCount)
    .map((t) => ({ ...t }));

  const plan: InvigilatorAssignmentPlan[] = [];
  const unfilledRoomIds: string[] = [];
  const usedThisSession = new Set<string>();

  for (const room of rooms) {
    const next = pool.find((t) => !usedThisSession.has(t.teacherId));
    if (!next) {
      unfilledRoomIds.push(room.roomId);
      continue;
    }
    plan.push({ roomId: room.roomId, teacherId: next.teacherId });
    usedThisSession.add(next.teacherId);
    next.currentInvigilationCount += 1;
    pool.sort((a, b) => a.currentInvigilationCount - b.currentInvigilationCount);
  }

  return { plan, unfilledRoomIds };
}

export function timeRangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB;
}

export function summarizeAllocation(
  expectedStudentIds: string[],
  allocations: { studentId: string; roomId: string; seatNumber: number }[]
): AllocationSummary {
  const conflicts: string[] = [];
  const seatKeySeen = new Set<string>();
  const studentSeen = new Set<string>();

  for (const a of allocations) {
    const seatKey = `${a.roomId}:${a.seatNumber}`;
    if (seatKeySeen.has(seatKey)) {
      conflicts.push(`Duplicate seat ${a.seatNumber} in room ${a.roomId}`);
    }
    seatKeySeen.add(seatKey);

    if (studentSeen.has(a.studentId)) {
      conflicts.push(`Student ${a.studentId} allocated more than one seat`);
    }
    studentSeen.add(a.studentId);
  }

  const allocatedIds = new Set(allocations.map((a) => a.studentId));
  const unallocated = expectedStudentIds.filter((id) => !allocatedIds.has(id));

  return {
    totalStudents: expectedStudentIds.length,
    allocated: allocatedIds.size,
    unallocated: unallocated.length,
    roomsUsed: new Set(allocations.map((a) => a.roomId)).size,
    seatsUsed: allocations.length,
    conflicts
  };
}
