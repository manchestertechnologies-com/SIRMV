import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, ShieldCheck, Wifi, Clock, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { pcApi, fmtDuration, PcAvailability, PcContact, PcDay, PcHistory, PcLive } from '../services/parentConnect';
import { personFor } from '../components/CallOverlay';
import { Avatar, Card, Empty, PageHead, Pill, StatCard, TabBar } from './ui';
import { usePS } from './persist';
import type { PortraitSpec } from '../utils/portrait';

const T = 'parent-connect';
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ADMINS = ['ADMIN', 'PRINCIPAL', 'WARDEN', 'HEAD_WARDEN'];

// portrait for a person we know from the contact list (student or parent of a pair)
const studentSpec = (c: PcContact): PortraitSpec => ({ seed: c.studentUserId, gender: /^f/i.test(c.studentGender || '') ? 'Female' : 'Male', age: c.dob ? Math.max(15, new Date().getFullYear() - Number(c.dob.slice(0, 4))) : 17, role: 'student' });
const parentSpec = (c: PcContact): PortraitSpec => ({ seed: c.parentUserId, gender: /^(mrs|ms|smt|miss)\b/i.test(c.parentName.trim()) ? 'Female' : 'Male', age: 46, role: 'parent' });

const isAuthErr = (e: any) => /token|expired|unauthori[sz]ed/i.test(e?.message || '');
const SessionNotice: React.FC = () => {
  const { logout } = useAuth();
  return (
    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1"><b>Please sign in again to use Parent Connect.</b><span className="block text-xs mt-0.5">Your sign-in is offline or has expired, so calls and hostel controls cannot reach the server yet.</span></div>
      <button onClick={logout} className="px-4 py-2 rounded-xl bg-[#a3161b] text-white text-xs font-bold hover:bg-[#8f1218]">Sign in again</button>
    </div>
  );
};

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
const statusPill = (h: PcHistory) => h.status === 'ended' ? <Pill tone="green">Completed</Pill> : h.status === 'missed' ? <Pill tone="amber">Missed</Pill> : h.status === 'rejected' ? <Pill tone="red">Declined</Pill> : <Pill tone="grey">{h.status}</Pill>;

