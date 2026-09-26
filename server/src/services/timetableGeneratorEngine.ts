// Pure, backend-only constraint-solving logic for the Timetable Generator.
// No DB access here — routes/timetableGenerator.ts fetches the rows and calls these
// functions, so the rules below can never be bypassed or duplicated from the frontend.

export interface ConfigInput {
  working_days: string[];
  college_start_time: string; // '09:00'
  college_end_time: string;   // '16:00'
  period_duration_minutes: number;
  breaks: { after_period: number; label?: string }[];
  use_room_allocation: boolean;
}

export interface PeriodSlot {
  period_number: number;
  start_time: string;
  end_time: string;
}

export interface RequirementInput {
  id: string;
  subject_id: string;
  class_id: string;
  section_id: string;
  periods_per_week: number;
  avoid_repeat_same_day: boolean;
}

export interface AssignmentInput {
  subject_id: string;
  class_id: string;
  section_id: string;
  batch_id: string;
  teacher_id: string;
}

export interface AvailabilityInput {
  teacher_id: string;
  available_days: string[];
  max_hours_per_week: number;
}

export interface UnavailablePeriodInput {
  teacher_id: string;
  day_of_week: string;
  period_number: number;
}

export interface DraftEntry {
  day_of_week: string;
  period_number: number;
  start_time: string;
  end_time: string;
  subject_id: string;
  class_id: string;
  section_id: string;
  batch_id: string;
  room_id: string | null;
  teacher_id: string;
  requirement_id: string;
}

export interface GeneratorIssue {
  type: 'MISSING_TEACHER' | 'UNFULFILLED_SUBJECT_HOURS';
  requirement_id: string;
  subject_id: string;
  class_id: string;
  section_id: string;
  batch_id?: string;
  teacher_id?: string;
  periods_short?: number;
  message: string;
}

// --- Time helpers -----------------------------------------------------------

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}
function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Builds the day's teaching periods, skipping break slots (hard constraint 6). */
export function buildPeriods(config: ConfigInput): PeriodSlot[] {
  const start = timeToMinutes(config.college_start_time);
  const end = timeToMinutes(config.college_end_time);
  const dur = config.period_duration_minutes;
  const totalSlots = Math.max(0, Math.floor((end - start) / dur));
  const breakAfter = new Set((config.breaks || []).map((b) => b.after_period));

  const periods: PeriodSlot[] = [];
  let teachingCount = 0;
  for (let slot = 0; slot < totalSlots; slot++) {
    const slotStart = start + slot * dur;
    if (breakAfter.has(teachingCount)) {
      // this slot is consumed by a break placed after `teachingCount` teaching periods
      breakAfter.delete(teachingCount);
      continue;
    }
    teachingCount++;
    periods.push({ period_number: teachingCount, start_time: minutesToTime(slotStart), end_time: minutesToTime(slotStart + dur) });
  }
  return periods;
}

interface UnitToPlace {
  requirement_id: string;
  subject_id: string;
  class_id: string;
  section_id: string;
  batch_id: string;
  teacher_id: string;
  periods_needed: number;
  avoid_repeat_same_day: boolean;
}

function key(...parts: (string | number)[]) {
  return parts.join('|');
}

/**
 * Greedy, most-constrained-first constraint solver. Builds the whole draft
 * placing periods one at a time; a slot is only ever chosen if it violates
 * none of hard constraints 1-4, 6, 7, 9, 10. When a unit genuinely cannot be
 * placed (every legal slot exhausted) it is reported as an issue instead of
 * being force-placed into a conflicting slot.
 */
