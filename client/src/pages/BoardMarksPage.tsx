import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, X, ArrowLeft, BookOpen, Upload, Eye, Save } from 'lucide-react';

export const BoardMarksPage: React.FC = () => {
  const { currentBranch } = useAuth();
  const [cycles, setCycles] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  const branchId = currentBranch?.id || '';

  const load = async () => {
    try {
      const res = await apiFetch<any>(`/board-marks/cycles?branch_id=${branchId}`);
      setCycles(res.cycles || []);
    } catch (err) { console.error(err); }
  };
  useEffect(() => { if (branchId) load(); }, [branchId]);

  if (selectedCycleId) {
    return <CycleDetail cycleId={selectedCycleId} branchId={branchId} onBack={() => setSelectedCycleId(null)} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">
          <Plus className="w-3.5 h-3.5" /> Add Cycle
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cycles.map((c) => (
          <button key={c.id} onClick={() => setSelectedCycleId(c.id)} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition text-left space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-slate-900 text-sm">{c.name}</h3>
            </div>
            <p className="text-[11px] text-slate-500">{c.academic_year} • {c.start_date} to {c.end_date}</p>
          </button>
        ))}
        {cycles.length === 0 && <p className="text-sm text-slate-400 col-span-full text-center py-10">No board exam cycles yet. Add Cycle 1 / 2 / 3 to get started.</p>}
      </div>

      {showAdd && <AddCycleModal branchId={branchId} onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); load(); }} />}
    </div>
  );
};

const AddCycleModal: React.FC<{ branchId: string; onClose: () => void; onCreated: () => void }> = ({ branchId, onClose, onCreated }) => {
  const [form, setForm] = useState<any>({ academic_year: '2026-27' });
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch(`/board-marks/cycles`, { method: 'POST', body: JSON.stringify({ ...form, branch_id: branchId }) });
      onCreated();
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Add Board Exam Cycle</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        {error && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <select required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input">
            <option value="">Select Cycle</option>
            <option value="Cycle 1">Cycle 1</option><option value="Cycle 2">Cycle 2</option><option value="Cycle 3">Cycle 3</option>
          </select>
          <input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} placeholder="Academic Year" className="input" />
          <div className="grid grid-cols-2 gap-2">
            <input required type="date" value={form.start_date || ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="input" />
            <input required type="date" value={form.end_date || ''} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="input" />
          </div>
          <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">Save Cycle</button>
        </form>
      </div>
      <style>{`.input { width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.55rem 0.75rem; font-size: 0.8rem; outline: none; }`}</style>
    </div>
  );
};

