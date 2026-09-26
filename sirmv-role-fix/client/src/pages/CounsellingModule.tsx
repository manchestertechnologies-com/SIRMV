import React, { useState, useEffect } from 'react';
import { showToast } from '../utils/toast';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, X, CheckCircle2, Clock, MessageCircle } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-amber-50 border-amber-200 text-amber-700',
  FOLLOW_UP: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  RESOLVED: 'bg-emerald-50 border-emerald-200 text-emerald-700'
};

export const CounsellingModule: React.FC = () => {
  const { currentBranch } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ student_id: '', session_date: '', reason: '', notes: '', follow_up_date: '' });
  const [error, setError] = useState<string | null>(null);

  const branchId = currentBranch?.id || '';

  const load = async () => {
    try {
      const [recRes, stdRes] = await Promise.all([
        apiFetch<any>(`/counselling?branch_id=${branchId}`),
        apiFetch<any>(`/students?branch_id=${branchId}`).catch(() => ({ students: [] }))
      ]);
      setRecords(recRes.records || []);
      setStudents(stdRes.students || []);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => { if (branchId) load(); }, [branchId]);

  const createRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.student_id || !form.session_date) {
      setError('Student and session date are required.');
      return;
    }
    try {
      await apiFetch(`/counselling`, { method: 'POST', body: JSON.stringify({ ...form, branch_id: branchId }) });
      setForm({ student_id: '', session_date: '', reason: '', notes: '', follow_up_date: '' });
      setShowAdd(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const markResolved = async (id: string) => {
    try {
      await apiFetch(`/counselling/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'RESOLVED' }) });
      load();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">
          <Plus className="w-3.5 h-3.5" /> Log Counselling Session
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100">
        {records.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-10">No counselling sessions logged yet.</p>
        )}
        {records.map((r) => (
          <div key={r.id} className="p-4 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-indigo-500 shrink-0" />
                <h3 className="font-bold text-slate-900 text-sm">{r.student_name}</h3>
                <span className="text-[11px] text-slate-400 font-mono">{r.register_number}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[r.status] || STATUS_STYLES.OPEN}`}>
                {r.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {r.session_date} • {r.reason || 'General counselling'} • by {r.counsellor_name}
            </p>
            {r.notes && <p className="text-xs text-slate-600">{r.notes}</p>}
            {r.follow_up_date && (
              <p className="text-[11px] text-amber-600 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Follow-up on {r.follow_up_date}
              </p>
            )}
            {r.status !== 'RESOLVED' && (
              <button
                onClick={() => markResolved(r.id)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 mt-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
              </button>
            )}
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Log Counselling Session</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            {error && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{error}</div>}
            <form onSubmit={createRecord} className="space-y-3">
              <select
                required
                value={form.student_id}
                onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none"
              >
                <option value="">-- Select Student --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.register_number})</option>
                ))}
              </select>
              <input
                required
                type="date"
                value={form.session_date}
                onChange={(e) => setForm({ ...form, session_date: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none"
              />
              <input
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Reason (e.g. Academic performance)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none"
              />
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Session notes"
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none"
              />
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Follow-up date (optional)</label>
                <input
                  type="date"
                  value={form.follow_up_date}
                  onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none"
                />
              </div>
              <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">Save Session</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
