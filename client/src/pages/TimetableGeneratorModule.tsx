import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  CalendarClock, Plus, Settings2, Users, BookOpen, Play, RefreshCw,
  AlertTriangle, CheckCircle2, Send, Trash2, ArrowLeft, ClipboardList
} from 'lucide-react';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const dayLabel = (d: string) => (d ? d.charAt(0) + d.slice(1).toLowerCase() : d);

const inputCls = 'w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-400';
const cardCls = 'bg-white rounded-2xl border border-slate-200 shadow-xs';
const btnPrimary = 'inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition press';
const btnSecondary = 'inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition press';

type ViewMode = 'list' | 'editor';
type EditorTab = 'settings' | 'requirements' | 'availability' | 'draft';

export const TimetableGeneratorModule: React.FC = () => {
  const { user } = useAuth();
  const [view, setView] = useState<ViewMode>('list');
  const [configs, setConfigs] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [unavailablePeriods, setUnavailablePeriods] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [editorTab, setEditorTab] = useState<EditorTab>('settings');

  const [meta, setMeta] = useState<any>({ classes: [], sections: [], batches: [], departments: [], subjects: [], rooms: [] });
  const [teachers, setTeachers] = useState<any[]>([]);

  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [draftEntries, setDraftEntries] = useState<any[]>([]);
  const [draftIssues, setDraftIssues] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [workload, setWorkload] = useState<any[]>([]);
  const [draftViewBy, setDraftViewBy] = useState<'day' | 'class' | 'teacher' | 'subject'>('day');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const branchId = user?.branch_id || 'branch-smg';

  useEffect(() => {
    loadList();
    loadMeta();
  }, []);

  const loadList = async () => {
    setIsLoading(true);
    try {
      const [configsRes, yearsRes] = await Promise.all([
        apiFetch<any>(`/timetable-generator/configs?branch_id=${branchId}`),
        apiFetch<any>(`/timetable-generator/academic-years`)
      ]);
      setConfigs(configsRes.configs || []);
      setAcademicYears(yearsRes.academicYears || []);
    } catch (err) {
      console.error('Failed to load timetable configs', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMeta = async () => {
    try {
      const [metaRes, teachersRes] = await Promise.all([
        apiFetch<any>(`/branches/${branchId}/meta`),
        apiFetch<any>(`/teachers?branch_id=${branchId}`)
      ]);
      setMeta(metaRes);
      setTeachers(teachersRes.teachers || []);
    } catch (err) {
      console.error('Failed to load meta', err);
    }
  };

  const openConfig = async (id: string) => {
    setActiveConfigId(id);
    setView('editor');
    setEditorTab('settings');
    await refreshConfig(id);
  };

  const refreshConfig = async (id: string) => {
    try {
      const res = await apiFetch<any>(`/timetable-generator/configs/${id}`);
      setConfig(res.config);
      setRequirements(res.requirements || []);
      setAvailability(res.availability || []);
      setUnavailablePeriods(res.unavailablePeriods || []);
      setDrafts(res.drafts || []);
      if (res.drafts && res.drafts.length > 0) {
        await openDraft(res.drafts[0].id);
      }
    } catch (err) {
      console.error('Failed to load config', err);
    }
  };

  const createConfig = async () => {
    const name = window.prompt('Name this timetable configuration (e.g. "2026-27 Odd Semester"):');
    if (!name) return;
    if (academicYears.length === 0) {
      alert('No academic years found. Add one first.');
      return;
    }
    try {
      const res = await apiFetch<any>('/timetable-generator/configs', {
        method: 'POST',
        body: JSON.stringify({
          branch_id: branchId,
          academic_year_id: academicYears[0].id,
          name,
          working_days: DAYS.slice(0, 6),
          college_start_time: '09:00',
          college_end_time: '16:00',
          period_duration_minutes: 45,
          breaks: [{ after_period: 3, label: 'Lunch Break' }],
          use_room_allocation: true
        })
      });
      await loadList();
      await openConfig(res.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const deleteConfig = async (id: string) => {
    if (!window.confirm('Delete this timetable configuration and all its drafts? This cannot be undone.')) return;
    try {
      await apiFetch(`/timetable-generator/configs/${id}`, { method: 'DELETE' });
      await loadList();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const saveSettings = async () => {
    try {
      await apiFetch(`/timetable-generator/configs/${activeConfigId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: config.name,
          working_days: config.working_days,
          college_start_time: config.college_start_time,
          college_end_time: config.college_end_time,
          period_duration_minutes: Number(config.period_duration_minutes),
          use_room_allocation: !!config.use_room_allocation
        })
      });
      alert('Settings saved.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const loadSuggestedRequirements = async () => {
    try {
      const res = await apiFetch<any>(`/timetable-generator/configs/${activeConfigId}/suggested-requirements`);
      const existingKeys = new Set(requirements.map((r) => `${r.subject_id}|${r.class_id}|${r.section_id}`));
      const additions = (res.suggestions || []).filter((s: any) => !existingKeys.has(`${s.subject_id}|${s.class_id}|${s.section_id}`));
      setRequirements([...requirements, ...additions]);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const saveRequirements = async () => {
    try {
      await apiFetch(`/timetable-generator/configs/${activeConfigId}/requirements`, {
        method: 'PUT',
        body: JSON.stringify({ requirements })
      });
      alert('Subject requirements saved.');
      await refreshConfig(activeConfigId!);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const loadSuggestedAvailability = async () => {
    try {
      const res = await apiFetch<any>(`/timetable-generator/configs/${activeConfigId}/suggested-availability`);
      const existingIds = new Set(availability.map((a) => a.teacher_id));
      const additions = (res.suggestions || []).map((s: any) => ({ ...s, available_days: config?.working_days || DAYS.slice(0, 6) })).filter((s: any) => !existingIds.has(s.teacher_id));
      setAvailability([...availability, ...additions]);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const saveAvailability = async () => {
    try {
      await apiFetch(`/timetable-generator/configs/${activeConfigId}/availability`, {
        method: 'PUT',
        body: JSON.stringify({ availability, unavailable_periods: unavailablePeriods })
      });
      alert('Teacher availability saved.');
      await refreshConfig(activeConfigId!);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const generateTimetable = async () => {
    if (!window.confirm('Generate the timetable now? This creates a new draft — it will not touch the currently published schedule.')) return;
    setIsGenerating(true);
    try {
      const res = await apiFetch<any>(`/timetable-generator/configs/${activeConfigId}/generate`, { method: 'POST' });
      setEditorTab('draft');
      await refreshConfig(activeConfigId!);
      await openDraft(res.draftId);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const openDraft = async (draftId: string) => {
    setActiveDraftId(draftId);
    try {
      const [draftRes, conflictsRes, workloadRes] = await Promise.all([
        apiFetch<any>(`/timetable-generator/drafts/${draftId}`),
        apiFetch<any>(`/timetable-generator/drafts/${draftId}/conflicts`),
        apiFetch<any>(`/timetable-generator/drafts/${draftId}/workload`)
      ]);
      setDraftEntries(draftRes.entries || []);
      setDraftIssues(draftRes.issues || []);
      setConflicts(conflictsRes.conflicts || []);
      setWorkload(workloadRes.workload || []);
    } catch (err) {
      console.error('Failed to load draft', err);
    }
  };

  const regenerateConflicts = async () => {
    if (!activeDraftId) return;
    try {
      const res = await apiFetch<any>(`/timetable-generator/drafts/${activeDraftId}/regenerate-conflicts`, { method: 'POST' });
      alert(`Regenerated ${res.regenerated} conflicting period(s).`);
      await openDraft(activeDraftId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const publishDraft = async () => {
    if (!activeDraftId) return;
    if (!window.confirm('Publish this timetable? It becomes visible to teachers immediately and replaces the current schedule for the classes/sections it covers.')) return;
    setIsPublishing(true);
    try {
      const res = await apiFetch<any>(`/timetable-generator/drafts/${activeDraftId}/publish`, { method: 'POST' });
      alert(`Published ${res.entriesPublished} periods. ${res.teachersNotified} teacher(s) notified.`);
      await refreshConfig(activeConfigId!);
    } catch (err: any) {
      alert(err.message + (err.message.includes('conflict') ? ' Resolve conflicts first.' : ''));
    } finally {
      setIsPublishing(false);
    }
  };

  const updateEntry = async (entryId: string, patch: any) => {
    try {
      await apiFetch(`/timetable-generator/drafts/${activeDraftId}/entries/${entryId}`, { method: 'PUT', body: JSON.stringify(patch) });
      await openDraft(activeDraftId!);
    } catch (err: any) {
      alert(err.error || err.message);
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!window.confirm('Remove this period from the draft?')) return;
    try {
      await apiFetch(`/timetable-generator/drafts/${activeDraftId}/entries/${entryId}`, { method: 'DELETE' });
      await openDraft(activeDraftId!);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const workingDaysArr: string[] = Array.isArray(config?.working_days) ? config.working_days : (config?.working_days || '').split(',').filter(Boolean);

  // ---- LIST VIEW -------------------------------------------------------
  if (view === 'list') {
    return (
      <div className="space-y-6">
        <div className={`${cardCls} p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
          <div className="flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-indigo-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Timetable Generator</h1>
              <p className="text-xs text-slate-500 mt-0.5">Constraint-based automatic scheduling for classes, sections and teachers.</p>
            </div>
          </div>
          <button onClick={createConfig} className={btnPrimary}>
            <Plus className="w-4 h-4" /> New Configuration
          </button>
        </div>

        <div className={`${cardCls} overflow-hidden`}>
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading configurations…</div>
          ) : configs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No timetable configurations yet. Create one to get started.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {configs.map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition">
                  <button onClick={() => openConfig(c.id)} className="text-left flex-1">
                    <div className="text-sm font-semibold text-slate-900">{c.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {c.academic_year_name || 'No academic year'} • {c.college_start_time}–{c.college_end_time} • {c.period_duration_minutes}min periods
                    </div>
                  </button>
                  <button onClick={() => deleteConfig(c.id)} className="p-2 text-slate-400 hover:text-red-600 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- EDITOR VIEW -------------------------------------------------------
  return (
    <div className="space-y-6">
      <div className={`${cardCls} p-4 flex items-center gap-3`}>
        <button onClick={() => setView('list')} className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-slate-900">{config?.name}</h1>
          <p className="text-xs text-slate-500">{config?.status === 'ACTIVE' ? 'Active configuration' : 'Draft configuration'}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'settings', label: 'Settings', icon: Settings2 },
          { id: 'requirements', label: 'Subject Requirements', icon: BookOpen },
          { id: 'availability', label: 'Teacher Availability', icon: Users },
          { id: 'draft', label: 'Generated Timetable', icon: ClipboardList }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setEditorTab(t.id as EditorTab)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition press ${
              editorTab === t.id ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {editorTab === 'settings' && config && (
        <div className={`${cardCls} p-6 space-y-4 max-w-xl`}>
          <div>
            <label className="text-xs font-semibold text-slate-600">Configuration Name</label>
            <input className={inputCls} value={config.name} onChange={(e) => setConfig({ ...config, name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Working Days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => {
                const on = workingDaysArr.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      const next = on ? workingDaysArr.filter((x) => x !== d) : [...workingDaysArr, d];
                      setConfig({ ...config, working_days: next });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition press ${on ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {dayLabel(d).slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">College Start Time</label>
              <input type="time" className={inputCls} value={config.college_start_time} onChange={(e) => setConfig({ ...config, college_start_time: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">College End Time</label>
              <input type="time" className={inputCls} value={config.college_end_time} onChange={(e) => setConfig({ ...config, college_end_time: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Period Duration (minutes)</label>
              <input type="number" className={inputCls} value={config.period_duration_minutes} onChange={(e) => setConfig({ ...config, period_duration_minutes: e.target.value })} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input type="checkbox" checked={!!config.use_room_allocation} onChange={(e) => setConfig({ ...config, use_room_allocation: e.target.checked })} />
                Enforce room allocation
              </label>
            </div>
          </div>
          <button onClick={saveSettings} className={btnPrimary}>Save Settings</button>
        </div>
      )}

      {editorTab === 'requirements' && (
        <div className={`${cardCls} p-6 space-y-4`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Subject Hours Required Per Week</h2>
            <div className="flex gap-2">
              <button onClick={loadSuggestedRequirements} className={btnSecondary}>Suggest From Assignments</button>
              <button onClick={() => setRequirements([...requirements, { subject_id: '', class_id: '', section_id: '', periods_per_week: 4, avoid_repeat_same_day: true }])} className={btnSecondary}>
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-2 pr-2">Class</th><th className="py-2 pr-2">Section</th><th className="py-2 pr-2">Subject</th>
                  <th className="py-2 pr-2">Periods/Week</th><th className="py-2 pr-2">Avoid Repeat/Day</th><th></th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((r, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-1.5 pr-2">
                      <select className={inputCls} value={r.class_id} onChange={(e) => { const next = [...requirements]; next[i] = { ...r, class_id: e.target.value }; setRequirements(next); }}>
                        <option value="">Select</option>
                        {meta.classes?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <select className={inputCls} value={r.section_id} onChange={(e) => { const next = [...requirements]; next[i] = { ...r, section_id: e.target.value }; setRequirements(next); }}>
                        <option value="">Select</option>
                        {meta.sections?.filter((s: any) => s.class_id === r.class_id).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <select className={inputCls} value={r.subject_id} onChange={(e) => { const next = [...requirements]; next[i] = { ...r, subject_id: e.target.value }; setRequirements(next); }}>
                        <option value="">Select</option>
                        {meta.subjects?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <input type="number" className={inputCls} style={{ width: 70 }} value={r.periods_per_week} onChange={(e) => { const next = [...requirements]; next[i] = { ...r, periods_per_week: Number(e.target.value) }; setRequirements(next); }} />
                    </td>
                    <td className="py-1.5 pr-2 text-center">
                      <input type="checkbox" checked={!!r.avoid_repeat_same_day} onChange={(e) => { const next = [...requirements]; next[i] = { ...r, avoid_repeat_same_day: e.target.checked }; setRequirements(next); }} />
                    </td>
                    <td><button onClick={() => setRequirements(requirements.filter((_, idx) => idx !== i))} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={saveRequirements} className={btnPrimary}>Save Requirements</button>
        </div>
      )}

      {editorTab === 'availability' && (
        <div className={`${cardCls} p-6 space-y-4`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Teacher Availability & Weekly Hour Cap</h2>
            <div className="flex gap-2">
              <button onClick={loadSuggestedAvailability} className={btnSecondary}>Suggest All Teachers</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-2 pr-2">Teacher</th><th className="py-2 pr-2">Available Days</th><th className="py-2 pr-2">Max Hours/Week</th>
                </tr>
              </thead>
              <tbody>
                {availability.map((a, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-1.5 pr-2 font-medium text-slate-800">{a.teacher_name || teachers.find((t: any) => t.id === a.teacher_id)?.name}</td>
                    <td className="py-1.5 pr-2">
                      <div className="flex flex-wrap gap-1">
                        {(workingDaysArr.length ? workingDaysArr : DAYS).map((d) => {
                          const days: string[] = Array.isArray(a.available_days) ? a.available_days : (a.available_days || '').split(',').filter(Boolean);
                          const on = days.includes(d);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => {
                                const next = [...availability];
                                const curDays = Array.isArray(a.available_days) ? a.available_days : (a.available_days || '').split(',').filter(Boolean);
                                next[i] = { ...a, available_days: on ? curDays.filter((x: string) => x !== d) : [...curDays, d] };
                                setAvailability(next);
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${on ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                            >
                              {dayLabel(d).slice(0, 3)}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-1.5 pr-2">
                      <input type="number" className={inputCls} style={{ width: 70 }} value={a.max_hours_per_week} onChange={(e) => { const next = [...availability]; next[i] = { ...a, max_hours_per_week: Number(e.target.value) }; setAvailability(next); }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={saveAvailability} className={btnPrimary}>Save Availability</button>
        </div>
      )}

      {editorTab === 'draft' && (
        <div className="space-y-4">
          <div className={`${cardCls} p-4 flex flex-wrap items-center gap-3 justify-between`}>
            <div className="flex items-center gap-2">
              {drafts.length > 0 && (
                <select className={inputCls} style={{ width: 200 }} value={activeDraftId || ''} onChange={(e) => openDraft(e.target.value)}>
                  {drafts.map((d) => <option key={d.id} value={d.id}>{d.status} — {new Date(d.created_at).toLocaleString()}</option>)}
                </select>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={generateTimetable} disabled={isGenerating} className={btnPrimary}>
                <Play className="w-3.5 h-3.5" /> {isGenerating ? 'Generating…' : 'Generate Timetable'}
              </button>
              {activeDraftId && (
                <>
                  <button onClick={regenerateConflicts} className={btnSecondary}><RefreshCw className="w-3.5 h-3.5" /> Regenerate Conflicting Classes</button>
                  <button onClick={publishDraft} disabled={isPublishing} className={btnPrimary}>
                    <Send className="w-3.5 h-3.5" /> {isPublishing ? 'Publishing…' : 'Publish'}
                  </button>
                </>
              )}
            </div>
          </div>

          {activeDraftId && (
            <>
              {(conflicts.length > 0 || draftIssues.length > 0) && (
                <div className={`${cardCls} p-4 border-amber-200 bg-amber-50/40`}>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-900">Conflicts & Unresolved Issues</h3>
                  </div>
                  <div className="space-y-3">
                    {conflicts.map((c, i) => (
                      <div key={i} className="bg-white border border-amber-200 rounded-xl p-3 text-xs">
                        <div className="font-semibold text-slate-800 mb-1">
                          {c.type === 'TEACHER_CONFLICT' ? `Teacher Conflict — ${c.entries[0]?.teacher_name}` : c.type === 'ROOM_CONFLICT' ? 'Room Conflict' : 'Class Conflict'}
                        </div>
                        {c.entries.map((e: any, j: number) => (
                          <div key={j} className="text-slate-600">
                            {dayLabel(e.day_of_week)} {e.start_time}–{e.end_time} — {e.class_name}{e.section_name} — {e.subject_name}
                          </div>
                        ))}
                        <div className="text-red-600 font-semibold mt-1">Status: CONFLICT</div>
                      </div>
                    ))}
                    {draftIssues.map((iss: any, i: number) => (
                      <div key={`issue-${i}`} className="bg-white border border-amber-200 rounded-xl p-3 text-xs text-slate-700">
                        {iss.type === 'MISSING_TEACHER' ? '⚠ Missing Teacher: ' : '⚠ Missing Required Subject Hours: '}
                        {iss.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {conflicts.length === 0 && draftIssues.length === 0 && (
                <div className={`${cardCls} p-4 flex items-center gap-2 border-emerald-200 bg-emerald-50/40`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-800">No conflicts. Ready for approval / publish.</span>
                </div>
              )}

              <div className={`${cardCls} p-4`}>
                <h3 className="text-sm font-bold text-slate-900 mb-2">Teacher Workload</h3>
                <table className="w-full text-xs">
                  <thead><tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="py-2 pr-2">Teacher</th><th className="py-2 pr-2">Required</th><th className="py-2 pr-2">Assigned</th><th className="py-2 pr-2">Remaining</th><th className="py-2 pr-2">Status</th>
                  </tr></thead>
                  <tbody>
                    {workload.map((w, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="py-1.5 pr-2 font-medium text-slate-800">{w.teacher_name}</td>
                        <td className="py-1.5 pr-2">{w.required_hours} hrs</td>
                        <td className="py-1.5 pr-2">{w.assigned_hours} hrs</td>
                        <td className="py-1.5 pr-2">{w.remaining_hours} hrs</td>
                        <td className="py-1.5 pr-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${w.status === 'Complete' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{w.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={`${cardCls} p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">Generated Schedule</h3>
                  <div className="flex gap-1.5">
                    {(['day', 'class', 'teacher', 'subject'] as const).map((v) => (
                      <button key={v} onClick={() => setDraftViewBy(v)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${draftViewBy === v ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {v[0].toUpperCase() + v.slice(1)}-wise
                      </button>
                    ))}
                  </div>
                </div>
                <DraftEntriesTable entries={draftEntries} groupBy={draftViewBy} onUpdate={updateEntry} onDelete={deleteEntry} teachers={teachers} meta={meta} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const DraftEntriesTable: React.FC<{ entries: any[]; groupBy: 'day' | 'class' | 'teacher' | 'subject'; onUpdate: (id: string, patch: any) => void; onDelete: (id: string) => void; teachers: any[]; meta: any }> = ({
  entries, groupBy, onDelete
}) => {
  const groupKey = (e: any) => {
    if (groupBy === 'day') return dayLabel(e.day_of_week);
    if (groupBy === 'class') return `${e.class_name}${e.section_name}`;
    if (groupBy === 'teacher') return e.teacher_name;
    return e.subject_name;
  };
  const groups = new Map<string, any[]>();
  entries.forEach((e) => { groups.set(groupKey(e), [...(groups.get(groupKey(e)) || []), e]); });

  if (entries.length === 0) {
    return <div className="text-xs text-slate-400 py-6 text-center">No periods yet — generate the timetable above.</div>;
  }

  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([label, rows]) => (
        <div key={label}>
          <div className="text-xs font-bold text-indigo-700 mb-1.5">{label}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-1.5 pr-2">Day</th><th className="py-1.5 pr-2">Time</th><th className="py-1.5 pr-2">Class</th>
                <th className="py-1.5 pr-2">Subject</th><th className="py-1.5 pr-2">Teacher</th><th className="py-1.5 pr-2">Room</th><th></th>
              </tr></thead>
              <tbody>
                {rows.sort((a, b) => a.period_number - b.period_number).map((e) => (
                  <tr key={e.id} className="border-b border-slate-50">
                    <td className="py-1.5 pr-2">{dayLabel(e.day_of_week)}</td>
                    <td className="py-1.5 pr-2">{e.start_time}–{e.end_time}</td>
                    <td className="py-1.5 pr-2">{e.class_name}{e.section_name}</td>
                    <td className="py-1.5 pr-2">{e.subject_name}</td>
                    <td className="py-1.5 pr-2">{e.teacher_name}</td>
                    <td className="py-1.5 pr-2">{e.room_number || '—'}</td>
                    <td><button onClick={() => onDelete(e.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};
