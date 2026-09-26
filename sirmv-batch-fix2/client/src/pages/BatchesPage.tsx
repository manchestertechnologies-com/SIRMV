import React, { useState, useEffect } from 'react';
import { showToast } from '../utils/toast';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, X, Users, Target, Trash2, ArrowLeft, Layers } from 'lucide-react';

const CUSTOM_OPTION = '__CUSTOM__';

export const BatchesPage: React.FC = () => {
  const { currentBranch } = useAuth();
  const [batches, setBatches] = useState<any[]>([]);
  const [namePresets, setNamePresets] = useState<{ name: string; code: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [choice, setChoice] = useState('');
  const [customName, setCustomName] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const branchId = currentBranch?.id || '';

  const load = async () => {
    try {
      const [batchesRes, presetsRes] = await Promise.all([
        apiFetch<any>(`/batches?branch_id=${branchId}`),
        apiFetch<any>(`/batches/name-presets?branch_id=${branchId}`).catch(() => ({ presets: [] }))
      ]);
      setBatches(batchesRes.batches || []);
      setNamePresets(presetsRes.presets || []);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => { if (branchId) load(); }, [branchId]);

  const createBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const preset = namePresets.find((p) => p.code === choice);
    const name = choice === CUSTOM_OPTION ? customName.trim() : preset?.name || '';
    const code = choice === CUSTOM_OPTION ? customCode.trim() : preset?.code || '';
    if (!name || !code) {
      setError('Please choose or enter a batch name and code.');
      return;
    }
    try {
      await apiFetch(`/batches`, { method: 'POST', body: JSON.stringify({ name, code, branch_id: branchId }) });
      setChoice('');
      setCustomName('');
      setCustomCode('');
      setShowAdd(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteBatch = async (id: string) => {
    if (!confirm('Delete this batch?')) return;
    try { await apiFetch(`/batches/${id}`, { method: 'DELETE' }); load(); } catch (err: any) { showToast(err.message, 'error'); }
  };

  if (selectedBatchId) {
    return <BatchDetail batchId={selectedBatchId} branchId={branchId} onBack={() => setSelectedBatchId(null)} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">
          <Plus className="w-3.5 h-3.5" /> Add Batch
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {batches.map((b) => (
          <div key={b.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500" />
                <h3 className="font-bold text-slate-900 text-sm">{b.name}</h3>
              </div>
              <button onClick={() => deleteBatch(b.id)}><Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-rose-500" /></button>
            </div>
            <p className="font-mono text-[11px] text-slate-400">{b.code}</p>
            <button onClick={() => setSelectedBatchId(b.id)} className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-500 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {b.studentCount} students</span>
              <span className="text-indigo-600">View →</span>
            </button>
          </div>
        ))}
        {batches.length === 0 && <p className="text-sm text-slate-400 col-span-full text-center py-10">No batches yet. Add one to get started.</p>}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Add Batch</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            {error && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{error}</div>}
            <form onSubmit={createBatch} className="space-y-3">
              <select
                required
                value={choice}
                onChange={(e) => setChoice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none"
              >
                <option value="">-- Select Batch --</option>
                {namePresets.map((p) => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
                <option value={CUSTOM_OPTION}>Other (type your own)</option>
              </select>
              {choice === CUSTOM_OPTION && (
                <>
                  <input required autoFocus value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. CET Batch"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none" />
                  <input required value={customCode} onChange={(e) => setCustomCode(e.target.value.toUpperCase())} placeholder="Code e.g. CET"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none" />
                </>
              )}
              <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">Save Batch</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const BatchDetail: React.FC<{ batchId: string; branchId: string; onBack: () => void }> = ({ batchId, branchId, onBack }) => {
  const [data, setData] = useState<any>(null);

  const load = () => {
    apiFetch<any>(`/batches/${batchId}`).then(setData).catch(console.error);
  };

  useEffect(() => { load(); }, [batchId]);

  if (!data) return <div className="text-sm text-slate-400 text-center py-16">Loading...</div>;

  // Group the (auto-derived) covered class/sections by class for display.
  const byClass = new Map<string, { class_name: string; sections: string[] }>();
  for (const cov of (data.coverage || [])) {
    if (!byClass.has(cov.class_id)) byClass.set(cov.class_id, { class_name: cov.class_name, sections: [] });
    byClass.get(cov.class_id)!.sections.push(cov.section_name);
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Batches
      </button>
      <h2 className="text-lg font-bold text-slate-900">{data.batch.name}</h2>

      {/* Class/Section coverage — automatically shows which classes/sections
          this batch applies to, based on actual student registrations.
          Nothing to add manually: it fills in as students are registered. */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-500" />
          Classes / Sections Covered
        </h3>
        {byClass.size === 0 ? (
          <p className="text-xs text-slate-400">No students registered into this batch yet. Classes/sections will appear here automatically once students are registered with this batch.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from(byClass.entries()).map(([classId, info]) => (
              <div key={classId} className="border border-slate-100 rounded-xl p-3">
                <div className="text-xs font-bold text-slate-700 mb-1.5">{info.class_name}</div>
                <div className="flex flex-wrap gap-2">
                  {info.sections.map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800">
                      Sec {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Enrolled Students</h3>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className="text-left p-3">Register No.</th><th className="text-left p-3">Name</th><th className="text-left p-3">Class / Section</th><th className="text-left p-3">Admission Type</th></tr>
          </thead>
          <tbody>
            {data.students.map((s: any) => (
              <tr key={s.id} className="border-t border-slate-50">
                <td className="p-3 font-mono">{s.register_number}</td>
                <td className="p-3 font-semibold">{s.name}</td>
                <td className="p-3">{s.class_name}-{s.section_name}</td>
                <td className="p-3">{s.admission_type}</td>
              </tr>
            ))}
            {data.students.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">No students in this batch yet.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};
