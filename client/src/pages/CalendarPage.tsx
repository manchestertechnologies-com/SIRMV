import React, { useState, useEffect } from 'react';
import { showToast } from '../utils/toast';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, X, Trash2, CalendarDays } from 'lucide-react';
import { baseCalendar } from '../academic/calendarData';

const TYPE_STYLES: Record<string, string> = {
  HOLIDAY: 'bg-rose-50 border-rose-200 text-rose-700',
  EXAM: 'bg-amber-50 border-amber-200 text-amber-700',
  MEETING: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  TEST: 'bg-sky-50 border-sky-200 text-sky-700',
  EVENT: 'bg-emerald-50 border-emerald-200 text-emerald-700'
};
const FILTERS = ['ALL', 'HOLIDAY', 'EXAM', 'TEST', 'EVENT', 'MEETING'];
const LABEL: Record<string, string> = { ALL: 'All', HOLIDAY: 'Holidays', EXAM: 'Exams', TEST: 'Tests', EVENT: 'Events', MEETING: 'Meetings' };
const monthOf = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const dayBox = (d: string) => { const x = new Date(d + 'T00:00:00'); return [x.getDate(), x.toLocaleDateString('en-IN', { month: 'short' })]; };

export const CalendarPage: React.FC = () => {
  const { user, currentBranch } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', event_date: '', end_date: '', event_type: 'EVENT' });
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [showPast, setShowPast] = useState(false);

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
  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set(events.map((e) => `${e.title}|${String(e.event_date).slice(0, 10)}`));
  const all = [...events.map((e) => ({ ...e, event_date: String(e.event_date).slice(0, 10) })), ...baseCalendar().filter((b) => !seen.has(`${b.title}|${b.event_date}`))];
  const sorted = all
    .filter((e) => (filter === 'ALL' || e.event_type === filter) && (showPast || (e.end_date || e.event_date) >= today))
    .sort((a, b) => a.event_date.localeCompare(b.event_date));
  const groups = sorted.reduce<Record<string, any[]>>((acc, e) => { (acc[monthOf(e.event_date)] ||= []).push(e); return acc; }, {});
  const upcoming = all.filter((e) => e.event_date >= today && e.event_type !== 'HOLIDAY').sort((a, b) => a.event_date.localeCompare(b.event_date))[0];

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {canManage && (
        <div className="flex justify-end">
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">
            <Plus className="w-3.5 h-3.5" /> Add Event
          </button>
        </div>
      )}

      {upcoming && (
        <div className="rounded-2xl bg-gradient-to-r from-[#7a1014] to-[#a3161b] text-white p-4 flex items-center gap-3">
          <CalendarDays className="w-5 h-5 text-[#e6c28f]" />
          <div className="text-sm"><b>Next: {upcoming.title}</b><span className="block text-xs text-white/75">{dayBox(upcoming.event_date).join(' ')}{upcoming.end_date ? ` – ${dayBox(upcoming.end_date).join(' ')}` : ''}</span></div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => <button key={f} onClick={() => setFilter(f)} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border ${filter === f ? 'bg-[#a3161b] text-white border-[#a3161b]' : 'bg-white text-slate-700 border-[#ded9cf]'}`}>{LABEL[f]}</button>)}
        <label className="ml-auto text-xs text-slate-600 inline-flex items-center gap-1.5"><input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} className="accent-[#a3161b]" />Show past events</label>
      </div>
      {sorted.length === 0 && <p className="text-sm text-slate-500 text-center py-10 bg-white rounded-2xl border border-slate-200">Nothing to show for this filter.</p>}
      {Object.entries(groups).map(([month, list]) => (
        <section key={month} className="space-y-2">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{month}</h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100">
            {list.map((ev) => { const [dd, mm] = dayBox(ev.event_date); const past = (ev.end_date || ev.event_date) < today; return (
              <div key={ev.id} className={`flex items-center justify-between gap-3 p-3.5 ${past ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-[#fbf6ee] border border-[#ece4da] flex flex-col items-center justify-center shrink-0 leading-tight">
                    <b className="text-base text-[#7a1014]">{dd}</b><span className="text-[10px] text-slate-500 uppercase">{mm}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{ev.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${TYPE_STYLES[ev.event_type] || TYPE_STYLES.EVENT}`}>{LABEL[ev.event_type] ? LABEL[ev.event_type].replace(/s$/, '') : ev.event_type}</span>
                    </div>
                    <p className="text-xs text-slate-500">{ev.end_date && ev.end_date !== ev.event_date ? `${dayBox(ev.event_date).join(' ')} – ${dayBox(ev.end_date).join(' ')}` : new Date(ev.event_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long' })}</p>
                    {ev.description && <p className="text-xs text-slate-500 mt-0.5">{ev.description}</p>}
                  </div>
                </div>
                {canManage && !ev.builtin && (
                  <button onClick={() => deleteEvent(ev.id)} title="Remove event"><Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-rose-500" /></button>
                )}
              </div>); })}
          </div>
        </section>
      ))}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Add Calendar Event</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-4 h-4 text-slate-500" /></button>
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
