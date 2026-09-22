import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Search, Plus, X, Phone, Mail, MapPin, Calendar, Award, Users,
  ArrowLeft, Briefcase, UserCog, ClipboardList, TrendingUp, CalendarX
} from 'lucide-react';

const NON_TEACHING_CATEGORIES = [
  { value: 'FLOOR_INCHARGE', label: 'Floor In-Charge' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'BUS', label: 'Bus' },
  { value: 'WARDEN', label: 'Warden' },
  { value: 'MESS', label: 'Mess' }
];

export const StaffsPage: React.FC = () => {
  const { currentBranch } = useAuth();
  const [tab, setTab] = useState<'teaching' | 'non-teaching'>('teaching');
  const [teaching, setTeaching] = useState<any[]>([]);
  const [nonTeaching, setNonTeaching] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const branchId = currentBranch?.id || '';

  const loadTeaching = async () => {
    try {
      const res = await apiFetch<any>(`/staff/teaching?branch_id=${branchId}&search=${encodeURIComponent(search)}`);
      setTeaching(res.teachers || []);
    } catch (err) { console.error(err); }
  };

  const loadNonTeaching = async () => {
    try {
      const qs = new URLSearchParams({ branch_id: branchId, search, ...(categoryFilter ? { category: categoryFilter } : {}) });
      const res = await apiFetch<any>(`/staff/non-teaching?${qs.toString()}`);
      setNonTeaching(res.staff || []);
    } catch (err) { console.error(err); }
  };

  const loadMeta = async () => {
    try {
      const res = await apiFetch<any>(`/branches/${branchId}/meta`);
      setDepartments(res.departments || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (!branchId) return;
    loadMeta();
  }, [branchId]);

  useEffect(() => {
    if (!branchId) return;
    if (tab === 'teaching') loadTeaching();
    else loadNonTeaching();
  }, [branchId, tab, search, categoryFilter]);

  if (selectedTeacherId) {
    return <TeacherDetail teacherId={selectedTeacherId} onBack={() => { setSelectedTeacherId(null); loadTeaching(); }} />;
  }
  if (selectedStaffId) {
    return <NonTeachingDetail staffId={selectedStaffId} onBack={() => { setSelectedStaffId(null); loadNonTeaching(); }} />;
  }

  return (
    <div className="space-y-5">
      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm">{message}</div>
      )}

      {/* Tabs + Actions */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold w-fit">
          <button
            onClick={() => setTab('teaching')}
            className={`px-4 py-1.5 rounded-xl transition ${tab === 'teaching' ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-500'}`}
          >
            Teaching Staff
          </button>
          <button
            onClick={() => setTab('non-teaching')}
            className={`px-4 py-1.5 rounded-xl transition ${tab === 'non-teaching' ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-500'}`}
          >
            Non-Teaching Staff
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, employee ID, phone..."
              className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none w-64"
            />
          </div>
          {tab === 'non-teaching' && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
            >
              <option value="">All Categories</option>
              {NON_TEACHING_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add {tab === 'teaching' ? 'Teacher' : 'Staff'}
          </button>
        </div>
      </div>

      {/* Lists */}
      {tab === 'teaching' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teaching.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTeacherId(t.id)}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition text-left space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                  {t.photo_url ? <img src={t.photo_url} className="w-full h-full object-cover" /> : <Briefcase className="w-5 h-5 text-indigo-600" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{t.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{t.designation} • {t.department_name || 'No Dept.'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                <span className="font-mono">{t.employee_id}</span>
                <span className={`px-2 py-0.5 rounded-full font-bold ${t.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {t.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </button>
          ))}
          {teaching.length === 0 && <p className="text-sm text-slate-400 col-span-full text-center py-10">No teaching staff found.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nonTeaching.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStaffId(s.id)}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition text-left space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center overflow-hidden shrink-0">
                  {s.photo_url ? <img src={s.photo_url} className="w-full h-full object-cover" /> : <UserCog className="w-5 h-5 text-amber-600" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{s.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {NON_TEACHING_CATEGORIES.find((c) => c.value === s.category)?.label || s.category} • {s.assigned_area || '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                <span className="font-mono">{s.employee_id}</span>
                <span className={`px-2 py-0.5 rounded-full font-bold ${s.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </button>
          ))}
          {nonTeaching.length === 0 && <p className="text-sm text-slate-400 col-span-full text-center py-10">No non-teaching staff found.</p>}
        </div>
      )}

      {showAddModal && (
        <AddStaffModal
          mode={tab}
          branchId={branchId}
          departments={departments}
          onClose={() => setShowAddModal(false)}
          onCreated={(msg) => {
            setShowAddModal(false);
            setMessage(msg);
            tab === 'teaching' ? loadTeaching() : loadNonTeaching();
            setTimeout(() => setMessage(null), 3500);
          }}
        />
      )}
    </div>
  );
};

/* ============================== ADD STAFF MODAL ============================== */

const AddStaffModal: React.FC<{
  mode: 'teaching' | 'non-teaching';
  branchId: string;
  departments: any[];
  onClose: () => void;
  onCreated: (msg: string) => void;
}> = ({ mode, branchId, departments, onClose, onCreated }) => {
  const [form, setForm] = useState<any>({ category: 'FLOOR_INCHARGE' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (field: string, value: any) => setForm((f: any) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (mode === 'teaching') {
        await apiFetch(`/staff/teaching`, {
          method: 'POST',
          body: JSON.stringify({ ...form, branch_id: branchId, username: form.username || `staff_${Date.now()}` })
        });
      } else {
        await apiFetch(`/staff/non-teaching`, { method: 'POST', body: JSON.stringify({ ...form, branch_id: branchId }) });
      }
      onCreated(`${mode === 'teaching' ? 'Teaching' : 'Non-teaching'} staff added successfully.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Add {mode === 'teaching' ? 'Teaching' : 'Non-Teaching'} Staff</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{error}</div>}

          <Field label="Full Name *">
            <input required value={form.name || ''} onChange={(e) => update('name', e.target.value)} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone"><input value={form.phone || ''} onChange={(e) => update('phone', e.target.value)} className="input" /></Field>
            <Field label="Email"><input value={form.email || ''} onChange={(e) => update('email', e.target.value)} className="input" /></Field>
          </div>
          <Field label="Address"><input value={form.address || ''} onChange={(e) => update('address', e.target.value)} className="input" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of Birth"><input type="date" value={form.date_of_birth || ''} onChange={(e) => update('date_of_birth', e.target.value)} className="input" /></Field>
            <Field label="Joining Date"><input type="date" value={form.joining_date || ''} onChange={(e) => update('joining_date', e.target.value)} className="input" /></Field>
          </div>

          {mode === 'teaching' ? (
            <>
              <Field label="Designation *">
                <input required value={form.designation || ''} onChange={(e) => update('designation', e.target.value)} placeholder="e.g. Assistant Professor" className="input" />
              </Field>
              <Field label="Department">
                <select value={form.department_id || ''} onChange={(e) => update('department_id', e.target.value)} className="input">
                  <option value="">Select department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Qualification">
                <input value={form.qualification || ''} onChange={(e) => update('qualification', e.target.value)} className="input" />
              </Field>
              <Field label="Username (login)">
                <input value={form.username || ''} onChange={(e) => update('username', e.target.value)} placeholder="auto-generated if left blank" className="input" />
              </Field>
            </>
          ) : (
            <>
              <Field label="Category *">
                <select required value={form.category} onChange={(e) => update('category', e.target.value)} className="input">
                  {NON_TEACHING_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Assigned Area">
                <input value={form.assigned_area || ''} onChange={(e) => update('assigned_area', e.target.value)} placeholder="e.g. Floor 2 / Bus Route 4 / Mess Hall 1" className="input" />
              </Field>
              <Field label="Shift">
                <select value={form.shift || ''} onChange={(e) => update('shift', e.target.value)} className="input">
                  <option value="">Select shift</option>
                  <option value="MORNING">Morning</option>
                  <option value="AFTERNOON">Afternoon</option>
                  <option value="EVENING">Evening</option>
                  <option value="FULL_DAY">Full Day</option>
                </select>
              </Field>
            </>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition disabled:opacity-50 mt-2"
          >
            {isSubmitting ? 'Saving...' : 'Save Staff Member'}
          </button>
        </form>
      </div>
      <style>{`.input { width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.55rem 0.75rem; font-size: 0.8rem; outline: none; }`}</style>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-[11px] font-bold text-slate-500 mb-1">{label}</label>
    {children}
  </div>
);

/* ============================== TEACHER DETAIL ============================== */

const TeacherDetail: React.FC<{ teacherId: string; onBack: () => void }> = ({ teacherId, onBack }) => {
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<'overview' | 'timetable' | 'leaves' | 'performance'>('overview');
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  const load = async () => {
    try {
      const res = await apiFetch<any>(`/staff/teaching/${teacherId}`);
      setData(res);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { load(); }, [teacherId]);

  const recordLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveDate) return;
    await apiFetch(`/staff/teaching/${teacherId}/leave`, { method: 'POST', body: JSON.stringify({ date: leaveDate, reason: leaveReason }) });
    setLeaveDate(''); setLeaveReason('');
    load();
  };

  if (!data) return <div className="text-sm text-slate-400 text-center py-16">Loading profile...</div>;
  const { profile, assignments, timetable, leaves, classesReplaced, classPerformance } = data;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Staff
      </button>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-indigo-100 overflow-hidden flex items-center justify-center shrink-0">
          {profile.photo_url ? <img src={profile.photo_url} className="w-full h-full object-cover" /> : <Briefcase className="w-8 h-8 text-indigo-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-900">{profile.name}</h2>
          <p className="text-xs text-slate-500">{profile.designation} • {profile.department_name || 'No Department'} {profile.is_hod ? '• HOD' : ''}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {profile.user_phone || profile.phone || '—'}</span>
            <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {profile.user_email || profile.email || '—'}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {profile.address || '—'}</span>
          </div>
        </div>
        <span className="font-mono text-[11px] bg-slate-100 px-3 py-1.5 rounded-lg text-slate-600">{profile.employee_id}</span>
      </div>

      <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold w-fit">
        {(['overview', 'timetable', 'leaves', 'performance'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-xl transition capitalize ${tab === t ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-500'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-800">Subjects, Classes & Sections Allotted</div>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left p-3">Subject</th><th className="text-left p-3">Class</th>
                <th className="text-left p-3">Section</th><th className="text-left p-3">Batch</th><th className="text-left p-3">Class Teacher</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a: any) => (
                <tr key={a.id} className="border-t border-slate-50">
                  <td className="p-3 font-semibold">{a.subject_name}</td>
                  <td className="p-3">{a.class_name}</td>
                  <td className="p-3">{a.section_name}</td>
                  <td className="p-3">{a.batch_name}</td>
                  <td className="p-3">{a.is_class_teacher ? <span className="text-emerald-600 font-bold">Yes</span> : '—'}</td>
                </tr>
              ))}
              {assignments.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-400">No assignments allotted.</td></tr>}
            </tbody>
          </table>

          <div className="p-4 border-t border-slate-100 font-bold text-sm text-slate-800">Classes Replaced (Substitutions)</div>
          <div className="divide-y divide-slate-50">
            {classesReplaced.map((c: any) => (
              <div key={c.id} className="p-3 text-xs flex items-center justify-between">
                <span>{c.date} • {c.subject_name} • {c.class_name}-{c.section_name}</span>
                <span className="text-slate-500">
                  {c.substitute_teacher_id === teacherId ? `Covered for ${c.original_teacher_name}` : `Covered by ${c.substitute_teacher_name}`}
                </span>
              </div>
            ))}
            {classesReplaced.length === 0 && <p className="p-4 text-center text-slate-400 text-xs">No substitution history.</p>}
          </div>
        </div>
      )}

      {tab === 'timetable' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr><th className="text-left p-3">Day</th><th className="text-left p-3">Period</th><th className="text-left p-3">Subject</th><th className="text-left p-3">Class</th><th className="text-left p-3">Room</th></tr>
            </thead>
            <tbody>
              {timetable.map((t: any) => (
                <tr key={t.id} className="border-t border-slate-50">
                  <td className="p-3">{t.day_of_week}</td>
                  <td className="p-3">P{t.period_number} ({t.start_time}-{t.end_time})</td>
                  <td className="p-3 font-semibold">{t.subject_name}</td>
                  <td className="p-3">{t.class_name}-{t.section_name}</td>
                  <td className="p-3">{t.room_number}</td>
                </tr>
              ))}
              {timetable.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-400">No timetable entries.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'leaves' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <form onSubmit={recordLeave} className="flex items-end gap-2 flex-wrap">
            <Field label="Leave Date"><input type="date" value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} className="input" /></Field>
            <Field label="Reason"><input value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} className="input" placeholder="Optional" /></Field>
            <button className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5">
              <CalendarX className="w-3.5 h-3.5" /> Record Leave
            </button>
          </form>
          <div className="divide-y divide-slate-50 border-t border-slate-100 pt-2">
            {leaves.map((l: any) => (
              <div key={l.id} className="py-2.5 text-xs flex items-center justify-between">
                <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {l.date}</span>
                <span className="text-slate-500">{l.reason || '—'}</span>
              </div>
            ))}
            {leaves.length === 0 && <p className="text-center text-slate-400 text-xs py-4">No leaves recorded.</p>}
          </div>
        </div>
      )}

      {tab === 'performance' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {classPerformance.map((p: any, i: number) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
              <p className="text-sm font-bold text-slate-900">{p.subject_name} — {p.class_name}-{p.section_name}</p>
              {p.latestExam ? (
                <>
                  <p className="text-[11px] text-slate-500">Latest: {p.latestExam.name}</p>
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-lg">
                    <TrendingUp className="w-4 h-4" /> {p.classPercentage ?? '—'}% class average
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="bg-emerald-50 rounded-lg p-2">
                      <p className="text-emerald-700 font-bold">Topper</p>
                      <p className="text-slate-600">{p.topper?.student_name || '—'} ({p.topper?.marks_obtained ?? '—'})</p>
                    </div>
                    <div className="bg-rose-50 rounded-lg p-2">
                      <p className="text-rose-700 font-bold">Weakest</p>
                      <p className="text-slate-600">{p.weakest?.student_name || '—'} ({p.weakest?.marks_obtained ?? '—'})</p>
                    </div>
                  </div>
                </>
              ) : <p className="text-xs text-slate-400">No exam data yet for this class/subject.</p>}
            </div>
          ))}
          {classPerformance.length === 0 && <p className="text-sm text-slate-400 col-span-full text-center py-10">No assignments to report on.</p>}
        </div>
      )}
      <style>{`.input { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.55rem 0.75rem; font-size: 0.8rem; outline: none; }`}</style>
    </div>
  );
};

/* ============================== NON-TEACHING DETAIL ============================== */

const NonTeachingDetail: React.FC<{ staffId: string; onBack: () => void }> = ({ staffId, onBack }) => {
  const [data, setData] = useState<any>(null);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  const load = async () => {
    try {
      const res = await apiFetch<any>(`/staff/non-teaching/${staffId}`);
      setData(res);
    } catch (err) { console.error(err); }
  };
  useEffect(() => { load(); }, [staffId]);

  const recordLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveDate) return;
    await apiFetch(`/staff/non-teaching/${staffId}/leave`, { method: 'POST', body: JSON.stringify({ date: leaveDate, reason: leaveReason }) });
    setLeaveDate(''); setLeaveReason('');
    load();
  };

  if (!data) return <div className="text-sm text-slate-400 text-center py-16">Loading profile...</div>;
  const { profile, leaves } = data;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Staff
      </button>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-amber-100 overflow-hidden flex items-center justify-center shrink-0">
          {profile.photo_url ? <img src={profile.photo_url} className="w-full h-full object-cover" /> : <UserCog className="w-8 h-8 text-amber-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-900">{profile.name}</h2>
          <p className="text-xs text-slate-500">
            {NON_TEACHING_CATEGORIES.find((c) => c.value === profile.category)?.label} • {profile.assigned_area || 'Unassigned'} • {profile.shift || 'Shift not set'}
          </p>
          <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {profile.phone || '—'}</span>
            <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {profile.email || '—'}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {profile.address || '—'}</span>
          </div>
        </div>
        <span className="font-mono text-[11px] bg-slate-100 px-3 py-1.5 rounded-lg text-slate-600">{profile.employee_id}</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <p className="font-bold text-sm text-slate-800 flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Leave Records</p>
        <form onSubmit={recordLeave} className="flex items-end gap-2 flex-wrap">
          <Field label="Leave Date"><input type="date" value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} className="input" /></Field>
          <Field label="Reason"><input value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} className="input" placeholder="Optional" /></Field>
          <button className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">Record Leave</button>
        </form>
        <div className="divide-y divide-slate-50 border-t border-slate-100 pt-2">
          {leaves.map((l: any) => (
            <div key={l.id} className="py-2.5 text-xs flex items-center justify-between">
              <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {l.date}</span>
              <span className="text-slate-500">{l.reason || '—'}</span>
            </div>
          ))}
          {leaves.length === 0 && <p className="text-center text-slate-400 text-xs py-4">No leaves recorded.</p>}
        </div>
      </div>
      <style>{`.input { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.55rem 0.75rem; font-size: 0.8rem; outline: none; }`}</style>
    </div>
  );
};