export function generateDraftEntries(
  config: ConfigInput,
  requirements: RequirementInput[],
  assignments: AssignmentInput[],
  availability: AvailabilityInput[],
  unavailablePeriods: UnavailablePeriodInput[],
  roomIds: string[]
): { entries: DraftEntry[]; issues: GeneratorIssue[] } {
  const periods = buildPeriods(config);
  const workingDays = config.working_days;
  const entries: DraftEntry[] = [];
  const issues: GeneratorIssue[] = [];

  const availabilityMap = new Map<string, AvailabilityInput>();
  availability.forEach((a) => availabilityMap.set(a.teacher_id, a));

  const unavailableSet = new Set<string>();
  unavailablePeriods.forEach((u) => unavailableSet.add(key(u.teacher_id, u.day_of_week, u.period_number)));

  // Expand requirements -> concrete units via matching teacher_assignments rows.
  const units: UnitToPlace[] = [];
  for (const r of requirements) {
    const matches = assignments.filter(
      (a) => a.subject_id === r.subject_id && a.class_id === r.class_id && a.section_id === r.section_id
    );
    if (matches.length === 0) {
      issues.push({
        type: 'MISSING_TEACHER',
        requirement_id: r.id,
        subject_id: r.subject_id,
        class_id: r.class_id,
        section_id: r.section_id,
        message: 'No teacher is assigned to this subject for this class/section yet.'
      });
      continue;
    }
    for (const m of matches) {
      units.push({
        requirement_id: r.id,
        subject_id: r.subject_id,
        class_id: r.class_id,
        section_id: r.section_id,
        batch_id: m.batch_id,
        teacher_id: m.teacher_id,
        periods_needed: r.periods_per_week,
        avoid_repeat_same_day: r.avoid_repeat_same_day
      });
    }
  }

  function availableDaysFor(teacherId: string): string[] {
    const a = availabilityMap.get(teacherId);
    const allowed = a ? a.available_days.filter((d) => workingDays.includes(d)) : workingDays;
    return allowed.length > 0 ? allowed : workingDays;
  }

  // Most-constrained-first: fewer legal (day) options and more periods needed goes first.
  const sortedUnits = [...units].sort((a, b) => {
    const scoreA = availableDaysFor(a.teacher_id).length;
    const scoreB = availableDaysFor(b.teacher_id).length;
    if (scoreA !== scoreB) return scoreA - scoreB;
    return b.periods_needed - a.periods_needed;
  });

  const teacherHoursUsed = new Map<string, number>();
  const teacherDayPeriodUsed = new Set<string>();
  const classDayPeriodUsed = new Set<string>();
  const roomDayPeriodUsed = new Set<string>();
  const subjectClassDayUsed = new Set<string>(); // subject|class|section|batch|day
  const teacherDayPeriods = new Map<string, number[]>(); // teacher|day -> period_numbers used, for gap-minimizing

  function tryPlace(unit: UnitToPlace): boolean {
    const days = availableDaysFor(unit.teacher_id);
    // Spread across the week: prefer days this subject hasn't used yet for this class/section/batch.
    const dayOrder = [...days].sort((d1, d2) => {
      const u1 = subjectClassDayUsed.has(key(unit.subject_id, unit.class_id, unit.section_id, unit.batch_id, d1)) ? 1 : 0;
      const u2 = subjectClassDayUsed.has(key(unit.subject_id, unit.class_id, unit.section_id, unit.batch_id, d2)) ? 1 : 0;
      return u1 - u2;
    });

    const maxHours = availabilityMap.get(unit.teacher_id)?.max_hours_per_week ?? 40;

    for (const day of dayOrder) {
      const repeatsToday = subjectClassDayUsed.has(key(unit.subject_id, unit.class_id, unit.section_id, unit.batch_id, day));
      const hasUnusedDay = dayOrder.some(
        (d) => !subjectClassDayUsed.has(key(unit.subject_id, unit.class_id, unit.section_id, unit.batch_id, d))
      );
      if (unit.avoid_repeat_same_day && repeatsToday && hasUnusedDay) continue;

      // Prefer periods adjacent to the teacher's already-placed periods that day (minimizes gaps).
      const usedTodayForTeacher = teacherDayPeriods.get(key(unit.teacher_id, day)) || [];
      const periodOrder = [...periods].sort((p1, p2) => {
        const dist = (p: PeriodSlot) =>
          usedTodayForTeacher.length === 0 ? 0 : Math.min(...usedTodayForTeacher.map((u) => Math.abs(u - p.period_number)));
        return dist(p1) - dist(p2);
      });

      for (const p of periodOrder) {
        if ((teacherHoursUsed.get(unit.teacher_id) || 0) + 1 > maxHours) break; // no point scanning further periods
        if (unavailableSet.has(key(unit.teacher_id, day, p.period_number))) continue;
        if (teacherDayPeriodUsed.has(key(unit.teacher_id, day, p.period_number))) continue;
        if (classDayPeriodUsed.has(key(unit.class_id, unit.section_id, unit.batch_id, day, p.period_number))) continue;

        let assignedRoom: string | null = null;
        if (config.use_room_allocation && roomIds.length > 0) {
          const freeRoom = roomIds.find((r) => !roomDayPeriodUsed.has(key(r, day, p.period_number)));
          if (!freeRoom) continue;
          assignedRoom = freeRoom;
        }

        // Place it.
        entries.push({
          day_of_week: day,
          period_number: p.period_number,
          start_time: p.start_time,
          end_time: p.end_time,
          subject_id: unit.subject_id,
          class_id: unit.class_id,
          section_id: unit.section_id,
          batch_id: unit.batch_id,
          room_id: assignedRoom,
          teacher_id: unit.teacher_id,
          requirement_id: unit.requirement_id
        });
        teacherHoursUsed.set(unit.teacher_id, (teacherHoursUsed.get(unit.teacher_id) || 0) + 1);
        teacherDayPeriodUsed.add(key(unit.teacher_id, day, p.period_number));
        classDayPeriodUsed.add(key(unit.class_id, unit.section_id, unit.batch_id, day, p.period_number));
        if (assignedRoom) roomDayPeriodUsed.add(key(assignedRoom, day, p.period_number));
        subjectClassDayUsed.add(key(unit.subject_id, unit.class_id, unit.section_id, unit.batch_id, day));
        const arr = teacherDayPeriods.get(key(unit.teacher_id, day)) || [];
        arr.push(p.period_number);
        teacherDayPeriods.set(key(unit.teacher_id, day), arr);
        return true;
      }
    }
    return false;
  }

  for (const unit of sortedUnits) {
    let placedCount = 0;
    for (let i = 0; i < unit.periods_needed; i++) {
      if (tryPlace(unit)) placedCount++;
    }
    if (placedCount < unit.periods_needed) {
      issues.push({
        type: 'UNFULFILLED_SUBJECT_HOURS',
        requirement_id: unit.requirement_id,
        subject_id: unit.subject_id,
        class_id: unit.class_id,
        section_id: unit.section_id,
        batch_id: unit.batch_id,
        teacher_id: unit.teacher_id,
        periods_short: unit.periods_needed - placedCount,
        message: `Could only place ${placedCount} of ${unit.periods_needed} required periods/week — teacher availability, hour cap, or free slots ran out.`
      });
    }
  }

  return { entries, issues };
}