const CycleDetail: React.FC<{ cycleId: string; branchId: string; onBack: () => void }> = ({ cycleId, branchId, onBack }) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ classes: [], subjects: [] });
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [subjectForm, setSubjectForm] = useState<any>({ max_marks: 100, passing_marks: 35 });
  const [selectedExamSubjectId, setSelectedExamSubjectId] = useState<string | null>(null);

  const loadSubjects = async () => {
    const res = await apiFetch<any>(`/board-marks/cycles/${cycleId}/subjects`);
    setSubjects(res.subjects || []);
  };
  useEffect(() => { loadSubjects(); apiFetch<any>(`/branches/${branchId}/meta`).then(setMeta); }, [cycleId]);

  const addSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/board-marks/cycles/${cycleId}/subjects`, { method: 'POST', body: JSON.stringify(subjectForm) });
      setShowAddSubject(false); loadSubjects();
    } catch (err: any) { alert(err.message); }
  };

  if (selectedExamSubjectId) {
    return <MarksEntry examSubjectId={selectedExamSubjectId} onBack={() => { setSelectedExamSubjectId(null); loadSubjects(); }} />;
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Cycles
      </button>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Subjects (PCMB / CS / Electronics)</h2>
        <button onClick={() => setShowAddSubject(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">
          <Plus className="w-3.5 h-3.5" /> Add Subject
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className="text-left p-3">Subject</th><th className="text-left p-3">Class</th><th className="text-left p-3">Max Marks</th><th className="text-left p-3">Exam Date</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.id} className="border-t border-slate-50">
                <td className="p-3 font-semibold">{s.subject_name}</td>
                <td className="p-3">{s.class_name}</td>
                <td className="p-3">{s.max_marks}</td>
                <td className="p-3">{s.exam_date || '—'}</td>
                <td className="p-3">
                  <button onClick={() => setSelectedExamSubjectId(s.id)} className="text-indigo-600 font-bold">Enter Marks →</button>
                </td>
              </tr>
            ))}
            {subjects.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">No subjects added to this cycle yet.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      {showAddSubject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Add Subject to Cycle</h3>
              <button onClick={() => setShowAddSubject(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={addSubject} className="space-y-3">
              <select required value={subjectForm.subject_id || ''} onChange={(e) => setSubjectForm({ ...subjectForm, subject_id: e.target.value })} className="input">
                <option value="">Select Subject</option>
                {meta.subjects?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select required value={subjectForm.class_id || ''} onChange={(e) => setSubjectForm({ ...subjectForm, class_id: e.target.value })} className="input">
                <option value="">Select Class</option>
                {meta.classes?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" value={subjectForm.max_marks} onChange={(e) => setSubjectForm({ ...subjectForm, max_marks: Number(e.target.value) })} placeholder="Max Marks" className="input" />
                <input type="number" value={subjectForm.passing_marks} onChange={(e) => setSubjectForm({ ...subjectForm, passing_marks: Number(e.target.value) })} placeholder="Passing Marks" className="input" />
              </div>
              <input type="date" value={subjectForm.exam_date || ''} onChange={(e) => setSubjectForm({ ...subjectForm, exam_date: e.target.value })} className="input" />
              <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">Add Subject</button>
            </form>
          </div>
          <style>{`.input { width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.55rem 0.75rem; font-size: 0.8rem; outline: none; }`}</style>
        </div>
      )}
    </div>
  );
};

const MarksEntry: React.FC<{ examSubjectId: string; onBack: () => void }> = ({ examSubjectId, onBack }) => {
  const [examSubject, setExamSubject] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const load = async () => {
    const res = await apiFetch<any>(`/board-marks/entry/${examSubjectId}`);
    setExamSubject(res.examSubject); setStudents(res.students || []);
  };
  useEffect(() => { load(); }, [examSubjectId]);

  const save = async () => {
    setIsSaving(true);
    try {
      const records = Object.entries(edits).map(([student_id, marks_obtained]) => ({ student_id, marks_obtained }));
      if (records.length === 0) { setIsSaving(false); return; }
      await apiFetch(`/board-marks/entry/${examSubjectId}`, { method: 'POST', body: JSON.stringify({ records }) });
      setEdits({}); load();
    } catch (err: any) { alert(err.message); } finally { setIsSaving(false); }
  };

  const uploadPaper = async (studentId: string, file: File) => {
    setUploadingFor(studentId);
    try {
      const fd = new FormData(); fd.append('paper', file);
      await apiFetch(`/board-marks/entry/${examSubjectId}/${studentId}/upload-paper`, { method: 'POST', body: fd });
      load();
    } catch (err: any) { alert(err.message); } finally { setUploadingFor(null); }
  };

  if (!examSubject) return <div className="text-sm text-slate-400 text-center py-16">Loading...</div>;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Subjects
      </button>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">{examSubject.exam_name} — {examSubject.subject_name} ({examSubject.class_name})</h2>
        <button onClick={save} disabled={isSaving} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition disabled:opacity-50">
          <Save className="w-3.5 h-3.5" /> {isSaving ? 'Saving...' : 'Save Marks'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className="text-left p-3">Register No.</th><th className="text-left p-3">Name</th><th className="text-left p-3">Section</th><th className="text-left p-3">Marks (/{examSubject.max_marks})</th><th className="text-left p-3">Evaluated Paper</th></tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.student_id} className="border-t border-slate-50">
                <td className="p-3 font-mono">{s.register_number}</td>
                <td className="p-3 font-semibold">{s.name}</td>
                <td className="p-3">{s.section_name}</td>
                <td className="p-3">
                  <input
                    type="number"
                    defaultValue={s.marks_obtained ?? ''}
                    onChange={(e) => setEdits((prev) => ({ ...prev, [s.student_id]: Number(e.target.value) }))}
                    className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none"
                  />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1.5">
                    {s.evaluated_paper_url && (
                      <a href={s.evaluated_paper_url} target="_blank" rel="noreferrer" className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg"><Eye className="w-3 h-3 text-slate-600" /></a>
                    )}
                    <label className="p-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer">
                      <Upload className="w-3 h-3 text-indigo-600" />
                      <input type="file" className="hidden" disabled={uploadingFor === s.student_id} onChange={(e) => e.target.files?.[0] && uploadPaper(s.student_id, e.target.files[0])} />
                    </label>
                  </div>
                </td>
              </tr>
            ))}
            {students.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">No students in this class.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};
