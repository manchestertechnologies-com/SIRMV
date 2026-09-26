import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Plus, X, ClipboardList, Users, DoorOpen, Wand2, CheckCircle2, AlertTriangle,
  ArrowLeftRight, Rocket, ShieldCheck, Settings2, ArrowLeft
} from 'lucide-react';
import { ExamFloor3D, FloorRoom, RoomStatus } from '../components/ExamFloor3D';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClassOption { id: string; name: string; sections: { id: string; name: string; studentCount: number }[]; }
interface SubjectOption { id: string; name: string; }
interface RoomRow {
  room_id: string; room_number: string; floor: number; building?: string;
  benches: number; seats_per_bench: number; is_available_for_exams: boolean; total_capacity: number;
}
interface ExamRow {
  id: string; name: string; pu_level: string; status: string; academic_year_name: string;
  session_count: number; batch_count: number; created_at: string;
}
interface SessionRow {
  id: string; subject_id: string; subject_name: string; exam_date: string; start_time: string; end_time: string;
  reporting_time: string | null; rooms_allocated: number; students_allocated: number;
}
interface BatchDetail {
  class_id: string; section_id: string; class_name: string; section_name: string;
  student_count: number; male_count: number; female_count: number; label: string;
}

const STATUS_STEPS = ['DRAFT', 'ROOMS_SELECTED', 'STUDENTS_ALLOCATED', 'INVIGILATORS_ALLOCATED', 'READY_TO_PUBLISH', 'PUBLISHED'];
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', ROOMS_SELECTED: 'Rooms Selected', STUDENTS_ALLOCATED: 'Students Allocated',
  INVIGILATORS_ALLOCATED: 'Invigilators Allocated', READY_TO_PUBLISH: 'Ready to Publish', PUBLISHED: 'Published'
};