const WindowBadge: React.FC<{ av: PcAvailability | null }> = ({ av }) => !av ? null : (
  <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${av.isAllowed ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
    <i className={`w-2 h-2 rounded-full ${av.isAllowed ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
    {av.isAllowed ? `Calling open until ${av.schedule?.end_time}` : av.reason || 'Calling is closed right now'}
  </span>
);

const HistoryList: React.FC<{ rows: PcHistory[]; admin?: boolean }> = ({ rows, admin }) => rows.length === 0 ? <Empty text="No calls yet." /> : (
  <ul className="divide-y divide-[#f3ede6]">
    {rows.map((h) => (
      <li key={h.id} className="flex items-center gap-3 py-2.5">
        <span className={`w-9 h-9 rounded-full flex items-center justify-center ${h.status === 'ended' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {h.status === 'missed' || h.status === 'rejected' ? <PhoneMissed className="w-4 h-4" /> : h.direction === 'out' ? <PhoneOutgoing className="w-4 h-4" /> : <PhoneIncoming className="w-4 h-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <b className="block text-[13px] text-slate-900 truncate">{admin ? `${h.parent_name} ↔ ${h.student_name}` : h.direction === 'out' ? 'You called' : 'Incoming call'}</b>
          <span className="text-[11px] text-slate-500">{when(h.initiated_at)}{h.end_reason === 'max_duration_exceeded' ? ' · reached time limit' : ''}</span>
        </div>
        {h.duration_seconds > 0 && <span className="text-xs tabular-nums text-slate-600">{fmtDuration(h.duration_seconds)}</span>}
        {statusPill(h)}
      </li>
    ))}
  </ul>
);

// ------------------------------------------------------------------ student / parent
const FamilyView: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { user } = useAuth();
  const { contacts, startCall, call, refreshContacts } = useCall();
  const [av, setAv] = useState<PcAvailability | null>(null);
  const [history, setHistory] = useState<PcHistory[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const isStudent = user?.role === 'STUDENT';

  const [authErr, setAuthErr] = useState(false);
  const load = useCallback(() => { pcApi.availability().then(setAv).catch((e) => { if (isAuthErr(e)) setAuthErr(true); }); pcApi.history().then(setHistory).catch(() => {}); }, []);
  useEffect(() => { load(); refreshContacts(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load, refreshContacts]);
  useEffect(() => { if (!call) load(); }, [call, load]);

  const dial = async (c: PcContact) => {
    setErr(''); setBusy(c.userId);
    try { await startCall(c); } catch (e: any) { setErr(e?.message || 'Could not start the call.'); } finally { setBusy(''); }
  };
  const done = history.filter((h) => h.status === 'ended').length;
  const secs = history.reduce((a, h) => a + (h.duration_seconds || 0), 0);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <PageHead title="Parent Connect" sub="Private voice calls between students and their parents over the internet. No phone number or SIM needed." onBack={onExit} right={<WindowBadge av={av} />} />
      {authErr && <SessionNotice />}
      {err && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">{err}</div>}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Calls so far" value={history.length} tone="slate" />
        <StatCard label="Completed" value={done} tone="green" />
        <StatCard label="Talk time" value={fmtDuration(secs)} tone="gold" />
      </div>
      <Card title={isStudent ? 'Your parents' : 'Your ward'} right={<span className="text-[11px] text-slate-500 inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />Verified link</span>}>
        {contacts.length === 0 ? <Empty text={isStudent ? 'No parent is linked to your account yet. Ask the hostel office to link one.' : 'No student is linked to your account yet. Ask the college office to link your ward.'} /> : (
          <div className="grid sm:grid-cols-2 gap-3">
            {contacts.map((c) => (
              <div key={c.pairKey} className="mt-tile-card rounded-2xl border border-[#ece4da] bg-[#fffdfa] p-4 flex items-center gap-3.5">
                <Avatar name={c.name} src={c.avatarUrl || undefined} person={isStudent ? parentSpec(c) : studentSpec(c)} size={64} />
                <div className="min-w-0 flex-1">
                  <b className="block text-[15px] text-slate-900 truncate">{c.name}</b>
                  <span className="text-[11px] text-slate-500 block">{c.relationship}{!isStudent && c.classLabel ? ` · ${c.classLabel}` : ''}</span>
                  {!isStudent && <span className="text-[11px] text-slate-400">Reg. {c.registerNumber}</span>}
                  {c.blocked && <span className="mt-1 inline-block"><Pill tone="amber">Calls switched off by hostel</Pill></span>}
                </div>
                <button disabled={!!call || !!busy || c.blocked || (av ? !av.isAllowed : false)} onClick={() => dial(c)}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#a3161b] hover:bg-[#8f1218] disabled:bg-slate-300 text-white text-xs font-bold transition">
                  <Phone className="w-4 h-4" />{busy === c.userId ? 'Starting…' : 'Call'}
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-[11px] text-slate-500 flex items-start gap-1.5"><Wifi className="w-3.5 h-3.5 mt-0.5 shrink-0" />Calls use your internet connection and your microphone. They are never recorded. Keep this page signed in to receive calls.</p>
      </Card>
      <Card title="Recent calls"><HistoryList rows={history} /></Card>
    </div>
  );
};

// ------------------------------------------------------------------ admin
const SchedulePanel: React.FC = () => {
  const [rows, setRows] = useState<PcDay[]>([]);
  const [msg, setMsg] = useState('');
  useEffect(() => { pcApi.schedule().then(setRows).catch((e) => setMsg(e.message)); }, []);
  const upd = (d: number, patch: Partial<PcDay>) => setRows(rows.map((r) => (r.day_of_week === d ? { ...r, ...patch } : r)));
  const save = async () => { setMsg(''); try { await pcApi.saveSchedule(rows); setMsg('Saved. New hours apply to the next call.'); } catch (e: any) { setMsg(e.message); } };
  return (
    <Card title="Calling hours" right={<button onClick={save} className="px-4 py-2 rounded-xl bg-[#a3161b] text-white text-xs font-bold hover:bg-[#8f1218]">Save hours</button>}>
      <p className="text-xs text-slate-500 mb-3">Calls are only allowed inside these hours (India time). A call is ended automatically at the maximum length.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] text-slate-500"><th className="py-2">Day</th><th>Open</th><th>From</th><th>To</th><th>Max call (min)</th></tr></thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 0].map((d) => { const r = rows.find((x) => x.day_of_week === d); if (!r) return null; return (
              <tr key={d} className="border-t border-[#f3ede6]">
                <td className="py-2 font-semibold text-slate-800">{DAYS[d]}</td>
                <td><input type="checkbox" checked={!!r.is_active} onChange={(e) => upd(d, { is_active: e.target.checked ? 1 : 0 })} className="accent-[#a3161b] w-4 h-4" aria-label={`${DAYS[d]} open`} /></td>
                <td><input type="time" value={r.start_time} onChange={(e) => upd(d, { start_time: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs" /></td>
                <td><input type="time" value={r.end_time} onChange={(e) => upd(d, { end_time: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs" /></td>
                <td><input type="number" min={1} max={120} value={r.max_duration_minutes} onChange={(e) => upd(d, { max_duration_minutes: Number(e.target.value) })} className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs" /></td>
              </tr>); })}
          </tbody>
        </table>
      </div>
      {msg && <p className="mt-3 text-xs font-semibold text-slate-700">{msg}</p>}
    </Card>
  );
};

const AdminView: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [tab, setTab] = usePS<string>(T, 'tab', 'Overview');
  const [av, setAv] = useState<PcAvailability | null>(null);
  const [live, setLive] = useState<PcLive[]>([]);
  const [stats, setStats] = useState({ calls24h: 0, completed24h: 0, missed24h: 0, seconds24h: 0 });
  const [families, setFamilies] = useState<PcContact[]>([]);
  const [history, setHistory] = useState<PcHistory[]>([]);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    pcApi.availability().then(setAv).catch(() => {});
    pcApi.live().then((r) => { setLive(r.live); setStats(r.stats); setErr(''); }).catch((e) => setErr(e.message));
    pcApi.history().then(setHistory).catch(() => {});
  }, []);
  useEffect(() => { load(); pcApi.contacts().then(setFamilies).catch(() => {}); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  const shown = useMemo(() => families.filter((f) => !q || `${f.studentName} ${f.parentName} ${f.registerNumber}`.toLowerCase().includes(q.toLowerCase())), [families, q]);
  const toggle = async (f: PcContact) => { await pcApi.block(f.studentUserId, !f.blocked).catch((e) => setErr(e.message)); pcApi.contacts().then(setFamilies); };
  const endLive = async (id: string) => { await pcApi.end(id).catch((e) => setErr(e.message)); load(); };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <PageHead title="Parent Connect" sub="Hostel control for student and parent voice calls" onBack={onExit} right={<WindowBadge av={av} />} />
      {err && (isAuthErr({ message: err }) ? <SessionNotice /> : <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">{err}</div>)}
      <TabBar items={['Overview', 'Families', 'Calling hours', 'Call log']} value={tab} onChange={setTab} />
      {tab === 'Overview' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Live calls now" value={live.length} tone="green" />
            <StatCard label="Calls in 24 h" value={stats.calls24h} tone="slate" />
            <StatCard label="Missed or declined" value={stats.missed24h} tone="gold" />
            <StatCard label="Talk time (24 h)" value={fmtDuration(stats.seconds24h)} />
          </div>
          <Card title="Calls happening now">
            {live.length === 0 ? <Empty text="No calls right now." /> : (
              <ul className="divide-y divide-[#f3ede6]">
                {live.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 py-2.5">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <div className="flex-1 min-w-0"><b className="text-[13px] text-slate-900">{l.parent_name} ↔ {l.student_name}</b><span className="block text-[11px] text-slate-500">{l.status === 'ringing' ? 'Ringing' : 'Connected'} · started {when(l.initiated_at)}</span></div>
                    <button onClick={() => endLive(l.id)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100">End call</button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Latest calls"><HistoryList rows={history.slice(0, 8)} admin /></Card>
        </>
      )}
      {tab === 'Families' && (
        <Card title={`Linked families (${families.length})`} right={<label className="relative"><Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="pl-7 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg w-40 outline-none" /></label>}>
          {shown.length === 0 ? <Empty text="No student has a parent login linked yet." /> : (
            <div className="grid md:grid-cols-2 gap-3">
              {shown.map((f) => (
                <div key={f.pairKey} className="rounded-2xl border border-[#ece4da] bg-[#fffdfa] p-3.5 flex items-center gap-3">
                  <div className="flex -space-x-3 shrink-0">
                    <Avatar name={f.studentName} src={f.studentAvatar || undefined} person={studentSpec(f)} size={46} />
                    <Avatar name={f.parentName} src={f.parentAvatar || undefined} person={parentSpec(f)} size={46} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <b className="block text-[13px] text-slate-900 truncate">{f.studentName}</b>
                    <span className="text-[11px] text-slate-500 block truncate">Parent: {f.parentName}</span>
                    <span className="text-[10px] text-slate-400">{f.registerNumber}{f.classLabel ? ` · ${f.classLabel}` : ''}{f.hostelite ? ' · Hosteller' : ''}</span>
                  </div>
                  <button onClick={() => toggle(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${f.blocked ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{f.blocked ? 'Allow calls' : 'Switch off'}</button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
      {tab === 'Calling hours' && <SchedulePanel />}
      {tab === 'Call log' && <Card title="Call log"><div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2"><Clock className="w-3.5 h-3.5" />Only the call details are kept. Conversations are never recorded.</div><HistoryList rows={history} admin /></Card>}
    </div>
  );
};

export const ParentConnectAcademic: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { user } = useAuth();
  if (user && ADMINS.includes(user.role)) return <AdminView onExit={onExit} />;
  if (user?.role === 'STUDENT' || user?.role === 'PARENT') return <FamilyView onExit={onExit} />;
  return <Empty text="Parent Connect is available to students, parents and the hostel office." />;
};
