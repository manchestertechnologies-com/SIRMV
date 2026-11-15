import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, ShieldCheck, Wifi, Search, X, Pencil, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { pcApi, fmtDuration, PcAvailability, PcContact, PcDay, PcHistory, PcLive, PcParent, PcStudent, PcCallRow } from '../services/parentConnect';
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
                  {!isStudent && <span className="text-[11px] text-slate-500">Reg. {c.registerNumber}</span>}
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
const mins = (sec: number) => (sec >= 3600 ? `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m` : sec >= 60 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : `${sec}s`);
const clock = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
const stuSpec = (s: PcStudent): PortraitSpec => ({ seed: s.userId || s.id, gender: /^f/i.test(s.gender || '') ? 'Female' : 'Male', age: s.dob ? Math.max(15, new Date().getFullYear() - Number(s.dob.slice(0, 4))) : 17, role: 'student' });
const levelPill = (l: string) => l ? <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${l === 'II PU' ? 'bg-violet-50 text-violet-700' : 'bg-sky-50 text-sky-700'}`}>{l}</span> : <span className="text-slate-300">—</span>;

const Modal: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => (
  <div className="fixed inset-0 z-[60] bg-black/45 flex items-center justify-center p-3" onClick={onClose}>
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>{children}</div>
  </div>
);

const Dossier: React.FC<{ s: PcStudent; onClose: () => void; onChanged: () => void }> = ({ s, onClose, onChanged }) => {
  const [d, setD] = useState<{ contacts: PcParent[]; calls: PcCallRow[] } | null>(null);
  const [enabled, setEnabled] = useState(s.enabled);
  const [edit, setEdit] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [add, setAdd] = useState<{ relationship: string; name: string; phone: string } | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => { pcApi.dossier(s.id).then(setD).catch((e) => setErr(e.message)); }, [s.id]);
  useEffect(() => { load(); }, [load]);
  const run = async (fn: () => Promise<any>) => { setErr(''); try { await fn(); load(); onChanged(); } catch (e: any) { setErr(e?.message || 'Something went wrong.'); } };
  const toggleCalling = () => run(async () => { await pcApi.block(s.userId, enabled); setEnabled(!enabled); });
  const talk = d ? d.calls.reduce((a, c) => a + c.seconds, 0) : s.talkSeconds;
  const n = d ? d.calls.filter((c) => c.status !== 'ringing').length : s.callCount;
  const haveRel = new Set(d?.contacts.map((c) => c.relationship));

  return (
    <Modal onClose={onClose}>
      <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-extrabold text-slate-900 text-lg">Parent Voice Calling Dossier</h2>
          <p className="text-xs text-slate-500">Manage the calling permissions and parent contacts for this student.</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100" aria-label="Close"><X className="w-4 h-4 text-slate-500" /></button>
      </div>
      <div className="p-5 sm:p-6 space-y-5">
        {err && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">{err}</div>}
        <div className="flex items-center gap-4">
          <Avatar name={s.name} src={s.photo || undefined} person={stuSpec(s)} size={72} />
          <div className="min-w-0">
            <b className="block text-base text-slate-900 truncate">{s.name}</b>
            <div className="flex flex-wrap items-center gap-2 mt-1">{levelPill(s.level)}<span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">{s.tab}</span></div>
            <span className="text-[11px] text-slate-500">Roll: {s.registerNumber}{s.classLabel ? ` · ${s.classLabel}` : ''}</span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#fff6f4] border border-[#f1d9d3] p-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Total talk time</span>
            <b className="block text-2xl text-[#a3161b] mt-1">{mins(talk)}</b>
            <span className="text-[11px] text-slate-500">Across {n} call interaction{n === 1 ? '' : 's'}</span>
          </div>
          <div className={`rounded-2xl border p-4 ${enabled ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Calling permitted</span>
            <b className={`block text-lg mt-1 ${enabled ? 'text-emerald-700' : 'text-amber-700'}`}>{enabled ? 'ACTIVE' : 'DISABLED'}</b>
            <button onClick={toggleCalling} className={`mt-1 px-3 py-1.5 rounded-lg text-xs font-bold ${enabled ? 'bg-white text-red-700 border border-red-200 hover:bg-red-50' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>{enabled ? 'Disable Calling' : 'Enable Calling'}</button>
          </div>
        </div>

        <section>
          <h3 className="text-sm font-extrabold text-slate-900 mb-2">Authorized Parent Contacts &amp; Numbers</h3>
          {!d ? <Empty text="Loading contacts…" /> : d.contacts.length === 0 ? <Empty text="No parent contact is on file for this student." /> : (
            <div className="grid sm:grid-cols-2 gap-3">
              {d.contacts.map((c) => (
                <div key={c.id} className={`rounded-2xl border p-3.5 ${c.authorized ? 'border-[#ece4da] bg-[#fffdfa]' : 'border-red-100 bg-red-50/50'}`}>
                  <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{c.relationship}</span>
                    <button onClick={() => setEdit({ id: c.id, name: c.name, phone: c.phone })} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Edit contact"><Pencil className="w-3.5 h-3.5 text-slate-500" /></button></div>
                  {edit?.id === c.id ? (
                    <div className="space-y-1.5 mt-1">
                      <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs" placeholder="Name" />
                      <input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs" placeholder="+91 98765 43210" inputMode="tel" />
                      <div className="flex gap-2"><button onClick={() => run(async () => { await pcApi.editContact(edit.id, { name: edit.name, phone: edit.phone }); setEdit(null); })} className="px-3 py-1.5 rounded-lg bg-[#a3161b] text-white text-xs font-bold">Save</button><button onClick={() => setEdit(null)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold">Cancel</button></div>
                    </div>
                  ) : (
                    <>
                      <b className="block text-[14px] text-slate-900">{c.name}</b>
                      <span className="text-xs text-slate-600 inline-flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone ? (c.phone.startsWith('+') ? c.phone : `+91 ${c.phone}`) : 'No number saved'}</span>
                    </>
                  )}
                  <div className="mt-2.5 flex items-center justify-between">
                    {c.authorized ? <span className="text-[11px] font-bold text-emerald-700 inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />Authorized to Call</span> : <span className="text-[11px] font-bold text-red-700">Access revoked</span>}
                    <button onClick={() => run(() => pcApi.authorize(c.id, !c.authorized))} className={`text-[10px] font-bold ${c.authorized ? 'text-red-600 hover:underline' : 'text-emerald-700 hover:underline'}`}>{c.authorized ? 'REVOKE ACCESS' : 'RESTORE ACCESS'}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {d && (add ? (
            <div className="mt-3 grid sm:grid-cols-[110px_1fr_1fr_auto] gap-2 items-center">
              <select value={add.relationship} onChange={(e) => setAdd({ ...add, relationship: e.target.value })} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs">{['Father', 'Mother', 'Guardian'].map((r) => <option key={r}>{r}</option>)}</select>
              <input value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} placeholder="Name" className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
              <input value={add.phone} onChange={(e) => setAdd({ ...add, phone: e.target.value })} placeholder="Phone" inputMode="tel" className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
              <div className="flex gap-1.5"><button onClick={() => run(async () => { await pcApi.addContact(s.id, add); setAdd(null); })} className="px-3 py-1.5 rounded-lg bg-[#a3161b] text-white text-xs font-bold">Add</button><button onClick={() => setAdd(null)} className="px-2 py-1.5 rounded-lg bg-slate-100 text-xs">✕</button></div>
            </div>
          ) : <button onClick={() => setAdd({ relationship: haveRel.has('Father') ? (haveRel.has('Mother') ? 'Guardian' : 'Mother') : 'Father', name: '', phone: '' })} className="mt-3 text-xs font-bold text-[#a3161b] hover:underline">+ Add a contact</button>)}
        </section>

        <section>
          <h3 className="text-sm font-extrabold text-slate-900 mb-2">Detailed call activity &amp; interaction logs</h3>
          {!d ? null : d.calls.length === 0 ? <Empty text="No calls yet for this student." /> : (
            <ul className="divide-y divide-[#f3ede6] border border-[#f3ede6] rounded-2xl px-3">
              {d.calls.map((c) => {
                const miss = c.status === 'missed' || c.status === 'rejected';
                return (
                  <li key={c.id} className="flex items-center gap-3 py-2.5">
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${miss ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{miss ? <PhoneMissed className="w-4 h-4" /> : c.direction === 'outgoing' ? <PhoneOutgoing className="w-4 h-4" /> : <PhoneIncoming className="w-4 h-4" />}</span>
                    <div className="min-w-0 flex-1">
                      <b className="block text-[13px] text-slate-900 truncate"><span className="text-[10px] text-slate-500 uppercase mr-1.5">{c.direction}</span>{c.name || 'Parent'} <span className="text-slate-500 font-normal">({c.relationship})</span></b>
                      <span className="text-[11px] text-slate-500">{c.phone ? `${c.phone} · ` : ''}{clock(c.at)}</span>
                    </div>
                    {c.seconds > 0 && <span className="text-xs tabular-nums text-slate-600">{fmtDuration(c.seconds)}</span>}
                    {miss ? <Pill tone="amber">MISSED</Pill> : <Pill tone="green">COMPLETED</Pill>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <div className="flex justify-end"><button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-[#a3161b] hover:bg-[#8f1218] text-white text-sm font-bold">Done</button></div>
      </div>
    </Modal>
  );
};

const TimingMaintenance: React.FC = () => {
  const [rows, setRows] = useState<PcDay[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { pcApi.schedule().then(setRows).catch((e) => setMsg({ ok: false, t: e.message })); }, []);
  const upd = (d: number, patch: Partial<PcDay>) => setRows((rs) => rs.map((r) => (r.day_of_week === d ? { ...r, ...patch } : r)));
  const save = async () => { setMsg(null); setBusy(true); try { await pcApi.saveSchedule(rows); setMsg({ ok: true, t: 'Schedules saved. The new timings apply to the next call.' }); } catch (e: any) { setMsg({ ok: false, t: e.message }); } finally { setBusy(false); } };
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => { const r = rows.find((x) => x.day_of_week === d); if (!r) return null; return (
          <div key={d} className={`rounded-3xl border bg-white p-5 transition ${r.is_active ? 'border-[#ece4da]' : 'border-slate-200 opacity-70'}`}>
            <div className="flex items-center justify-between mb-4">
              <b className="text-base text-slate-900">{DAYS[d]}</b>
              <label className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-600 cursor-pointer"><input type="checkbox" checked={!!r.is_active} onChange={(e) => upd(d, { is_active: e.target.checked ? 1 : 0 })} className="accent-[#a3161b] w-4 h-4" />ACTIVE</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Start window</span><input type="time" value={r.start_time} disabled={!r.is_active} onChange={(e) => upd(d, { start_time: e.target.value })} className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold" /></label>
              <label className="block"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">End window</span><input type="time" value={r.end_time} disabled={!r.is_active} onChange={(e) => upd(d, { end_time: e.target.value })} className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold" /></label>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Max duration per call</span><b className="text-xs text-[#a3161b]">{r.max_duration_minutes} MINS</b></div>
              <input type="range" min={1} max={60} value={Math.min(60, r.max_duration_minutes)} disabled={!r.is_active} onChange={(e) => upd(d, { max_duration_minutes: Number(e.target.value) })} className="w-full accent-[#a3161b] mt-2" aria-label={`${DAYS[d]} maximum call length`} />
            </div>
          </div>); })}
      </div>
      {msg && <div className={`p-3 rounded-xl text-xs font-semibold border ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>{msg.t}</div>}
      <div className="flex justify-end"><button onClick={save} disabled={busy || rows.length === 0} className="px-6 py-3 rounded-2xl bg-[#a3161b] hover:bg-[#8f1218] disabled:opacity-60 text-white text-sm font-bold">{busy ? 'Saving…' : 'Save & Apply Schedules'}</button></div>
    </div>
  );
};

