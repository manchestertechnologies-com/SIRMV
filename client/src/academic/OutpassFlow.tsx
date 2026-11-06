import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Camera, CheckCircle2, Download, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { allStudents, sectionById, Student } from './sampleData';
import { Avatar, Card, Chip, Pill, StatCard } from './ui';
import { Outpass, checksFor, downloadOutpassPdf, fmtDT, loadOutpasses, nextOutpassId, saveOutpasses } from './outpass';
import { compressImage } from './store';

const REASONS = ['Medical / hospital visit', 'Family function', 'Home visit (weekend)', 'Festival leave', 'Parent meeting', 'Personal work (approved by parent)'];
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export const OutpassFlow: React.FC = () => {
  const { user } = useAuth();
  const canDecide = ['ADMIN', 'PRINCIPAL', 'HEAD_WARDEN'].includes(user?.role || '');
  const [list, setList] = useState<Outpass[]>(loadOutpasses());
  const [mode, setMode] = useState<'list' | 'new'>('list');
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [openId, setOpenId] = useState<string | null>(null);
  const persist = (l: Outpass[]) => { saveOutpasses(l); setList(l); };
  const pending = list.filter((o) => o.status === 'Pending');
  const unseen = list.filter((o) => !o.seen).length;

  if (mode === 'new') return <NewOutpass onCancel={() => setMode('list')} onDone={(o) => { persist([o, ...list]); setOpenId(o.id); setMode('list'); }} existing={list} createdBy={user?.name || 'Warden'} />;

  const shown = list.filter((o) => filter === 'All' || o.status === filter);
  const open = list.find((o) => o.id === openId) || null;
  const decide = (o: Outpass, status: 'Approved' | 'Rejected', note: string) =>
    persist(list.map((x) => (x.id === o.id ? { ...x, status, note, decidedBy: user?.name || 'Head Warden', decidedAt: new Date().toISOString(), seen: true } : x)));
  const markSeen = (id: string) => { if (list.find((o) => o.id === id && !o.seen)) persist(list.map((o) => (o.id === id ? { ...o, seen: true } : o))); };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">{(['All', 'Pending', 'Approved', 'Rejected'] as const).map((f) => <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}{f === 'Pending' ? ` (${pending.length})` : ''}</Chip>)}</div>
        <div className="flex items-center gap-3">
          {canDecide && <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a3161b]" title="New requests waiting for the head warden"><Bell className="w-4 h-4" />{unseen} new</span>}
          <button onClick={() => setMode('new')} className="px-4 py-2 rounded-xl bg-[#a3161b] text-white text-xs font-semibold">New outpass</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total outpasses" value={list.length} tone="slate" />
        <StatCard label="Waiting for head warden" value={pending.length} tone="gold" />
        <StatCard label="Approved" value={list.filter((o) => o.status === 'Approved').length} tone="green" />
        <StatCard label="Rejected" value={list.filter((o) => o.status === 'Rejected').length} />
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-5 items-start">
        <Card title="Requests" className="!p-3">
          {shown.length === 0 ? <p className="text-sm text-slate-500 py-8 text-center">No outpasses yet. Press New outpass to create one with a photo and OTP.</p> : (
            <ul className="space-y-2 max-h-[560px] overflow-y-auto">
              {shown.map((o) => (
                <li key={o.id}>
                  <button onClick={() => { setOpenId(o.id); if (canDecide) markSeen(o.id); }} className={`w-full text-left flex items-center gap-3 p-2.5 rounded-xl border transition ${openId === o.id ? 'border-[#a3161b] bg-[#fff6f4]' : 'border-[#ece4da] hover:border-[#d9a85a]'}`}>
                    {o.photo ? <img src={o.photo} alt="" className="w-11 h-11 rounded-xl object-cover" /> : <Avatar name={o.name} size={44} square />}
                    <span className="min-w-0 flex-1"><b className="block text-sm text-slate-900 truncate">{o.name}</b><span className="block text-[11px] text-slate-500 truncate">{o.id} · {o.reason}</span></span>
                    <span className="flex flex-col items-end gap-1"><Pill tone={o.status === 'Approved' ? 'green' : o.status === 'Rejected' ? 'red' : 'amber'}>{o.status}</Pill>{!o.seen && <i className="w-2 h-2 rounded-full bg-[#a3161b]" />}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {open ? <Detail o={open} canDecide={canDecide} onDecide={decide} /> : <Card><p className="text-sm text-slate-500 py-16 text-center">Select an outpass to check its details.</p></Card>}
      </div>
    </div>
  );
};

const Detail: React.FC<{ o: Outpass; canDecide: boolean; onDecide: (o: Outpass, s: 'Approved' | 'Rejected', note: string) => void }> = ({ o, canDecide, onDecide }) => {
  const [note, setNote] = useState('');
  const checks = checksFor(o);
  const rows: [string, string][] = [['Student', o.name], ['Roll No', o.roll], ['Class', o.section], ['Hostel', `${o.block} · ${o.floor} · ${o.room}`], ['Warden', o.wardenName], ['Reason', o.reason], ['Destination', o.destination], ['Leaves', fmtDT(o.outAt)], ['Return by', fmtDT(o.returnBy)], ['Going with', `${o.guardian} (${o.guardianPhone})`], ['Created by', `${o.createdBy} · ${fmtDT(o.createdAt)}`]];
  return (
    <Card title={`${o.id}`} right={<div className="flex items-center gap-2"><Pill tone={o.status === 'Approved' ? 'green' : o.status === 'Rejected' ? 'red' : 'amber'}>{o.status}</Pill><button onClick={() => downloadOutpassPdf(o)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#ded9cf] text-xs font-semibold text-slate-700 hover:text-[#a3161b]"><Download className="w-3.5 h-3.5" />Download PDF</button></div>}>
      <div className="flex flex-col sm:flex-row gap-5">
        {o.photo ? <img src={o.photo} alt="Captured" className="w-36 h-44 rounded-2xl object-cover border border-[#ece4da] self-start" /> : <Avatar name={o.name} size={120} square />}
        <dl className="flex-1 grid gap-1.5 text-sm">{rows.map(([k, v]) => <div key={k} className="flex gap-3"><dt className="w-24 shrink-0 text-slate-500 text-xs pt-0.5">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}</dl>
      </div>
      <div className="mt-5 rounded-2xl bg-[#fcfaf7] border border-[#ece4da] p-4">
        <p className="text-xs font-bold text-slate-900 mb-2 inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#a3161b]" />Checks for the head warden</p>
        <ul className="space-y-1.5">{checks.map((c) => <li key={c.label} className="flex items-center gap-2 text-xs text-slate-700">{c.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-500" />}{c.label}</li>)}</ul>
      </div>
      {o.status === 'Pending' && canDecide && (
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#ded9cf] text-sm outline-none focus:border-[#c7222a]" />
          <button onClick={() => onDecide(o, 'Rejected', note)} className="px-4 py-2.5 rounded-xl border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50">Reject</button>
          <button onClick={() => onDecide(o, 'Approved', note)} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold">Approve</button>
        </div>
      )}
      {o.status === 'Pending' && !canDecide && <p className="mt-4 text-xs text-slate-500">Sent to the head warden. You will see the decision here once it is made.</p>}
      {o.decidedBy && <p className="mt-4 text-xs text-slate-600">{o.status} by <b>{o.decidedBy}</b>{o.note ? ` · ${o.note}` : ''}</p>}
    </Card>
  );
};

// ---------- wizard: details > photo > OTP > done ----------
const NewOutpass: React.FC<{ onCancel: () => void; onDone: (o: Outpass) => void; existing: Outpass[]; createdBy: string }> = ({ onCancel, onDone, existing, createdBy }) => {
  const hostelers = useMemo(() => allStudents().filter((s) => s.hostel && s.active), []);
  const [step, setStep] = useState(1);
  const [q, setQ] = useState('');
  const [stu, setStu] = useState<Student | null>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [dest, setDest] = useState('');
  const now = new Date();
  const [outAt, setOutAt] = useState(toLocalInput(new Date(now.getTime() + 30 * 60000)));
  const [retBy, setRetBy] = useState(toLocalInput(new Date(now.getTime() + 26 * 3600000)));
  const [guardian, setGuardian] = useState('');
  const [gphone, setGphone] = useState('');
  const [photo, setPhoto] = useState('');
  const [otp, setOtp] = useState(''); const [typed, setTyped] = useState(''); const [tries, setTries] = useState(0); const [err, setErr] = useState(''); const [cool, setCool] = useState(0);
  const matches = q.length >= 2 ? hostelers.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()) || s.roll.includes(q)).slice(0, 6) : [];

  useEffect(() => { if (cool <= 0) return; const t = setTimeout(() => setCool(cool - 1), 1000); return () => clearTimeout(t); }, [cool]);
  const sendOtp = () => { setOtp(String(Math.floor(100000 + Math.random() * 900000))); setTyped(''); setErr(''); setCool(30); };
  const pick = (s: Student) => { setStu(s); setQ(''); setGuardian(s.fatherName); setGphone(s.phone); };
  const detailsOk = !!stu && dest.trim().length > 1 && +new Date(retBy) > +new Date(outAt) && guardian.trim() && /^\d{10}$/.test(gphone);

  const verify = () => {
    if (typed === otp) { finish(); return; }
    const t = tries + 1; setTries(t); setErr(t >= 3 ? 'Too many wrong attempts. Send a new OTP.' : `That OTP does not match (${3 - t} tries left).`);
    if (t >= 3) setOtp('');
  };
  const finish = () => {
    if (!stu) return; const sec = sectionById(stu.sectionId)!;
    onDone({
      id: nextOutpassId(existing), studentId: stu.id, name: stu.name, roll: stu.roll, section: sec.title, block: stu.hostel!.block, floor: stu.hostel!.floor, room: stu.hostel!.room,
      wardenName: stu.warden?.name || '-', parentPhone: stu.phone, reason, destination: dest, outAt: new Date(outAt).toISOString(), returnBy: new Date(retBy).toISOString(),
      guardian, guardianPhone: gphone, photo, otpVerified: true, createdAt: new Date().toISOString(), createdBy, status: 'Pending', seen: false,
    });
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-2 text-xs">
        {['Details', 'Photo', 'OTP'].map((l, i) => <span key={l} className={`px-3 py-1.5 rounded-full font-semibold ${step === i + 1 ? 'bg-[#a3161b] text-white' : step > i + 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-white border border-[#ded9cf] text-slate-500'}`}>{i + 1}. {l}</span>)}
        <button onClick={onCancel} className="ml-auto text-slate-500 hover:text-[#a3161b] font-semibold">Cancel</button>
      </div>

      {step === 1 && (
        <Card title="Outpass details">
          {!stu ? (
            <div>
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search hostel student by name or roll number" className="w-full px-3.5 py-2.5 rounded-xl border border-[#ded9cf] text-sm outline-none focus:border-[#c7222a]" />
              <ul className="mt-2 space-y-1">{matches.map((s) => <li key={s.id}><button onClick={() => pick(s)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[#fff6f4] text-left"><Avatar name={s.name} pid={s.id} size={36} /><span className="text-sm"><b>{s.name}</b> <span className="text-slate-500 text-xs">· {sectionById(s.sectionId)!.title} · Roll {s.roll}</span></span></button></li>)}</ul>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#fcfaf7] border border-[#ece4da]">
                <Avatar name={stu.name} pid={stu.id} size={48} square />
                <div className="flex-1 text-sm"><b>{stu.name}</b><p className="text-xs text-slate-500">{sectionById(stu.sectionId)!.title} · Roll {stu.roll}</p><p className="text-xs text-slate-500">{stu.hostel!.block} · {stu.hostel!.floor} · {stu.hostel!.room} · Warden {stu.warden?.name}</p></div>
                <button onClick={() => setStu(null)} className="text-xs font-semibold text-[#a3161b]">Change</button>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="text-xs text-slate-500">Reason<select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-[#ded9cf] bg-white text-sm text-slate-900">{REASONS.map((r) => <option key={r}>{r}</option>)}</select></label>
                <label className="text-xs text-slate-500">Destination<input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="Town / hospital / address" className="mt-1 w-full px-3 py-2.5 rounded-xl border border-[#ded9cf] text-sm text-slate-900 outline-none focus:border-[#c7222a]" /></label>
                <label className="text-xs text-slate-500">Leaves at<input type="datetime-local" value={outAt} onChange={(e) => setOutAt(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-[#ded9cf] text-sm text-slate-900" /></label>
                <label className="text-xs text-slate-500">Returns by<input type="datetime-local" value={retBy} onChange={(e) => setRetBy(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-[#ded9cf] text-sm text-slate-900" /></label>
                <label className="text-xs text-slate-500">Going with<input value={guardian} onChange={(e) => setGuardian(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-[#ded9cf] text-sm text-slate-900 outline-none focus:border-[#c7222a]" /></label>
                <label className="text-xs text-slate-500">Guardian mobile (gets the OTP)<input value={gphone} onChange={(e) => setGphone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-[#ded9cf] text-sm text-slate-900 outline-none focus:border-[#c7222a]" /></label>
              </div>
              {+new Date(retBy) <= +new Date(outAt) && <p className="text-xs text-red-600">Return time must be after the leaving time.</p>}
              <div className="flex justify-end"><button disabled={!detailsOk} onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl bg-[#a3161b] text-white text-xs font-semibold disabled:opacity-40">Next: take photo</button></div>
            </div>
          )}
        </Card>
      )}

      {step === 2 && <PhotoStep photo={photo} onPhoto={setPhoto} onBack={() => setStep(1)} onNext={() => { sendOtp(); setStep(3); }} />}

      {step === 3 && stu && (
        <Card title="Confirm with OTP">
          <p className="text-sm text-slate-600">An OTP was sent to <b>+91 {gphone.slice(0, 2)}XXXXXX{gphone.slice(-2)}</b>. Ask the guardian for the 6 digit code.</p>
          {otp && <p className="mt-3 text-xs rounded-xl bg-[#fff8e8] border border-[#f0dcae] text-[#7a5410] px-3 py-2">Demo mode: SMS is not connected yet, so the code is shown here: <b className="tracking-widest text-sm">{otp}</b></p>}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input value={typed} onChange={(e) => setTyped(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter OTP" inputMode="numeric" className="w-40 px-4 py-3 rounded-xl border border-[#ded9cf] text-lg tracking-[0.35em] text-center outline-none focus:border-[#c7222a]" />
            <button disabled={typed.length !== 6 || !otp} onClick={verify} className="px-5 py-3 rounded-xl bg-[#a3161b] text-white text-xs font-semibold disabled:opacity-40">Confirm and send to head warden</button>
            <button disabled={cool > 0} onClick={() => { setTries(0); sendOtp(); }} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a3161b] disabled:text-slate-400"><RefreshCw className="w-3.5 h-3.5" />{cool > 0 ? `Resend in ${cool}s` : 'Resend OTP'}</button>
          </div>
          {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
          <button onClick={() => setStep(2)} className="mt-4 text-xs font-semibold text-slate-500">Back</button>
        </Card>
      )}
    </div>
  );
};

const PhotoStep: React.FC<{ photo: string; onPhoto: (p: string) => void; onBack: () => void; onNext: () => void }> = ({ photo, onPhoto, onBack, onNext }) => {
  const video = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null); const file = useRef<HTMLInputElement>(null);
  const [cam, setCam] = useState<'idle' | 'on' | 'denied'>('idle');
  const stop = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
  const start = async () => {
    try { const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }); stream.current = s; setCam('on'); setTimeout(() => { if (video.current) { video.current.srcObject = s; video.current.play().catch(() => {}); } }, 50); }
    catch { setCam('denied'); }
  };
  useEffect(() => () => stop(), []);
  const snap = () => {
    const v = video.current; if (!v) return; const c = document.createElement('canvas'); const k = Math.min(1, 480 / v.videoWidth);
    c.width = v.videoWidth * k; c.height = v.videoHeight * k; c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height); onPhoto(c.toDataURL('image/jpeg', 0.8)); stop(); setCam('idle');
  };
  return (
    <Card title="Capture student photo">
      <div className="flex flex-col sm:flex-row gap-5 items-start">
        <div className="w-60 h-72 rounded-2xl overflow-hidden bg-slate-100 border border-[#ece4da] flex items-center justify-center text-slate-400 text-xs text-center">
          {photo ? <img src={photo} alt="Captured" className="w-full h-full object-cover" /> : cam === 'on' ? <video ref={video} muted playsInline className="w-full h-full object-cover -scale-x-100" /> : <span className="px-4">No photo yet</span>}
        </div>
        <div className="space-y-3 text-sm">
          <p className="text-slate-600">Take the photo at the gate so the head warden can see who is leaving.</p>
          <div className="flex flex-wrap gap-2">
            {cam === 'on' ? <button onClick={snap} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#a3161b] text-white text-xs font-semibold"><Camera className="w-4 h-4" />Capture</button>
              : <button onClick={() => { onPhoto(''); start(); }} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#a3161b] text-white text-xs font-semibold"><Camera className="w-4 h-4" />{photo ? 'Retake' : 'Open camera'}</button>}
            <button onClick={() => file.current?.click()} className="px-4 py-2.5 rounded-xl border border-[#ded9cf] text-xs font-semibold text-slate-700">Use phone camera / upload</button>
            <input ref={file} type="file" accept="image/*" capture="user" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { onPhoto(await compressImage(f, 480)); } catch { /* ignore */ } } e.target.value = ''; }} />
          </div>
          {cam === 'denied' && <p className="text-xs text-red-600">Camera is blocked or not available. Allow camera access, or use the phone camera / upload button.</p>}
        </div>
      </div>
      <div className="mt-5 flex justify-between"><button onClick={onBack} className="text-xs font-semibold text-slate-500">Back</button><button disabled={!photo} onClick={onNext} className="px-5 py-2.5 rounded-xl bg-[#a3161b] text-white text-xs font-semibold disabled:opacity-40">Next: send OTP</button></div>
    </Card>
  );
};