// --- Conflict detection (computed on read, never stored) --------------------

export interface StoredDraftEntry extends DraftEntry {
  id: string;
}

export interface ConflictGroup {
  type: 'TEACHER_CONFLICT' | 'CLASS_CONFLICT' | 'ROOM_CONFLICT';
  day_of_week: string;
  period_number: number;
  key_id: string; // teacher_id / (class_id+section_id+batch_id) / room_id
  entries: StoredDraftEntry[];
}

export function computeConflicts(entries: StoredDraftEntry[]): ConflictGroup[] {
  const conflicts: ConflictGroup[] = [];

  const byTeacher = new Map<string, StoredDraftEntry[]>();
  const byClass = new Map<string, StoredDraftEntry[]>();
  const byRoom = new Map<string, StoredDraftEntry[]>();

  for (const e of entries) {
    const tKey = key(e.teacher_id, e.day_of_week, e.period_number);
    byTeacher.set(tKey, [...(byTeacher.get(tKey) || []), e]);

    const cKey = key(e.class_id, e.section_id, e.batch_id, e.day_of_week, e.period_number);
    byClass.set(cKey, [...(byClass.get(cKey) || []), e]);

    if (e.room_id) {
      const rKey = key(e.room_id, e.day_of_week, e.period_number);
      byRoom.set(rKey, [...(byRoom.get(rKey) || []), e]);
    }
  }

  byTeacher.forEach((group, k) => {
    if (group.length > 1) {
      const [teacher_id, day_of_week, period_number] = k.split('|');
      conflicts.push({ type: 'TEACHER_CONFLICT', day_of_week, period_number: Number(period_number), key_id: teacher_id, entries: group });
    }
  });
  byClass.forEach((group) => {
    if (group.length > 1) {
      const e0 = group[0];
      conflicts.push({
        type: 'CLASS_CONFLICT',
        day_of_week: e0.day_of_week,
        period_number: e0.period_number,
        key_id: key(e0.class_id, e0.section_id, e0.batch_id),
        entries: group
      });
    }
  });
  byRoom.forEach((group) => {
    if (group.length > 1) {
      const e0 = group[0];
      conflicts.push({ type: 'ROOM_CONFLICT', day_of_week: e0.day_of_week, period_number: e0.period_number, key_id: e0.room_id!, entries: group });
    }
  });

  return conflicts;
}

export interface WorkloadRow {
  teacher_id: string;
  required_hours: number;
  assigned_hours: number;
  remaining_hours: number;
  status: 'Complete' | 'Pending';
}

export function computeWorkload(
  requirements: RequirementInput[],
  assignments: AssignmentInput[],
  entries: StoredDraftEntry[]
): WorkloadRow[] {
  const requiredByTeacher = new Map<string, number>();
  for (const r of requirements) {
    const matches = assignments.filter(
      (a) => a.subject_id === r.subject_id && a.class_id === r.class_id && a.section_id === r.section_id
    );
    for (const m of matches) {
      requiredByTeacher.set(m.teacher_id, (requiredByTeacher.get(m.teacher_id) || 0) + r.periods_per_week);
    }
  }
  const assignedByTeacher = new Map<string, number>();
  for (const e of entries) {
    assignedByTeacher.set(e.teacher_id, (assignedByTeacher.get(e.teacher_id) || 0) + 1);
  }
  const teacherIds = new Set([...requiredByTeacher.keys(), ...assignedByTeacher.keys()]);
  const rows: WorkloadRow[] = [];
  teacherIds.forEach((teacher_id) => {
    const required = requiredByTeacher.get(teacher_id) || 0;
    const assigned = assignedByTeacher.get(teacher_id) || 0;
    rows.push({
      teacher_id,
      required_hours: required,
      assigned_hours: assigned,
      remaining_hours: Math.max(0, required - assigned),
      status: assigned >= required ? 'Complete' : 'Pending'
    });
  });
  return rows;
}
