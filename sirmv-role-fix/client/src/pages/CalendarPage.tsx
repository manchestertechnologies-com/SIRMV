import React, { useState, useEffect } from 'react';
import { showToast } from '../utils/toast';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, X, Trash2, CalendarDays } from 'lucide-react';

const TYPE_STYLES: Record<string, string> = {
  HOLIDAY: 'bg-rose-50 border-rose-200 text-rose-700',
  EXAM: 'bg-amber-50 border-amber-200 text-amber-700',
  MEETING: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  EVENT: 'bg-emerald-50 border-emerald-200 text-emerald-700'
};

export const CalendarPage: React.FC = () => {
  const { user, currentBranch } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', event_date: '', end_date: '', event_type: 'EVENT' });
  const [error, setError] = useState<string | null>(null);

  const branchId = currentBranch?.id || '';
  const canManage = ['ADMIN', 'PRINCIPAL', 'HOD'].includes(user?.role || '');

  const load = async () => {
    try {
      const res = await apiFetch<any>(`/calendar?branch_id=${branchId}`);
      setEvents(res.events || []);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => { if (branchId) load(); }, [branchId]);

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.title || !form.event_date) {
      setError('Title and date are required.');
      return;
    }
    try {
      await apiFetch(`/calendar`, { method: 'POST', body: JSON.stringify({ ...form, branch_id: branchId }) });
      setForm({ title: '', description: '', event_date: '', end_date: '', event_type: 'EVENT' });
      setShowAdd(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Remove this event from the calendar?')) return;
    try { await apiFetch(`/calendar/${id}`, { method: 'DELETE' }); load(); } catch (err: any) { showToast(err.message, 'error'); }
  };

  // Group upcoming-first, grouped by month for readability
  const sorted = [...events].sort((a, b) => a.event_date.localeCompare(b.event_date));

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {canManage && (
        <div className="flex justify-end">
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">
            <Plus className="w-3.5 h-3.5" /> Add Event
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100">
        {sorted.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-10">No events on the college calendar yet.</p>
        )}
        {sorted.map((ev) => (
          <div key={ev.id} className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm">{ev.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${TYPE_STYLES[ev.event_type] || TYPE_STYLES.EVENT}`}>
                    {ev.event_type}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {ev.event_date}{ev.end_date ? ` – ${ev.end_date}` : ''}
                </p>
                {ev.description && <p className="text-xs text-slate-400 mt-0.5">{ev.description}</p>}
              </div>
            </div>
            {canManage && (
              <button onClick={() => deleteEvent(ev.id)}>
                <Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-rose-500" />
              </button>
            )}
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Add Calendar Event</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            {error && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{error}</div>}
            <form onSubmit={createEvent} className="space-y-3">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Event title"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none"
              />
              <select
                value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none"
              >
                <option value="EVENT">Event</option>
                <option value="HOLIDAY">Holiday</option>
                <option value="EXAM">Exam</option>
                <option value="MEETING">Meeting</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  type="date"
                  value={form.event_date}
                  onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none"
                />
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  placeholder="End date (optional)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none"
                />
              </div>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description (optional)"
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none"
              />
              <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">Save Event</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
