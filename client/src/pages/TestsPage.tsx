import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { Select } from '../components/Select';
import { useAuth } from '../context/AuthContext';
import { Plus, X, ArrowLeft, Monitor, FileText, Upload, ListChecks, Trophy } from 'lucide-react';

export const TestsPage: React.FC = () => {
  const { currentBranch } = useAuth();
  const [tests, setTests] = useState<any[]>([]);
  const [modeFilter, setModeFilter] = useState('');
  const [meta, setMeta] = useState<any>({ classes: [], batches: [], subjects: [] });
  const [showAdd, setShowAdd] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  const branchId = currentBranch?.id || '';

  const load = async () => {
    try {
      const qs = new URLSearchParams({ branch_id: branchId, ...(modeFilter ? { mode: modeFilter } : {}) });
      const res = await apiFetch<any>(`/tests?${qs.toString()}`);
      setTests(res.tests || []);
    } catch (err) { console.error(err); }
  };
  const loadMeta = async () => {
    try { setMeta(await apiFetch<any>(`/branches/${branchId}/meta`)); } catch (err) { console.error(err); }
  };

  useEffect(() => { if (branchId) loadMeta(); }, [branchId]);
  useEffect(() => { if (branchId) load(); }, [branchId, modeFilter]);

  if (selectedTestId) {
    return <TestDetail testId={selectedTestId} onBack={() => { setSelectedTestId(null); load(); }} />;
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold w-fit">
          {[{ v: '', l: 'All' }, { v: 'ONLINE', l: 'Online' }, { v: 'OFFLINE', l: 'Offline' }].map((m) => (
            <button key={m.v} onClick={() => setModeFilter(m.v)} className={`px-3.5 py-1.5 rounded-xl transition ${modeFilter === m.v ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-500'}`}>
              {m.l}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">
          <Plus className="w-3.5 h-3.5" /> Create Test
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tests.map((t) => (
          <button key={t.id} onClick={() => setSelectedTestId(t.id)} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${t.mode === 'ONLINE' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                {t.mode === 'ONLINE' ? <Monitor className="w-3 h-3" /> : <FileText className="w-3 h-3" />} {t.mode}
              </span>
              <span className="text-[10px] text-slate-400">{t.scheduled_date}</span>
            </div>
            <p className="text-sm font-bold text-slate-900">{t.title}</p>
            <p className="text-[11px] text-slate-500">{t.class_name} • {t.batch_name} {t.subject_name ? `• ${t.subject_name}` : ''}</p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <span>{t.mode === 'ONLINE' ? `${t.questionCount} questions` : `${t.total_marks} marks`}</span>
              <span>{t.submissionCount} submitted</span>
            </div>
          </button>
        ))}
        {tests.length === 0 && <p className="text-sm text-slate-400 col-span-full text-center py-10">No tests scheduled yet.</p>}
      </div>

      {showAdd && (
        <CreateTestModal branchId={branchId} meta={meta} onClose={() => setShowAdd(false)} onCreated={(id) => { setShowAdd(false); load(); setSelectedTestId(id); }} />
      )}
    </div>
  );
};

const CreateTestModal: React.FC<{ branchId: string; meta: any; onClose: () => void; onCreated: (id: string) => void }> = ({ branchId, meta, onClose, onCreated }) => {
  const [form, setForm] = useState<any>({ mode: 'ONLINE', duration_minutes: 60, total_marks: 100 });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const update = (f: string, v: any) => setForm((s: any) => ({ ...s, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true); setError(null);
    try {
      const res = await apiFetch<any>(`/tests`, { method: 'POST', body: JSON.stringify({ ...form, branch_id: branchId }) });
      onCreated(res.id);
    } catch (err: any) { setError(err.message); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Create Test</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{error}</div>}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold w-fit">
            {['ONLINE', 'OFFLINE'].map((m) => (
              <button type="button" key={m} onClick={() => update('mode', m)} className={`px-4 py-1.5 rounded-xl transition ${form.mode === m ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-500'}`}>{m}</button>
            ))}
          </div>
          <input required value={form.title || ''} onChange={(e) => update('title', e.target.value)} placeholder="Test title" className="input" />
          <div className="grid grid-cols-2 gap-3">
            <Select required value={form.class_id || ''} onChange={(v) => update('class_id', v)} placeholder="Select Class" sheetTitle="Select Class"
              options={(meta.classes || []).map((c: any) => ({ value: c.id, label: c.name }))} className="input" />
            <Select required value={form.batch_id || ''} onChange={(v) => update('batch_id', v)} placeholder="Select Batch" sheetTitle="Select Batch"
              options={(meta.batches || []).map((b: any) => ({ value: b.id, label: b.name }))} className="input" />
          </div>
          <Select value={form.subject_id || ''} onChange={(v) => update('subject_id', v)} placeholder="Select Subject (optional)" sheetTitle="Select Subject"
            options={(meta.subjects || []).map((s: any) => ({ value: s.id, label: s.name }))} className="input" />
          <div className="grid grid-cols-3 gap-3">
            <input required type="date" value={form.scheduled_date || ''} onChange={(e) => update('scheduled_date', e.target.value)} className="input" />
            <input type="time" value={form.start_time || ''} onChange={(e) => update('start_time', e.target.value)} className="input" />
            <input type="number" value={form.duration_minutes} onChange={(e) => update('duration_minutes', Number(e.target.value))} placeholder="Minutes" className="input" />
          </div>
          <input type="number" value={form.total_marks} onChange={(e) => update('total_marks', Number(e.target.value))} placeholder="Total Marks" className="input" />
          <button disabled={isSubmitting} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition disabled:opacity-50">
            {isSubmitting ? 'Creating...' : 'Create Test'}
          </button>
        </form>
      </div>
      <style>{`.input { width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.55rem 0.75rem; font-size: 0.8rem; outline: none; }`}</style>
    </div>
  );
};

const TestDetail: React.FC<{ testId: string; onBack: () => void }> = ({ testId, onBack }) => {
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [tab, setTab] = useState<'setup' | 'results'>('setup');
  const [qForm, setQForm] = useState<any>({ marks: 1 });
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const res = await apiFetch<any>(`/tests/${testId}`);
    setTest(res.test); setQuestions(res.questions || []);
  };
  useEffect(() => { load(); }, [testId]);
  useEffect(() => { if (tab === 'results') apiFetch<any>(`/tests/${testId}/results`).then((r) => setResults(r.results || [])); }, [tab, testId]);

  const addQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/tests/${testId}/questions`, { method: 'POST', body: JSON.stringify(qForm) });
      setQForm({ marks: 1 }); load();
    } catch (err: any) { alert(err.message); }
  };

  const uploadPaper = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('paper', file);
      await apiFetch(`/tests/${testId}/upload-paper`, { method: 'POST', body: fd });
      load();
    } catch (err: any) { alert(err.message); } finally { setUploading(false); }
  };

  if (!test) return <div className="text-sm text-slate-400 text-center py-16">Loading...</div>;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Tests
      </button>
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900">{test.title}</h2>
        <p className="text-xs text-slate-500">{test.mode} • {test.class_name} • {test.batch_name} • {test.scheduled_date}</p>
      </div>

      <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold w-fit">
        <button onClick={() => setTab('setup')} className={`px-4 py-1.5 rounded-xl transition ${tab === 'setup' ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-500'}`}>Setup</button>
        <button onClick={() => setTab('results')} className={`px-4 py-1.5 rounded-xl transition ${tab === 'results' ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-500'}`}>Results</button>
      </div>

      {tab === 'setup' && test.mode === 'OFFLINE' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <p className="text-sm font-bold text-slate-800 flex items-center gap-2"><FileText className="w-4 h-4" /> Question Paper</p>
          {test.question_paper_url ? (
            <a href={test.question_paper_url} target="_blank" rel="noreferrer" className="text-indigo-600 text-xs font-semibold underline">View uploaded paper</a>
          ) : <p className="text-xs text-slate-400">No question paper uploaded yet.</p>}
          <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> {uploading ? 'Uploading...' : 'Upload Paper'}
            <input type="file" className="hidden" disabled={uploading} onChange={(e) => e.target.files?.[0] && uploadPaper(e.target.files[0])} />
          </label>
        </div>
      )}

      {tab === 'setup' && test.mode === 'ONLINE' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <p className="text-sm font-bold text-slate-800 flex items-center gap-2"><ListChecks className="w-4 h-4" /> Question Bank ({questions.length})</p>
          <div className="divide-y divide-slate-50">
            {questions.map((q, i) => (
              <div key={q.id} className="py-2.5 text-xs">
                <p className="font-semibold text-slate-800">{i + 1}. {q.question_text} <span className="text-slate-400">({q.marks} mk)</span></p>
                <p className="text-slate-500 mt-1">A) {q.option_a}  B) {q.option_b}  C) {q.option_c}  D) {q.option_d}</p>
                {q.correct_option && <p className="text-emerald-600 font-bold mt-0.5">Correct: {q.correct_option}</p>}
              </div>
            ))}
          </div>
          <form onSubmit={addQuestion} className="space-y-2.5 pt-3 border-t border-slate-100">
            <input required value={qForm.question_text || ''} onChange={(e) => setQForm({ ...qForm, question_text: e.target.value })} placeholder="Question text" className="input" />
            <div className="grid grid-cols-2 gap-2">
              <input required value={qForm.option_a || ''} onChange={(e) => setQForm({ ...qForm, option_a: e.target.value })} placeholder="Option A" className="input" />
              <input required value={qForm.option_b || ''} onChange={(e) => setQForm({ ...qForm, option_b: e.target.value })} placeholder="Option B" className="input" />
              <input required value={qForm.option_c || ''} onChange={(e) => setQForm({ ...qForm, option_c: e.target.value })} placeholder="Option C" className="input" />
              <input required value={qForm.option_d || ''} onChange={(e) => setQForm({ ...qForm, option_d: e.target.value })} placeholder="Option D" className="input" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select required value={qForm.correct_option || ''} onChange={(v) => setQForm({ ...qForm, correct_option: v })} placeholder="Correct Option" sheetTitle="Correct Option"
                options={[{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }, { value: 'C', label: 'C' }, { value: 'D', label: 'D' }]} className="input" />
              <input type="number" value={qForm.marks} onChange={(e) => setQForm({ ...qForm, marks: Number(e.target.value) })} placeholder="Marks" className="input" />
            </div>
            <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">Add Question</button>
          </form>
        </div>
      )}

      {tab === 'results' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr><th className="text-left p-3">Rank</th><th className="text-left p-3">Register No.</th><th className="text-left p-3">Name</th><th className="text-left p-3">Marks</th></tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.id} className="border-t border-slate-50">
                  <td className="p-3">{i === 0 ? <Trophy className="w-3.5 h-3.5 text-amber-500" /> : i + 1}</td>
                  <td className="p-3 font-mono">{r.register_number}</td>
                  <td className="p-3 font-semibold">{r.student_name}</td>
                  <td className="p-3">{r.marks_obtained}/{test.total_marks}</td>
                </tr>
              ))}
              {results.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">No submissions yet.</td></tr>}
            </tbody>
          </table>
          </div>
        </div>
      )}
      <style>{`.input { width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.55rem 0.75rem; font-size: 0.8rem; outline: none; }`}</style>
    </div>
  );
};
