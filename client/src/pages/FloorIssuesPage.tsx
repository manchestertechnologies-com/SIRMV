import React, { useState, useEffect } from 'react';
import { showToast } from '../utils/toast';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, X, Wrench, CheckCircle2, Clock } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-amber-50 border-amber-200 text-amber-700',
  IN_PROGRESS: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  RESOLVED: 'bg-emerald-50 border-emerald-200 text-emerald-700'
};

const CATEGORIES = ['MAINTENANCE', 'ELECTRICAL', 'FURNITURE', 'CLEANLINESS', 'AV_EQUIPMENT', 'OTHER'];

export const FloorIssuesPage: React.FC = () => {
  const { user, currentBranch } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ floor: '', category: CATEGORIES[0], description: '' });
  const [error, setError] = useState<string | null>(null);

  const branchId = currentBranch?.id || '';
  const canResolve = ['ADMIN', 'PRINCIPAL', 'HOD'].includes(user?.role || '');

  const load = async () => {
    try {
      const res = await apiFetch<any>(`/floor-issues?branch_id=${branchId}`);
      setIssues(res.issues || []);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => { if (branchId) load(); }, [branchId]);

  const reportIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.description) {
      setError('Please describe the issue.');
      return;
    }
    try {
      await apiFetch(`/floor-issues`, {
        method: 'POST',
        body: JSON.stringify({ ...form, floor: form.floor ? Number(form.floor) : null, branch_id: branchId })
      });
      setForm({ floor: '', category: CATEGORIES[0], description: '' });
      setShowAdd(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiFetch(`/floor-issues/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      load();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">
          <Plus className="w-3.5 h-3.5" /> Report Issue
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100">
        {issues.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-10">No issues reported yet.</p>
        )}
        {issues.map((i) => (
          <div key={i.id} className="p-4 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-500 shrink-0" />
                <h3 className="font-bold text-slate-900 text-sm">{i.category}</h3>
                {i.floor != null && <span className="text-[11px] text-slate-400">Floor {i.floor}{i.room_number ? ` • Room ${i.room_number}` : ''}</span>}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[i.status] || STATUS_STYLES.OPEN}`}>
                {i.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-700">{i.description}</p>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Reported by {i.reported_by_name || 'N/A'} on {new Date(i.created_at).toLocaleDateString()}
            </p>
            {canResolve && i.status !== 'RESOLVED' && (
              <div className="flex gap-2 pt-1">
                {i.status === 'OPEN' && (
                  <button onClick={() => updateStatus(i.id, 'IN_PROGRESS')} className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900">
                    Mark In Progress
                  </button>
                )}
                <button onClick={() => updateStatus(i.id, 'RESOLVED')} className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Report an Issue</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            {error && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{error}</div>}
            <form onSubmit={reportIssue} className="space-y-3">
              <input
                type="number"
                value={form.floor}
                onChange={(e) => setForm({ ...form, floor: e.target.value })}
                placeholder="Floor number (optional)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none"
              />
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace('_', ' ')}</option>
                ))}
              </select>
              <textarea
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the issue"
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none"
              />
              <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">Submit Report</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