function StatusBadge({ status }: { status: string }) {
  const color = status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700'
    : status === 'READY_TO_PUBLISH' ? 'bg-violet-100 text-violet-700'
    : status === 'DRAFT' ? 'bg-slate-100 text-slate-600'
    : 'bg-amber-100 text-amber-700';
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${color}`}>{STATUS_LABELS[status] || status}</span>;
}

// ---------------------------------------------------------------------------
// Main module
// ---------------------------------------------------------------------------

export const ExamManagementModule: React.FC = () => {
  const { currentBranch } = useAuth();
  const [view, setView] = useState<'list' | 'create' | 'detail' | 'rooms'>('list');
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const flash = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 5000);
  };

  const loadExams = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ exams: ExamRow[] }>(`/exam-management/exams?branch_id=${currentBranch?.id || ''}`);
      setExams(res.exams || []);
    } catch (err: any) {
      flash('error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadExams(); }, [currentBranch]);

  return (
    <div className="space-y-4">
      {notice && (
        <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${notice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
          {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {notice.message}
        </div>
      )}

      {view === 'list' && (
        <ExamListView
          exams={exams}
          isLoading={isLoading}
          onNew={() => setView('create')}
          onOpen={(id) => { setSelectedExamId(id); setView('detail'); }}
          onRooms={() => setView('rooms')}
        />
      )}

      {view === 'rooms' && (
        <RoomsConfigView onBack={() => setView('list')} flash={flash} />
      )}

      {view === 'create' && (
        <CreateExamView
          onCancel={() => setView('list')}
          onCreated={(id) => { loadExams(); setSelectedExamId(id); setView('detail'); }}
          flash={flash}
        />
      )}

      {view === 'detail' && selectedExamId && (
        <ExamDetailView
          examId={selectedExamId}
          onBack={() => { setView('list'); loadExams(); }}
          flash={flash}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// List view
// ---------------------------------------------------------------------------

const ExamListView: React.FC<{
  exams: ExamRow[]; isLoading: boolean; onNew: () => void; onOpen: (id: string) => void; onRooms: () => void;
}> = ({ exams, isLoading, onNew, onOpen, onRooms }) => (
  <div className="space-y-4">
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-violet-600" />
          <h1 className="text-xl font-bold text-slate-900 font-heading">Exam Management</h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">PU-level examinations: rooms, seating, invigilation, and publishing — 1 PU / 2 PU.</p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onRooms} className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition">
          <Settings2 className="w-4 h-4" /> Configure Rooms
        </button>
        <button onClick={onNew} className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold shadow-xs transition">
          <Plus className="w-4 h-4" /> New Exam
        </button>
      </div>
    </div>

    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-3 px-4">Exam</th>
              <th className="py-3 px-4">PU Level</th>
              <th className="py-3 px-4">Academic Year</th>
              <th className="py-3 px-4">Sessions</th>
              <th className="py-3 px-4">Batches</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-400">Loading exams...</td></tr>
            ) : exams.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-400">No exams yet. Create one to get started.</td></tr>
            ) : (
              exams.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/70 transition cursor-pointer" onClick={() => onOpen(e.id)}>
                  <td className="py-3 px-4 font-bold text-slate-900">{e.name}</td>
                  <td className="py-3 px-4">{e.pu_level}</td>
                  <td className="py-3 px-4 text-slate-500">{e.academic_year_name}</td>
                  <td className="py-3 px-4">{e.session_count}</td>
                  <td className="py-3 px-4">{e.batch_count}</td>
                  <td className="py-3 px-4"><StatusBadge status={e.status} /></td>
                  <td className="py-3 px-4 text-violet-600 font-semibold">Open →</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Room configuration view
// ---------------------------------------------------------------------------

const RoomsConfigView: React.FC<{ onBack: () => void; flash: (t: 'success' | 'error', m: string) => void }> = ({ onBack, flash }) => {
  const { currentBranch } = useAuth();
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ rooms: RoomRow[] }>(`/exam-management/rooms?branch_id=${currentBranch?.id || ''}`);
      setRooms(res.rooms || []);
    } catch (err: any) {
      flash('error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [currentBranch]);

  const updateRoom = async (roomId: string, patch: Partial<RoomRow>) => {
    setRooms((prev) => prev.map((r) => (r.room_id === roomId ? { ...r, ...patch, total_capacity: (patch.benches ?? r.benches) * (patch.seats_per_bench ?? r.seats_per_bench) } : r)));
  };

  const saveRoom = async (room: RoomRow) => {
    try {
      await apiFetch(`/exam-management/rooms/${room.room_id}/config`, {
        method: 'PUT',
        body: JSON.stringify({ benches: room.benches, seats_per_bench: room.seats_per_bench, is_available_for_exams: room.is_available_for_exams })
      });
      flash('success', `Room ${room.room_number} configuration saved.`);
    } catch (err: any) {
      flash('error', err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"><ArrowLeft className="w-4 h-4 text-slate-600" /></button>
        <h2 className="text-lg font-bold text-slate-900 font-heading">Exam Room Configuration</h2>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4">Floor</th>
                <th className="py-3 px-4">Benches</th>
                <th className="py-3 px-4">Seats / Bench</th>
                <th className="py-3 px-4">Total Capacity</th>
                <th className="py-3 px-4">Available for Exams</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">Loading rooms...</td></tr>
              ) : rooms.map((r) => (
                <tr key={r.room_id}>
                  <td className="py-2 px-4 font-bold text-slate-900">Room {r.room_number}</td>
                  <td className="py-2 px-4">{r.floor}</td>
                  <td className="py-2 px-4">
                    <input type="number" min={1} value={r.benches} onChange={(e) => updateRoom(r.room_id, { benches: Number(e.target.value) || 1 })} className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1" />
                  </td>
                  <td className="py-2 px-4">
                    <input type="number" min={1} value={r.seats_per_bench} onChange={(e) => updateRoom(r.room_id, { seats_per_bench: Number(e.target.value) || 1 })} className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1" />
                  </td>
                  <td className="py-2 px-4 font-bold text-violet-700">{r.total_capacity}</td>
                  <td className="py-2 px-4">
                    <input type="checkbox" checked={r.is_available_for_exams} onChange={(e) => updateRoom(r.room_id, { is_available_for_exams: e.target.checked })} />
                  </td>
                  <td className="py-2 px-4">
                    <button onClick={() => saveRoom(r)} className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[11px] font-semibold">Save</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Create exam view
// ---------------------------------------------------------------------------

const CreateExamView: React.FC<{ onCancel: () => void; onCreated: (id: string) => void; flash: (t: 'success' | 'error', m: string) => void }> = ({ onCancel, onCreated, flash }) => {
  const { currentBranch } = useAuth();
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string }[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  const [name, setName] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [puLevel, setPuLevel] = useState<'1 PU' | '2 PU'>('2 PU');
  const [instructions, setInstructions] = useState('');
  const [seatingLayout, setSeatingLayout] = useState<'ZIGZAG' | 'USHAPE'>('ZIGZAG');
  const [separateSameClass, setSeparateSameClass] = useState(true);
  const [selectedSections, setSelectedSections] = useState<{ classId: string; sectionId: string; label: string }[]>([]);
  const [sessions, setSessions] = useState<{ subject_id: string; exam_date: string; start_time: string; end_time: string; reporting_time: string }[]>([
    { subject_id: '', exam_date: '', start_time: '09:00', end_time: '12:00', reporting_time: '08:30' }
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [ayRes, clsRes] = await Promise.all([
          apiFetch<{ academicYears: any[] }>('/exam-management/academic-years'),
          apiFetch<{ classes: ClassOption[] }>(`/classes?branch_id=${currentBranch?.id || ''}`)
        ]);
        setAcademicYears(ayRes.academicYears || []);
        if (ayRes.academicYears?.length) setAcademicYearId(ayRes.academicYears[0].id);
        setClasses(clsRes.classes || []);
      } catch (err: any) {
        flash('error', err.message);
      }
    })();
  }, [currentBranch]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<{ subjects: SubjectOption[] }>(`/exam-management/subjects?branch_id=${currentBranch?.id || ''}`);
        setSubjects(res.subjects || []);
      } catch (err: any) {
        flash('error', err.message);
      }
    })();
  }, [currentBranch]);

  const toggleSection = (classId: string, className: string, sectionId: string, sectionName: string) => {
    const key = `${classId}:${sectionId}`;
    setSelectedSections((prev) => {
      const exists = prev.some((s) => `${s.classId}:${s.sectionId}` === key);
      if (exists) return prev.filter((s) => `${s.classId}:${s.sectionId}` !== key);
      return [...prev, { classId, sectionId, label: `${className} ${sectionName}` }];
    });
  };

  const addSession = () => setSessions((prev) => [...prev, { subject_id: '', exam_date: '', start_time: '09:00', end_time: '12:00', reporting_time: '08:30' }]);
  const removeSession = (idx: number) => setSessions((prev) => prev.filter((_, i) => i !== idx));
  const updateSession = (idx: number, patch: Partial<(typeof sessions)[number]>) =>
    setSessions((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const submit = async () => {
    if (!name || !academicYearId || selectedSections.length === 0 || sessions.some((s) => !s.subject_id || !s.exam_date)) {
      flash('error', 'Please fill in the exam name, academic year, at least one batch, and complete every session row.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch<{ id: string }>('/exam-management/exams', {
        method: 'POST',
        body: JSON.stringify({
          branch_id: currentBranch?.id,
          academic_year_id: academicYearId,
          name,
          pu_level: puLevel,
          instructions,
          seating_layout: seatingLayout,
          separate_same_class: separateSameClass,
          batches: selectedSections.map((s) => ({ class_id: s.classId, section_id: s.sectionId })),
          sessions
        })
      });
      flash('success', 'Exam created successfully.');
      onCreated(res.id);
    } catch (err: any) {
      flash('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onCancel} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"><ArrowLeft className="w-4 h-4 text-slate-600" /></button>
        <h2 className="text-lg font-bold text-slate-900 font-heading">Create Exam</h2>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500">Exam Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2 PU Mid-Term Examination" className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Academic Year</label>
            <select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none">
              {academicYears.map((ay) => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">PU Level</label>
            <select value={puLevel} onChange={(e) => setPuLevel(e.target.value as any)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none">
              <option value="1 PU">1 PU</option>
              <option value="2 PU">2 PU</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Seating Layout</label>
            <select value={seatingLayout} onChange={(e) => setSeatingLayout(e.target.value as any)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none">
              <option value="ZIGZAG">Zig-Zag</option>
              <option value="USHAPE">U-Shape</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input type="checkbox" checked={separateSameClass} onChange={(e) => setSeparateSameClass(e.target.checked)} />
          Separate students from the same class (alternate batches wherever seating permits)
        </label>

        <div>
          <label className="text-xs font-semibold text-slate-500">Exam Instructions</label>
          <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" placeholder="e.g. No electronic devices allowed. Report 30 minutes early." />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Selected Batches (Class + Section)</label>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {classes.filter((c) => c.name.startsWith(puLevel === '1 PU' ? '1' : '2')).map((c) =>
              c.sections.map((s) => {
                const key = `${c.id}:${s.id}`;
                const checked = selectedSections.some((sel) => `${sel.classId}:${sel.sectionId}` === key);
                return (
                  <label key={key} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs cursor-pointer ${checked ? 'bg-violet-50 border-violet-400 text-violet-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                    <span>{c.name} {s.name}</span>
                    <input type="checkbox" checked={checked} onChange={() => toggleSection(c.id, c.name, s.id, s.name)} />
                  </label>
                );
              })
            )}
          </div>
          {selectedSections.length > 0 && (
            <div className="mt-2 text-xs text-slate-500">
              {selectedSections.length} batch(es) selected — total students calculated after creation.
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-500">Exam Sessions (one per subject/date/time — an exam can have multiple papers)</label>
            <button onClick={addSession} className="text-xs font-semibold text-violet-600 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Session</button>
          </div>
          <div className="mt-2 space-y-2">
            {sessions.map((s, idx) => (
              <div key={idx} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-center bg-slate-50 border border-slate-200 rounded-xl p-2">
                <select
                  value={s.subject_id}
                  onChange={(e) => updateSession(idx, { subject_id: e.target.value })}
                  className="col-span-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none"
                >
                  <option value="">Select subject...</option>
                  {subjects.map((sub) => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                </select>
                <input type="date" value={s.exam_date} onChange={(e) => updateSession(idx, { exam_date: e.target.value })} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none" />
                <input type="time" value={s.start_time} onChange={(e) => updateSession(idx, { start_time: e.target.value })} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none" />
                <input type="time" value={s.end_time} onChange={(e) => updateSession(idx, { end_time: e.target.value })} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none" />
                <div className="flex items-center gap-1">
                  <input type="time" value={s.reporting_time} onChange={(e) => updateSession(idx, { reporting_time: e.target.value })} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none w-full" />
                  {sessions.length > 1 && (
                    <button onClick={() => removeSession(idx)} className="text-rose-500"><X className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50">
            {saving ? 'Creating...' : 'Create Exam'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Exam detail view
// ---------------------------------------------------------------------------

const ExamDetailView: React.FC<{ examId: string; onBack: () => void; flash: (t: 'success' | 'error', m: string) => void }> = ({ examId, onBack, flash }) => {
  const [exam, setExam] = useState<any | null>(null);
  const [batches, setBatches] = useState<BatchDetail[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await apiFetch<any>(`/exam-management/exams/${examId}`);
      setExam(res.exam);
      setBatches(res.batches || []);
      setSessions(res.sessions || []);
      setTotalStudents(res.totalStudents || 0);
      if (!activeSessionId && res.sessions?.length) setActiveSessionId(res.sessions[0].id);
    } catch (err: any) {
      flash('error', err.message);
    }
  };

  useEffect(() => { load(); }, [examId]);

  const markReady = async () => {
    try {
      await apiFetch(`/exam-management/exams/${examId}/mark-ready`, { method: 'POST' });
      flash('success', 'Exam marked ready to publish.');
      load();
    } catch (err: any) {
      flash('error', err.message);
    }
  };

  const publish = async () => {
    if (!window.confirm('Publish this exam? Students, parents and lecturers will see final seating once portal integration ships.')) return;
    try {
      await apiFetch(`/exam-management/exams/${examId}/publish`, { method: 'POST' });
      flash('success', 'Exam published.');
      load();
    } catch (err: any) {
      flash('error', err.message);
    }
  };

  if (!exam) return <div className="p-8 text-center text-slate-400 text-sm">Loading exam...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"><ArrowLeft className="w-4 h-4 text-slate-600" /></button>
        <h2 className="text-lg font-bold text-slate-900 font-heading">{exam.name}</h2>
        <StatusBadge status={exam.status} />
      </div>

      {/* Status progress */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex items-center gap-2 overflow-x-auto">
        {STATUS_STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-1.5 whitespace-nowrap text-[11px] font-bold ${STATUS_STEPS.indexOf(exam.status) >= i ? 'text-violet-700' : 'text-slate-300'}`}>
              <span className={`w-2 h-2 rounded-full ${STATUS_STEPS.indexOf(exam.status) >= i ? 'bg-violet-600' : 'bg-slate-200'}`} />
              {STATUS_LABELS[s]}
            </div>
            {i < STATUS_STEPS.length - 1 && <span className="w-6 h-px bg-slate-200" />}
          </React.Fragment>
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs"><span className="text-xs text-slate-400 block font-medium">PU Level</span><span className="text-xl font-bold text-slate-900 mt-1 block">{exam.pu_level}</span></div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs"><span className="text-xs text-slate-400 block font-medium">Total Students</span><span className="text-xl font-bold text-violet-700 mt-1 block">{totalStudents}</span></div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs"><span className="text-xs text-slate-400 block font-medium">Batches</span><span className="text-xl font-bold text-slate-900 mt-1 block">{batches.length}</span></div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs"><span className="text-xs text-slate-400 block font-medium">Sessions</span><span className="text-xl font-bold text-slate-900 mt-1 block">{sessions.length}</span></div>
      </div>

      {/* Batches */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900 flex items-center gap-2"><Users className="w-4 h-4 text-violet-600" /> Selected Batches</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead><tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-2 px-4">Batch</th><th className="py-2 px-4">Students</th><th className="py-2 px-4">Male</th><th className="py-2 px-4">Female</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {batches.map((b) => (
                <tr key={`${b.class_id}:${b.section_id}`}>
                  <td className="py-2 px-4 font-bold text-slate-900">{b.label}</td>
                  <td className="py-2 px-4">{b.student_count}</td>
                  <td className="py-2 px-4">{b.male_count}</td>
                  <td className="py-2 px-4">{b.female_count}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold">
                <td className="py-2 px-4">Total</td><td className="py-2 px-4">{totalStudents}</td><td className="py-2 px-4" colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Sessions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900">Exam Sessions</div>
        <div className="flex gap-2 p-3 overflow-x-auto border-b border-slate-100">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${activeSessionId === s.id ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {s.subject_name} — {s.exam_date}
            </button>
          ))}
        </div>
        {activeSessionId && (
          <SessionAllocationPanel sessionId={activeSessionId} onChanged={load} flash={flash} />
        )}
      </div>

      {/* Publish workflow */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-violet-600" /> Publishing locks the exam and (in a later phase) notifies students, parents and invigilators.</div>
        <div className="flex gap-2">
          <button onClick={markReady} disabled={exam.status === 'PUBLISHED'} className="px-4 py-2 rounded-xl text-xs font-semibold text-violet-700 bg-violet-100 hover:bg-violet-200 disabled:opacity-50">Mark Ready to Publish</button>
          <button onClick={publish} disabled={exam.status !== 'READY_TO_PUBLISH'} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50">
            <Rocket className="w-3.5 h-3.5" /> Publish Exam
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Per-session allocation panel: room selection (3D + list), seat allocation,
// manual swap, and a live validation summary.
// ---------------------------------------------------------------------------

const SessionAllocationPanel: React.FC<{ sessionId: string; onChanged: () => void; flash: (t: 'success' | 'error', m: string) => void }> = ({ sessionId, onChanged, flash }) => {
  const [roomOptions, setRoomOptions] = useState<{ priorityRooms: any[]; otherRooms: any[]; requiredSeats: number } | null>(null);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [seating, setSeating] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ totalStudents: number; allocated: number; unallocated: number; roomsUsed: number; seatsUsed: number; conflicts: string[] } | null>(null);
  const [swapA, setSwapA] = useState<string | null>(null);
  const [pickedRoomId, setPickedRoomId] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      const [opts, seat, sum] = await Promise.all([
        apiFetch<any>(`/exam-management/sessions/${sessionId}/room-options`),
        apiFetch<any>(`/exam-management/sessions/${sessionId}/seating`),
        apiFetch<any>(`/exam-management/sessions/${sessionId}/summary`)
      ]);
      setRoomOptions(opts);
      setSeating(seat.seating || []);
      setSummary(sum.summary);
      setSelectedRoomIds(new Set([...opts.priorityRooms, ...opts.otherRooms].filter((r: any) => seat.seating?.some((s: any) => s.room_id === r.roomId)).map((r: any) => r.roomId)));
    } catch (err: any) {
      flash('error', err.message);
    }
  };

  useEffect(() => { loadAll(); }, [sessionId]);

  const autoAllocateRooms = async () => {
    try {
      const res = await apiFetch<any>(`/exam-management/sessions/${sessionId}/allocate-rooms-auto`, { method: 'POST' });
      flash('success', `Rooms auto-allocated: ${res.plan.length} room(s), ${res.unusedSeats} unused seat(s).`);
      loadAll();
      onChanged();
    } catch (err: any) {
      flash('error', err.message);
    }
  };

  const applyManualRooms = async () => {
    try {
      await apiFetch(`/exam-management/sessions/${sessionId}/rooms`, { method: 'PUT', body: JSON.stringify({ room_ids: [...selectedRoomIds] }) });
      flash('success', 'Rooms assigned to this session.');
      loadAll();
      onChanged();
    } catch (err: any) {
      flash('error', err.message);
    }
  };

  const allocateSeats = async () => {
    try {
      const res = await apiFetch<any>(`/exam-management/sessions/${sessionId}/allocate-seats`, { method: 'POST' });
      flash('success', `${res.seated} student(s) seated.`);
      loadAll();
      onChanged();
    } catch (err: any) {
      flash('error', err.message);
    }
  };

  const handleSeatClick = async (studentId: string) => {
    if (!swapA) { setSwapA(studentId); return; }
    if (swapA === studentId) { setSwapA(null); return; }
    try {
      await apiFetch(`/exam-management/sessions/${sessionId}/seats/swap`, { method: 'PUT', body: JSON.stringify({ student_id_a: swapA, student_id_b: studentId }) });
      flash('success', 'Seats swapped.');
      setSwapA(null);
      loadAll();
    } catch (err: any) {
      flash('error', err.message);
      setSwapA(null);
    }
  };

  if (!roomOptions) return <div className="p-6 text-center text-slate-400 text-xs">Loading session...</div>;

  const allRoomOpts = [...roomOptions.priorityRooms, ...roomOptions.otherRooms];
  const floorRooms: FloorRoom[] = allRoomOpts.map((r) => {
    const seatedCount = seating.filter((s) => s.room_id === r.roomId).length;
    const isSelected = selectedRoomIds.has(r.roomId);
    let status: RoomStatus = 'AVAILABLE';
    if (!r.isAvailable && !isSelected) status = 'UNAVAILABLE';
    else if (isSelected && seatedCount >= r.capacity) status = 'FULL';
    else if (isSelected && seatedCount > 0) status = 'PARTIALLY_ALLOCATED';
    else if (isSelected) status = 'SELECTED';
    else if (r.isPriorityFor?.length) status = 'PRIORITY';
    return {
      roomId: r.roomId, roomNumber: r.roomNumber, floor: r.floor, benches: r.benches,
      seatsPerBench: r.seatsPerBench, capacity: r.capacity, studentsAssigned: seatedCount, status
    };
  });
  const roomsByFloor: Record<number, FloorRoom[]> = {};
  floorRooms.forEach((r) => { (roomsByFloor[r.floor] = roomsByFloor[r.floor] || []).push(r); });

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={autoAllocateRooms} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white">
          <Wand2 className="w-3.5 h-3.5" /> Auto-Allocate Rooms
        </button>
        <button onClick={applyManualRooms} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700">
          <DoorOpen className="w-3.5 h-3.5" /> Apply Manual Room Selection ({selectedRoomIds.size})
        </button>
        <button onClick={allocateSeats} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
          <Users className="w-3.5 h-3.5" /> Allocate Seats
        </button>
        <span className="text-[11px] text-slate-400">Required seats: {roomOptions.requiredSeats}</span>
      </div>

      <ExamFloor3D
        roomsByFloor={roomsByFloor}
        selectedRoomId={pickedRoomId}
        onSelectRoom={(id) => {
          if (!id) { setPickedRoomId(null); return; }
          setPickedRoomId(id);
          setSelectedRoomIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
          });
        }}
      />

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-slate-50 rounded-xl p-3 text-center"><div className="text-[11px] text-slate-400">Students</div><div className="font-bold text-slate-900">{summary.totalStudents}</div></div>
          <div className="bg-slate-50 rounded-xl p-3 text-center"><div className="text-[11px] text-slate-400">Allocated</div><div className="font-bold text-emerald-600">{summary.allocated}</div></div>
          <div className="bg-slate-50 rounded-xl p-3 text-center"><div className="text-[11px] text-slate-400">Unallocated</div><div className="font-bold text-rose-600">{summary.unallocated}</div></div>
          <div className="bg-slate-50 rounded-xl p-3 text-center"><div className="text-[11px] text-slate-400">Rooms Used</div><div className="font-bold text-slate-900">{summary.roomsUsed}</div></div>
          <div className="bg-slate-50 rounded-xl p-3 text-center"><div className="text-[11px] text-slate-400">Conflicts</div><div className={`font-bold ${summary.conflicts.length ? 'text-rose-600' : 'text-emerald-600'}`}>{summary.conflicts.length}</div></div>
        </div>
      )}

      {seating.length > 0 && (
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5"><ArrowLeftRight className="w-3.5 h-3.5" /> Seating — click two students to swap their seats</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-72 overflow-y-auto">
            {seating.map((s) => (
              <button
                key={s.student_id}
                onClick={() => handleSeatClick(s.student_id)}
                className={`text-left p-2 rounded-lg border text-[11px] transition ${swapA === s.student_id ? 'bg-violet-100 border-violet-400' : 'bg-white border-slate-200 hover:border-violet-300'}`}
              >
                <div className="font-bold text-slate-900">{s.student_name}</div>
                <div className="text-slate-400">{s.register_number} · {s.class_name} {s.section_name}</div>
                <div className="text-violet-700 font-semibold mt-0.5">Room {s.room_number} · Bench {s.bench_number} · Seat {s.seat_number}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