const AdminView: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [tab, setTab] = usePS<string>(T, 'tab2', 'Student Register');
  const [students, setStudents] = useState<PcStudent[] | null>(null);
  const [live, setLive] = useState<PcLive[]>([]);
  const [level, setLevel] = useState<'ALL' | 'I PU' | 'II PU'>('ALL');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<PcStudent | null>(null);
  const [err, setErr] = useState('');

  const loadRegister = useCallback(() => { pcApi.register().then((r) => { setStudents(r); setErr(''); }).catch((e) => setErr(e.message)); }, []);
  const loadLive = useCallback(() => { pcApi.live().then((r) => setLive(r.live)).catch(() => {}); }, []);
  useEffect(() => { loadRegister(); loadLive(); const t = setInterval(() => { loadLive(); loadRegister(); }, 8000); return () => clearInterval(t); }, [loadRegister, loadLive]);

  const shown = useMemo(() => (students || []).filter((s) => (level === 'ALL' || s.level === level) && (!q || `${s.name} ${s.registerNumber} ${s.tab}`.toLowerCase().includes(q.toLowerCase()))), [students, level, q]);
  const all = students || [];
  const totalSecs = all.reduce((a, s) => a + s.talkSeconds, 0);
  const endLive = async (id: string) => { await pcApi.end(id).catch((e) => setErr(e.message)); loadLive(); };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="rounded-3xl bg-gradient-to-br from-[#a3161b] to-[#7d1014] text-white p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onExit} className="p-2 rounded-xl bg-white/15 hover:bg-white/25 shrink-0" title="Back"><ArrowLeft className="w-4 h-4" /></button>
          <div className="min-w-0"><span className="text-[10px] font-bold tracking-widest text-white/70">ADMIN CONTROL</span><h1 className="text-lg sm:text-xl font-extrabold leading-tight">Voice Telephony &amp; Tablet Calling Gateway</h1></div>
        </div>
        <div className="flex bg-black/20 rounded-2xl p-1 self-start md:self-auto">
          {['Student Register', 'Timing Maintenance'].map((t) => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${tab === t ? 'bg-white text-[#a3161b]' : 'text-white/85 hover:bg-white/10'}`}>{t}</button>)}
        </div>
      </div>
      {err && (isAuthErr({ message: err }) ? <SessionNotice /> : <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">{err}</div>)}

      {tab === 'Timing Maintenance' ? <TimingMaintenance /> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard label="Total Tablets" value={all.length} tone="slate" />
            <StatCard label="Calling Enabled" value={all.filter((s) => s.enabled).length} tone="green" />
            <StatCard label="Total Talk Time Logged" value={mins(totalSecs)} tone="gold" />
          </div>
          {live.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 space-y-1.5">
              {live.map((l) => <div key={l.id} className="flex items-center gap-3 text-xs"><i className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><b className="flex-1 text-emerald-900">{l.parent_name} ↔ {l.student_name} · {l.status === 'ringing' ? 'ringing' : 'connected'}</b><button onClick={() => endLive(l.id)} className="px-3 py-1 rounded-lg bg-white text-red-700 font-bold border border-red-200">End call</button></div>)}
            </div>
          )}
          <Card title="Student Register" right={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-slate-100 rounded-xl p-0.5">{(['ALL', 'I PU', 'II PU'] as const).map((l) => <button key={l} onClick={() => setLevel(l)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${level === l ? 'bg-white text-[#a3161b] shadow-sm' : 'text-slate-500'}`}>{l}</button>)}</div>
              <label className="relative"><Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by student, roll no or tab" className="pl-7 pr-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl w-60 outline-none" /></label>
            </div>}>
            {!students ? <Empty text="Loading the register…" /> : shown.length === 0 ? <Empty text="No student matches this filter." /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead><tr className="text-left text-[10px] uppercase tracking-wide text-slate-500 border-b border-[#f3ede6]"><th className="py-2">Student</th><th>Roll number</th><th>PUC level</th><th>Tab number</th><th>Total talk time</th><th>Calling status</th><th className="text-right">Action</th></tr></thead>
                  <tbody>
                    {shown.map((s) => (
                      <tr key={s.id} className="border-b border-[#f7f2ec] hover:bg-[#fffaf8]">
                        <td className="py-2.5"><button onClick={() => setOpen(s)} className="flex items-center gap-3 text-left group"><Avatar name={s.name} src={s.photo || undefined} person={stuSpec(s)} size={40} /><b className="text-[13px] text-slate-900 group-hover:text-[#a3161b] group-hover:underline">{s.name}</b></button></td>
                        <td className="text-xs text-slate-600 tabular-nums">{s.registerNumber}</td>
                        <td>{levelPill(s.level)}</td>
                        <td className="text-xs font-bold text-slate-700">{s.tab}</td>
                        <td className="text-xs tabular-nums text-slate-700">{mins(s.talkSeconds)}</td>
                        <td>{s.enabled ? <Pill tone="green">ENABLED</Pill> : <Pill tone="red">DISABLED</Pill>}</td>
                        <td className="text-right"><button onClick={() => setOpen(s)} className="px-4 py-1.5 rounded-lg bg-[#a3161b] hover:bg-[#8f1218] text-white text-xs font-bold">Manage</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
      {open && <Dossier s={open} onClose={() => setOpen(null)} onChanged={loadRegister} />}
    </div>
  );
};

export const ParentConnectAcademic: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { user } = useAuth();
  if (user && ADMINS.includes(user.role)) return <AdminView onExit={onExit} />;
  if (user?.role === 'STUDENT' || user?.role === 'PARENT') return <FamilyView onExit={onExit} />;
  return <Empty text="Parent Connect is available to students, parents and the hostel office." />;
};
