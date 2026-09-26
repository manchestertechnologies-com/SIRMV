import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { ShieldCheck, AlertTriangle, CheckCircle2, Users } from 'lucide-react';

interface RequestRow {
  id: string; exam_session_id: string; department_id: string; department_name: string;
  required_count: number; status: string; exam_date: string; start_time: string; end_time: string;
  subject_name: string; exam_name: string; selected_count: number; remaining: number;
}

interface Candidate {
  teacherId: string; name: string; departmentName: string; isAvailable: boolean;
  unavailableReason?: string; currentInvigilationCount: number; isSelected: boolean;
}

export const InvigilatorRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [activeRequest, setActiveRequest] = useState<RequestRow | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);

  const loadRequests = async () => {
    const res = await apiFetch<{ requests: RequestRow[] }>('/exam-management/invigilator-requests');
    setRequests(res.requests || []);
  };

  useEffect(() => { loadRequests(); }, []);

  const openRequest = async (r: RequestRow) => {
    setActiveRequest(r);
    const res = await apiFetch<{ candidates: Candidate[] }>(`/exam-management/invigilator-requests/${r.id}/candidates`);
    setCandidates(res.candidates || []);
    setSelected(new Set(res.candidates.filter((c) => c.isSelected).map((c) => c.teacherId)));
  };

  const toggle = (teacherId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(teacherId)) next.delete(teacherId); else next.add(teacherId);
      return next;
    });
  };

  const submit = async () => {
    if (!activeRequest) return;
    try {
      await apiFetch(`/exam-management/invigilator-requests/${activeRequest.id}/fulfill`, {
        method: 'PUT',
        body: JSON.stringify({ teacher_ids: [...selected] })
      });
      setNotice('Selection submitted to the Exam Department.');
      setTimeout(() => setNotice(null), 4000);
      setActiveRequest(null);
      loadRequests();
    } catch (err: any) {
      setNotice(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-violet-600" />
          <h1 className="text-xl font-bold text-slate-900 font-heading">Invigilator Requests</h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">Requests from the Exam Department for invigilators from your department.</p>
      </div>

      {notice && <div className="p-3 rounded-xl text-sm bg-violet-50 text-violet-800 border border-violet-200">{notice}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead><tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <th className="py-2 px-4">Exam</th><th className="py-2 px-4">Date / Time</th><th className="py-2 px-4">Required</th><th className="py-2 px-4">Selected</th><th className="py-2 px-4">Status</th><th className="py-2 px-4"></th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {requests.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-slate-400">No requests right now.</td></tr>
            ) : requests.map((r) => (
              <tr key={r.id}>
                <td className="py-2 px-4 font-bold text-slate-900">{r.exam_name} — {r.subject_name}</td>
                <td className="py-2 px-4">{r.exam_date} · {r.start_time}–{r.end_time}</td>
                <td className="py-2 px-4">{r.required_count}</td>
                <td className="py-2 px-4">{r.selected_count} ({r.remaining} remaining)</td>
                <td className="py-2 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${r.status === 'FULFILLED' ? 'bg-emerald-100 text-emerald-700' : r.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{r.status}</span>
                </td>
                <td className="py-2 px-4">
                  <button onClick={() => openRequest(r)} className="text-violet-600 font-semibold">Review →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {activeRequest && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900"><Users className="w-4 h-4 text-violet-600" /> Select lecturers ({selected.size} / {activeRequest.required_count})</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {candidates.map((c) => (
              <label key={c.teacherId} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs ${!c.isAvailable ? 'bg-rose-50 border-rose-200 text-rose-700 opacity-75' : selected.has(c.teacherId) ? 'bg-violet-50 border-violet-400 text-violet-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                <span>
                  <span className="font-bold">{c.name}</span>
                  <span className="block text-[10px] text-current opacity-70">
                    {c.isAvailable ? `${c.currentInvigilationCount} duties today` : c.unavailableReason}
                  </span>
                </span>
                <input type="checkbox" disabled={!c.isAvailable} checked={selected.has(c.teacherId)} onChange={() => toggle(c.teacherId)} />
              </label>
            ))}
          </div>
          {!candidates.some((c) => c.isAvailable) && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600"><AlertTriangle className="w-3.5 h-3.5" /> No available lecturers in this department for this time slot.</div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setActiveRequest(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100">Cancel</button>
            <button onClick={submit} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700">
              <CheckCircle2 className="w-3.5 h-3.5" /> Submit Selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
