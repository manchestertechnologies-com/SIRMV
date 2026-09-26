import React, { useState, useEffect } from 'react';
import { showToast } from '../utils/toast';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, X, Users, Target, Trash2, ArrowLeft } from 'lucide-react';

export const BatchesPage: React.FC = () => {
  const { currentBranch } = useAuth();
  const [batches, setBatches] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', code: '' });
  const [error, setError] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const branchId = currentBranch?.id || '';

  const load = async () => {
    try {
      const res = await apiFetch<any>(`/batches?branch_id=${branchId}`);
      setBatches(res.batches || []);
    } catch (err) { console.error(err); }
  };
  useEffect(() => { if (branchId) load(); }, [branchId]);

  const createBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch(`/batches`, { method: 'POST', body: JSON.stringify({ ...form, branch_id: branchId }) });
      setForm({ name: '', code: '' }); setShowAdd(false); load();
    } catch (err: any) { setError(err.message); }
  };

  const deleteBatch = async (id: string) => {
    if (!confirm('Delete this batch?')) return;
    try { await apiFetch(`/batches/${id}`, { method: 'DELETE' }); load(); } catch (err: any) { showToast(err.message, 'error'); }
  };

  if (selectedBatchId) {
    return <BatchDetail batchId={selectedBatchId} onBack={() => setSelectedBatchId(null)} />;
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
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. NEET Batch"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none" />
              <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Code e.g. NEET"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none" />
              <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">Save Batch</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const BatchDetail: React.FC<{ batchId: string; onBack: () => void }> = ({ batchId, onBack }) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    apiFetch<any>(`/batches/${batchId}`).then(setData).catch(console.error);
  }, [batchId]);

  if (!data) return <div className="text-sm text-slate-400 text-center py-16">Loading...</div>;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Batches
      </button>
      <h2 className="text-lg font-bold text-slate-900">{data.batch.name}</h2>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
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
