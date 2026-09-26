import { Router, Response } from 'express';
import { query, queryOne, execute, transaction } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { createNotification } from './notifications';
import { sendPushToUser } from '../services/pushService';
import crypto from 'crypto';
import {
  buildPeriods,
  generateDraftEntries,
  computeConflicts,
  computeWorkload,
  ConfigInput,
  RequirementInput,
  AssignmentInput,
  AvailabilityInput,
  UnavailablePeriodInput,
  StoredDraftEntry
} from '../services/timetableGeneratorEngine';

export const timetableGeneratorRouter = Router();

// Every route here is Campus Administrator only — the generation rules
// themselves live in timetableGeneratorEngine.ts (backend-only, not reachable
// from the frontend), per the requirement that hard constraints can't be bypassed.
const ADMIN_ROLES = ['ADMIN', 'PRINCIPAL'] as const;

function parseWorkingDays(v: any): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

// Academic years for the config-creation dropdown (existing global table, read-only here).
timetableGeneratorRouter.get('/academic-years', authenticate, requireRoles(...ADMIN_ROLES), async (_req: AuthRequest, res: Response) => {
  try {
    const academicYears = await query(`SELECT * FROM academic_years ORDER BY is_current DESC, name DESC`);
    return res.json({ academicYears });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 1. Config management
// ---------------------------------------------------------------------------

// List configs for a branch
timetableGeneratorRouter.get('/configs', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    const configs = await query(
      `SELECT c.*, ay.name as academic_year_name
       FROM timetable_configs c
       LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
       WHERE c.branch_id = $1 ORDER BY c.created_at DESC`,
      [branchId]
    );
    return res.json({ configs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create a config
timetableGeneratorRouter.post('/configs', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const {
      branch_id, academic_year_id, name, working_days,
      college_start_time, college_end_time, period_duration_minutes,
      breaks, use_room_allocation
    } = req.body;

    if (!academic_year_id || !name || !working_days || !college_start_time || !college_end_time || !period_duration_minutes) {
      return res.status(400).json({ error: 'academic_year_id, name, working_days, college_start_time, college_end_time and period_duration_minutes are required.' });
    }

    const branchId = branch_id || req.user!.branch_id;
    const id = 'ttcfg-' + crypto.randomUUID();
    await execute(
      `INSERT INTO timetable_configs
        (id, branch_id, academic_year_id, name, working_days, college_start_time, college_end_time,
         period_duration_minutes, breaks_json, use_room_allocation, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'DRAFT',$11)`,
      [
        id, branchId, academic_year_id, name, parseWorkingDays(working_days).join(','),
        college_start_time, college_end_time, period_duration_minutes,
        JSON.stringify(breaks || []), use_room_allocation === false ? 0 : 1, req.user!.id
      ]
    );

    await logAudit(req, 'TIMETABLE_CONFIG_CREATED', 'timetable_configs', id, { name });
    return res.status(201).json({ success: true, id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get one config with its requirements/availability/unavailable periods
timetableGeneratorRouter.get('/configs/:id', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const config = await queryOne(`SELECT * FROM timetable_configs WHERE id = $1`, [id]);
    if (!config) return res.status(404).json({ error: 'Config not found.' });

    const requirements = await query(
      `SELECT r.*, s.name as subject_name, s.code as subject_code, c.name as class_name, sec.name as section_name
       FROM subject_requirements r
       JOIN subjects s ON r.subject_id = s.id
       JOIN classes c ON r.class_id = c.id
       JOIN sections sec ON r.section_id = sec.id
       WHERE r.config_id = $1`,
      [id]
    );
    const availability = await query(
      `SELECT a.*, u.name as teacher_name, tp.employee_id
       FROM teacher_availability a
       JOIN teacher_profiles tp ON a.teacher_id = tp.id
       JOIN users u ON tp.user_id = u.id
       WHERE a.config_id = $1`,
      [id]
    );
    const unavailablePeriods = await query(`SELECT * FROM teacher_unavailable_periods WHERE config_id = $1`, [id]);
    const drafts = await query(`SELECT * FROM timetable_drafts WHERE config_id = $1 ORDER BY created_at DESC`, [id]);

    return res.json({ config, requirements, availability, unavailablePeriods, drafts });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update config core settings
timetableGeneratorRouter.put('/configs/:id', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name, working_days, college_start_time, college_end_time,
      period_duration_minutes, breaks, use_room_allocation, academic_year_id
    } = req.body;

    await execute(
      `UPDATE timetable_configs SET
        name = COALESCE($1, name),
        working_days = COALESCE($2, working_days),
        college_start_time = COALESCE($3, college_start_time),
        college_end_time = COALESCE($4, college_end_time),
        period_duration_minutes = COALESCE($5, period_duration_minutes),
        breaks_json = COALESCE($6, breaks_json),
        use_room_allocation = COALESCE($7, use_room_allocation),
        academic_year_id = COALESCE($8, academic_year_id)
       WHERE id = $9`,
      [
        name || null, working_days ? parseWorkingDays(working_days).join(',') : null,
        college_start_time || null, college_end_time || null, period_duration_minutes || null,
        breaks ? JSON.stringify(breaks) : null,
        use_room_allocation === undefined ? null : (use_room_allocation ? 1 : 0),
        academic_year_id || null, id
      ]
    );
    await logAudit(req, 'TIMETABLE_CONFIG_UPDATED', 'timetable_configs', id, req.body);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

timetableGeneratorRouter.delete('/configs/:id', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await execute(`DELETE FROM timetable_configs WHERE id = $1`, [id]);
    await logAudit(req, 'TIMETABLE_CONFIG_DELETED', 'timetable_configs', id, {});
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 2. Subject requirements (replace-all per config, submitted as one table)
// ---------------------------------------------------------------------------

timetableGeneratorRouter.put('/configs/:id/requirements', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { requirements } = req.body as { requirements: any[] };
    if (!Array.isArray(requirements)) return res.status(400).json({ error: 'requirements[] is required.' });

    await transaction(async (client) => {
      await client.query(`DELETE FROM subject_requirements WHERE config_id = $1`, [id]);
      for (const r of requirements) {
        const rid = 'ttreq-' + crypto.randomUUID();
        await client.query(
          `INSERT INTO subject_requirements (id, config_id, subject_id, class_id, section_id, periods_per_week, avoid_repeat_same_day)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [rid, id, r.subject_id, r.class_id, r.section_id, r.periods_per_week, r.avoid_repeat_same_day === false ? 0 : 1]
        );
      }
    });

    return res.json({ success: true, count: requirements.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Suggests one requirement row per distinct subject/class/section already taught
// (from teacher_assignments), so the admin isn't starting from a blank table.
timetableGeneratorRouter.get('/configs/:id/suggested-requirements', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const config = await queryOne<{ branch_id: string }>(`SELECT branch_id FROM timetable_configs WHERE id = $1`, [id]);
    if (!config) return res.status(404).json({ error: 'Config not found.' });

    const suggestions = await query(
      `SELECT DISTINCT ta.subject_id, ta.class_id, ta.section_id,
              s.name as subject_name, s.code as subject_code, c.name as class_name, sec.name as section_name
       FROM teacher_assignments ta
       JOIN subjects s ON ta.subject_id = s.id
       JOIN classes c ON ta.class_id = c.id
       JOIN sections sec ON ta.section_id = sec.id
       WHERE c.branch_id = $1`,
      [config.branch_id]
    );
    return res.json({ suggestions: suggestions.map((s: any) => ({ ...s, periods_per_week: 4, avoid_repeat_same_day: true })) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 3. Teacher availability + unavailable periods (replace-all per config)
// ---------------------------------------------------------------------------

timetableGeneratorRouter.put('/configs/:id/availability', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { availability, unavailable_periods } = req.body as { availability: any[]; unavailable_periods: any[] };
    if (!Array.isArray(availability)) return res.status(400).json({ error: 'availability[] is required.' });

    await transaction(async (client) => {
      await client.query(`DELETE FROM teacher_availability WHERE config_id = $1`, [id]);
      for (const a of availability) {
        const aid = 'ttavail-' + crypto.randomUUID();
        await client.query(
          `INSERT INTO teacher_availability (id, config_id, teacher_id, available_days, max_hours_per_week)
           VALUES ($1,$2,$3,$4,$5)`,
          [aid, id, a.teacher_id, parseWorkingDays(a.available_days).join(','), a.max_hours_per_week]
        );
      }
      if (Array.isArray(unavailable_periods)) {
        await client.query(`DELETE FROM teacher_unavailable_periods WHERE config_id = $1`, [id]);
        for (const u of unavailable_periods) {
          const uid = 'ttunavail-' + crypto.randomUUID();
          await client.query(
            `INSERT INTO teacher_unavailable_periods (id, config_id, teacher_id, day_of_week, period_number)
             VALUES ($1,$2,$3,$4,$5)`,
            [uid, id, u.teacher_id, u.day_of_week, u.period_number]
          );
        }
      }
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

timetableGeneratorRouter.get('/configs/:id/suggested-availability', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const config = await queryOne<{ branch_id: string }>(`SELECT branch_id FROM timetable_configs WHERE id = $1`, [id]);
    if (!config) return res.status(404).json({ error: 'Config not found.' });

    const teachers = await query(
      `SELECT DISTINCT tp.id as teacher_id, u.name as teacher_name, tp.employee_id
       FROM teacher_profiles tp
       JOIN users u ON tp.user_id = u.id
       JOIN teacher_assignments ta ON ta.teacher_id = tp.id
       JOIN classes c ON ta.class_id = c.id
       WHERE c.branch_id = $1
       ORDER BY u.name ASC`,
      [config.branch_id]
    );
    return res.json({ suggestions: teachers.map((t: any) => ({ ...t, available_days: [], max_hours_per_week: 20 })) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Rooms/periods preview — lets the admin see the computed period grid (with breaks removed)
// before generating, so start/end/period-duration/break inputs can be sanity-checked.
timetableGeneratorRouter.get('/configs/:id/periods-preview', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const config = await queryOne<any>(`SELECT * FROM timetable_configs WHERE id = $1`, [id]);
    if (!config) return res.status(404).json({ error: 'Config not found.' });
    const periods = buildPeriods(toConfigInput(config));
    return res.json({ periods });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

function toConfigInput(configRow: any): ConfigInput {
  return {
    working_days: parseWorkingDays(configRow.working_days),
    college_start_time: configRow.college_start_time,
    college_end_time: configRow.college_end_time,
    period_duration_minutes: configRow.period_duration_minutes,
    breaks: configRow.breaks_json ? JSON.parse(configRow.breaks_json) : [],
    use_room_allocation: !!configRow.use_room_allocation
  };
}

// ---------------------------------------------------------------------------
// 4. Generation
// ---------------------------------------------------------------------------

async function loadGeneratorInputs(configId: string) {
  const config = await queryOne<any>(`SELECT * FROM timetable_configs WHERE id = $1`, [configId]);
  if (!config) return null;

  const requirementsRaw = await query<any>(`SELECT * FROM subject_requirements WHERE config_id = $1`, [configId]);
  const requirements: RequirementInput[] = requirementsRaw.map((r) => ({
    id: r.id,
    subject_id: r.subject_id,
    class_id: r.class_id,
    section_id: r.section_id,
    periods_per_week: r.periods_per_week,
    avoid_repeat_same_day: !!r.avoid_repeat_same_day
  }));

  const assignmentsRaw = await query<any>(
    `SELECT ta.subject_id, ta.class_id, ta.section_id, ta.batch_id, ta.teacher_id
     FROM teacher_assignments ta
     JOIN classes c ON ta.class_id = c.id
     WHERE c.branch_id = $1`,
    [config.branch_id]
  );
  const assignments: AssignmentInput[] = assignmentsRaw;

  const availabilityRaw = await query<any>(`SELECT teacher_id, available_days, max_hours_per_week FROM teacher_availability WHERE config_id = $1`, [configId]);
  const availability: AvailabilityInput[] = availabilityRaw.map((a) => ({
    teacher_id: a.teacher_id,
    available_days: parseWorkingDays(a.available_days),
    max_hours_per_week: a.max_hours_per_week
  }));

  const unavailablePeriods: UnavailablePeriodInput[] = await query<any>(
    `SELECT teacher_id, day_of_week, period_number FROM teacher_unavailable_periods WHERE config_id = $1`,
    [configId]
  );

  const roomsRaw = await query<any>(`SELECT id FROM rooms WHERE branch_id = $1`, [config.branch_id]);
  const roomIds: string[] = roomsRaw.map((r) => r.id);

  return { config, requirements, assignments, availability, unavailablePeriods, roomIds };
}

timetableGeneratorRouter.post('/configs/:id/generate', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const inputs = await loadGeneratorInputs(id);
    if (!inputs) return res.status(404).json({ error: 'Config not found.' });
    if (inputs.requirements.length === 0) {
      return res.status(400).json({ error: 'Add at least one subject requirement before generating.' });
    }

    const { entries, issues } = generateDraftEntries(
      toConfigInput(inputs.config),
      inputs.requirements,
      inputs.assignments,
      inputs.availability,
      inputs.unavailablePeriods,
      inputs.roomIds
    );

    const draftId = 'ttdraft-' + crypto.randomUUID();
    const status = issues.length > 0 ? 'CONFLICTS_FOUND' : 'GENERATED';

    await transaction(async (client) => {
      await client.query(
        `INSERT INTO timetable_drafts (id, config_id, status, issues_json, generated_at)
         VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP)`,
        [draftId, id, status, JSON.stringify(issues)]
      );
      for (const e of entries) {
        const eid = 'ttentry-' + crypto.randomUUID();
        await client.query(
          `INSERT INTO timetable_draft_entries
            (id, draft_id, day_of_week, period_number, start_time, end_time, subject_id, class_id, section_id, batch_id, room_id, teacher_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [eid, draftId, e.day_of_week, e.period_number, e.start_time, e.end_time, e.subject_id, e.class_id, e.section_id, e.batch_id, e.room_id, e.teacher_id]
        );
      }
    });

    await logAudit(req, 'TIMETABLE_GENERATED', 'timetable_drafts', draftId, { config_id: id, entries: entries.length, issues: issues.length });
    return res.status(201).json({ success: true, draftId, status, entriesCreated: entries.length, issues });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Regenerate only the units behind current conflicts/issues, leaving the rest of
// the draft untouched — "the administrator should not have to regenerate the
// entire timetable when only one teacher/class conflict needs to be fixed."
timetableGeneratorRouter.post('/drafts/:id/regenerate-conflicts', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const draft = await queryOne<any>(`SELECT * FROM timetable_drafts WHERE id = $1`, [id]);
    if (!draft) return res.status(404).json({ error: 'Draft not found.' });

    const inputs = await loadGeneratorInputs(draft.config_id);
    if (!inputs) return res.status(404).json({ error: 'Config not found.' });

    const allEntries: StoredDraftEntry[] = await query(`SELECT * FROM timetable_draft_entries WHERE draft_id = $1`, [id]);
    const conflicts = computeConflicts(allEntries);
    const conflictingIds = new Set<string>();
    conflicts.forEach((c) => c.entries.forEach((e) => conflictingIds.add(e.id)));

    if (conflictingIds.size === 0) {
      return res.json({ success: true, message: 'No conflicts to regenerate.', regenerated: 0 });
    }

    // Rebuild occupancy trackers from every entry NOT being regenerated, then
    // re-run placement only for the freed units, so the rest of the week is undisturbed.
    const keep = allEntries.filter((e) => !conflictingIds.has(e.id));
    const toRegenerate = allEntries.filter((e) => conflictingIds.has(e.id));

    // Build a synthetic single-config generation pass seeded with `keep` as already-placed,
    // by reusing the engine on just the units that need re-placing.
    const requirementsForRegen = inputs.requirements.filter((r) =>
      toRegenerate.some((e) => e.class_id === r.class_id && e.section_id === r.section_id && e.subject_id === r.subject_id)
    );

    let newEntries: StoredDraftEntry[] = [];
    let newIssues: any[] = [];
    await transaction(async (client) => {
      await client.query(`DELETE FROM timetable_draft_entries WHERE id = ANY($1::text[])`, [[...conflictingIds]]);

      // Re-generate against the requirements touched by conflicts, but only counting
      // periods still missing (already-kept periods for that unit count toward periods_per_week).
      const adjustedRequirements: RequirementInput[] = requirementsForRegen.map((r) => {
        const alreadyKept = keep.filter(
          (e) => e.class_id === r.class_id && e.section_id === r.section_id && e.subject_id === r.subject_id
        ).length;
        return { ...r, periods_per_week: Math.max(0, r.periods_per_week - alreadyKept) };
      }).filter((r) => r.periods_per_week > 0);

      const generated = generateDraftEntries(
        toConfigInput(inputs.config),
        adjustedRequirements,
        inputs.assignments,
        inputs.availability,
        inputs.unavailablePeriods,
        inputs.roomIds
      );

      for (const e of generated.entries) {
        const eid = 'ttentry-' + crypto.randomUUID();
        await client.query(
          `INSERT INTO timetable_draft_entries
            (id, draft_id, day_of_week, period_number, start_time, end_time, subject_id, class_id, section_id, batch_id, room_id, teacher_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [eid, id, e.day_of_week, e.period_number, e.start_time, e.end_time, e.subject_id, e.class_id, e.section_id, e.batch_id, e.room_id, e.teacher_id]
        );
      }
      newEntries = generated.entries as any;
      newIssues = generated.issues;

      const remainingEntries = await client.query(`SELECT * FROM timetable_draft_entries WHERE draft_id = $1`, [id]);
      const remainingConflicts = computeConflicts(remainingEntries.rows);
      const status = remainingConflicts.length > 0 || newIssues.length > 0 ? 'CONFLICTS_FOUND' : 'GENERATED';
      await client.query(`UPDATE timetable_drafts SET status = $1, issues_json = $2 WHERE id = $3`, [status, JSON.stringify(newIssues), id]);
    });

    await logAudit(req, 'TIMETABLE_REGENERATED_CONFLICTS', 'timetable_drafts', id, { regenerated: conflictingIds.size });
    return res.json({ success: true, regenerated: conflictingIds.size, newEntries: newEntries.length, issues: newIssues });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 5. Draft views: raw entries, conflicts, workload
// ---------------------------------------------------------------------------

timetableGeneratorRouter.get('/drafts/:id', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const draft = await queryOne<any>(`SELECT * FROM timetable_drafts WHERE id = $1`, [id]);
    if (!draft) return res.status(404).json({ error: 'Draft not found.' });

    const entries = await query(
      `SELECT de.*, s.name as subject_name, s.code as subject_code,
              c.name as class_name, sec.name as section_name, b.name as batch_name,
              r.room_number, u.name as teacher_name, tp.employee_id
       FROM timetable_draft_entries de
       JOIN subjects s ON de.subject_id = s.id
       JOIN classes c ON de.class_id = c.id
       JOIN sections sec ON de.section_id = sec.id
       JOIN batches b ON de.batch_id = b.id
       LEFT JOIN rooms r ON de.room_id = r.id
       JOIN teacher_profiles tp ON de.teacher_id = tp.id
       JOIN users u ON tp.user_id = u.id
       WHERE de.draft_id = $1
       ORDER BY
         CASE de.day_of_week WHEN 'MONDAY' THEN 1 WHEN 'TUESDAY' THEN 2 WHEN 'WEDNESDAY' THEN 3
              WHEN 'THURSDAY' THEN 4 WHEN 'FRIDAY' THEN 5 WHEN 'SATURDAY' THEN 6 ELSE 7 END,
         de.period_number ASC`,
      [id]
    );

    return res.json({ draft, entries, issues: draft.issues_json ? JSON.parse(draft.issues_json) : [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

timetableGeneratorRouter.get('/drafts/:id/conflicts', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const entries: StoredDraftEntry[] = await query(`SELECT * FROM timetable_draft_entries WHERE draft_id = $1`, [id]);
    const conflicts = computeConflicts(entries);

    // Enrich with display names for the UI (teacher/class/subject).
    const enriched = await Promise.all(
      conflicts.map(async (c) => {
        const entryDetails = await Promise.all(
          c.entries.map((e) =>
            queryOne(
              `SELECT de.*, s.name as subject_name, c.name as class_name, sec.name as section_name, u.name as teacher_name
               FROM timetable_draft_entries de
               JOIN subjects s ON de.subject_id = s.id
               JOIN classes c ON de.class_id = c.id
               JOIN sections sec ON de.section_id = sec.id
               JOIN teacher_profiles tp ON de.teacher_id = tp.id
               JOIN users u ON tp.user_id = u.id
               WHERE de.id = $1`,
              [e.id]
            )
          )
        );
        return { ...c, entries: entryDetails };
      })
    );

    const draft = await queryOne<any>(`SELECT issues_json FROM timetable_drafts WHERE id = $1`, [id]);
    return res.json({ conflicts: enriched, issues: draft?.issues_json ? JSON.parse(draft.issues_json) : [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

timetableGeneratorRouter.get('/drafts/:id/workload', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const draft = await queryOne<any>(`SELECT * FROM timetable_drafts WHERE id = $1`, [id]);
    if (!draft) return res.status(404).json({ error: 'Draft not found.' });

    const inputs = await loadGeneratorInputs(draft.config_id);
    if (!inputs) return res.status(404).json({ error: 'Config not found.' });

    const entries: StoredDraftEntry[] = await query(`SELECT * FROM timetable_draft_entries WHERE draft_id = $1`, [id]);
    const workload = computeWorkload(inputs.requirements, inputs.assignments, entries);

    const teacherIds = workload.map((w) => w.teacher_id);
    const teacherNames = teacherIds.length
      ? await query(
          `SELECT tp.id, u.name FROM teacher_profiles tp JOIN users u ON tp.user_id = u.id WHERE tp.id = ANY($1::text[])`,
          [teacherIds]
        )
      : [];
    const nameMap = new Map(teacherNames.map((t: any) => [t.id, t.name]));

    return res.json({ workload: workload.map((w) => ({ ...w, teacher_name: nameMap.get(w.teacher_id) || 'Unknown' })) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 6. Manual editing — every change is validated against hard constraints
//    before it's allowed to save.
// ---------------------------------------------------------------------------

timetableGeneratorRouter.put('/drafts/:draftId/entries/:entryId', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { draftId, entryId } = req.params;
    const existing = await queryOne<any>(`SELECT * FROM timetable_draft_entries WHERE id = $1 AND draft_id = $2`, [entryId, draftId]);
    if (!existing) return res.status(404).json({ error: 'Entry not found.' });

    const updated = { ...existing, ...req.body };

    const others: StoredDraftEntry[] = await query(`SELECT * FROM timetable_draft_entries WHERE draft_id = $1 AND id != $2`, [draftId, entryId]);
    const wouldBeConflicts = computeConflicts([...others, updated as StoredDraftEntry]).filter((c) =>
      c.entries.some((e) => e.id === entryId)
    );
    if (wouldBeConflicts.length > 0) {
      return res.status(409).json({
        error: 'This change conflicts with an existing hard constraint (teacher, class, or room already booked at that time).',
        conflicts: wouldBeConflicts
      });
    }

    await execute(
      `UPDATE timetable_draft_entries SET
        day_of_week = $1, period_number = $2, start_time = $3, end_time = $4,
        subject_id = $5, class_id = $6, section_id = $7, batch_id = $8, room_id = $9, teacher_id = $10
       WHERE id = $11`,
      [
        updated.day_of_week, updated.period_number, updated.start_time, updated.end_time,
        updated.subject_id, updated.class_id, updated.section_id, updated.batch_id, updated.room_id || null, updated.teacher_id,
        entryId
      ]
    );

    const allEntries: StoredDraftEntry[] = await query(`SELECT * FROM timetable_draft_entries WHERE draft_id = $1`, [draftId]);
    const remainingConflicts = computeConflicts(allEntries);
    const draft = await queryOne<any>(`SELECT issues_json FROM timetable_drafts WHERE id = $1`, [draftId]);
    const issues = draft?.issues_json ? JSON.parse(draft.issues_json) : [];
    const status = remainingConflicts.length > 0 || issues.length > 0 ? 'CONFLICTS_FOUND' : 'GENERATED';
    await execute(`UPDATE timetable_drafts SET status = $1 WHERE id = $2`, [status, draftId]);

    await logAudit(req, 'TIMETABLE_ENTRY_EDITED', 'timetable_draft_entries', entryId, req.body);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

timetableGeneratorRouter.post('/drafts/:draftId/entries', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { draftId } = req.params;
    const body = req.body;
    const others: StoredDraftEntry[] = await query(`SELECT * FROM timetable_draft_entries WHERE draft_id = $1`, [draftId]);
    const candidate = { id: 'candidate', ...body };
    const wouldBeConflicts = computeConflicts([...others, candidate]).filter((c) => c.entries.some((e) => e.id === 'candidate'));
    if (wouldBeConflicts.length > 0) {
      return res.status(409).json({ error: 'This slot conflicts with an existing hard constraint.', conflicts: wouldBeConflicts });
    }

    const eid = 'ttentry-' + crypto.randomUUID();
    await execute(
      `INSERT INTO timetable_draft_entries
        (id, draft_id, day_of_week, period_number, start_time, end_time, subject_id, class_id, section_id, batch_id, room_id, teacher_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [eid, draftId, body.day_of_week, body.period_number, body.start_time, body.end_time, body.subject_id, body.class_id, body.section_id, body.batch_id, body.room_id || null, body.teacher_id]
    );
    await logAudit(req, 'TIMETABLE_ENTRY_ADDED', 'timetable_draft_entries', eid, body);
    return res.status(201).json({ success: true, id: eid });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

timetableGeneratorRouter.delete('/drafts/:draftId/entries/:entryId', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { entryId } = req.params;
    await execute(`DELETE FROM timetable_draft_entries WHERE id = $1`, [entryId]);
    await logAudit(req, 'TIMETABLE_ENTRY_REMOVED', 'timetable_draft_entries', entryId, {});
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 7. Status lifecycle: mark ready + publish
// ---------------------------------------------------------------------------

timetableGeneratorRouter.post('/drafts/:id/mark-ready', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const entries: StoredDraftEntry[] = await query(`SELECT * FROM timetable_draft_entries WHERE draft_id = $1`, [id]);
    const conflicts = computeConflicts(entries);
    const draft = await queryOne<any>(`SELECT issues_json FROM timetable_drafts WHERE id = $1`, [id]);
    const issues = draft?.issues_json ? JSON.parse(draft.issues_json) : [];
    if (conflicts.length > 0 || issues.length > 0) {
      return res.status(400).json({ error: 'Cannot mark ready — unresolved conflicts or unfulfilled subject hours remain.', conflicts, issues });
    }
    await execute(`UPDATE timetable_drafts SET status = 'READY_FOR_APPROVAL' WHERE id = $1`, [id]);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Publishing copies the draft's entries into the live timetable_entries table,
// scoped only to the class/sections this draft actually covers — every other
// class's existing schedule is left untouched. Teachers' existing "My Timetable"
// page and the substitution center keep reading timetable_entries as-is.
timetableGeneratorRouter.post('/drafts/:id/publish', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const draft = await queryOne<any>(`SELECT * FROM timetable_drafts WHERE id = $1`, [id]);
    if (!draft) return res.status(404).json({ error: 'Draft not found.' });

    const config = await queryOne<any>(`SELECT * FROM timetable_configs WHERE id = $1`, [draft.config_id]);
    if (!config) return res.status(404).json({ error: 'Config not found.' });

    const entries: any[] = await query(`SELECT * FROM timetable_draft_entries WHERE draft_id = $1`, [id]);
    if (entries.length === 0) return res.status(400).json({ error: 'This draft has no entries to publish.' });

    const conflicts = computeConflicts(entries);
    if (conflicts.length > 0) {
      return res.status(400).json({ error: 'Cannot publish while conflicts remain unresolved.', conflicts });
    }

    const classSectionPairs = [...new Set(entries.map((e) => `${e.class_id}::${e.section_id}`))].map((s) => s.split('::'));

    // Snapshot which teachers had periods on the classes this draft touches, so we can
    // notify everyone whose schedule changed (including a teacher who was removed).
    const previouslyAffected = await query<any>(
      `SELECT DISTINCT teacher_id FROM timetable_entries WHERE branch_id = $1 AND (${classSectionPairs
        .map((_, i) => `(class_id = $${i * 2 + 2} AND section_id = $${i * 2 + 3})`)
        .join(' OR ')})`,
      [config.branch_id, ...classSectionPairs.flat()]
    );

    await transaction(async (client) => {
      for (const [classId, sectionId] of classSectionPairs) {
        await client.query(`DELETE FROM timetable_entries WHERE branch_id = $1 AND class_id = $2 AND section_id = $3`, [
          config.branch_id, classId, sectionId
        ]);
      }
      for (const e of entries) {
        const newId = 'tte-' + crypto.randomUUID();
        await client.query(
          `INSERT INTO timetable_entries
            (id, branch_id, day_of_week, period_number, start_time, end_time, subject_id, class_id, section_id, batch_id, room_id, teacher_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            newId, config.branch_id, e.day_of_week, e.period_number, e.start_time, e.end_time,
            e.subject_id, e.class_id, e.section_id, e.batch_id, e.room_id, e.teacher_id
          ]
        );
      }
      await client.query(
        `UPDATE timetable_drafts SET status = 'PUBLISHED', published_at = CURRENT_TIMESTAMP, published_by = $1 WHERE id = $2`,
        [req.user!.id, id]
      );
    });

    // Notify every affected teacher (newly scheduled or previously scheduled on these classes).
    const newlyAffectedIds = [...new Set(entries.map((e) => e.teacher_id as string))];
    const allAffectedIds = [...new Set([...newlyAffectedIds, ...previouslyAffected.map((t) => t.teacher_id)])];

    const dayLabel = (d: string) => d.charAt(0) + d.slice(1).toLowerCase();
    for (const teacherId of allAffectedIds) {
      const teacherUser = await queryOne<any>(`SELECT u.id as user_id FROM teacher_profiles tp JOIN users u ON tp.user_id = u.id WHERE tp.id = $1`, [teacherId]);
      if (!teacherUser) continue;

      const sample = entries.find((e) => e.teacher_id === teacherId);
      let message = 'Your timetable has been updated.';
      if (sample) {
        const subj = await queryOne<any>(`SELECT name FROM subjects WHERE id = $1`, [sample.subject_id]);
        const cls = await queryOne<any>(`SELECT name FROM classes WHERE id = $1`, [sample.class_id]);
        const sec = await queryOne<any>(`SELECT name FROM sections WHERE id = $1`, [sample.section_id]);
        message = `Your timetable has been updated. ${dayLabel(sample.day_of_week)} ${sample.start_time}: ${subj?.name || ''} — ${cls?.name || ''}${sec?.name || ''}.`;
      }
      await createNotification(teacherUser.user_id, 'Timetable Updated', message, 'timetable');
      // Real OS/browser push in addition to the in-app bell notification above,
      // so the teacher is notified even if the site/PWA isn't open.
      await sendPushToUser(teacherUser.user_id, {
        title: 'Timetable Updated',
        body: message,
        data: { type: 'timetable', id }
      });
    }

    await logAudit(req, 'TIMETABLE_PUBLISHED', 'timetable_drafts', id, { config_id: draft.config_id, entries: entries.length, notified: allAffectedIds.length });
    return res.json({ success: true, entriesPublished: entries.length, teachersNotified: allAffectedIds.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
