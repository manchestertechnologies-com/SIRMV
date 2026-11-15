import React, { useMemo, useState } from 'react';
import { Plus, X, Search } from 'lucide-react';
import { Avatar, Card, Chip, Empty, PageHead, Pill, StatCard } from './ui';
import { usePS } from './persist';

type Stage = 'Enquiry' | 'Applied' | 'Documents verified' | 'Seat offered' | 'Fee paid' | 'Admitted' | 'Rejected';
const STAGES: Stage[] = ['Enquiry', 'Applied', 'Documents verified', 'Seat offered', 'Fee paid', 'Admitted'];
const STREAMS = ['PCMB', 'PCMC', 'PCME', 'LT - PCMB'];
const CLASSES = ['1st PUC', '2nd PUC', 'Long term'];
const SEATS: Record<string, number> = { '1st PUC': 160, '2nd PUC': 140, 'Long term': 60 };

interface Applicant { id: string; name: string; gender: 'Male' | 'Female'; parent: string; phone: string; sslc: number; board: string; cls: string; stream: string; stage: Stage; applied: string; hostel: boolean; source: string; note: string }

const FM = ['Adithya', 'Rahul', 'Karthik', 'Manoj', 'Pranav', 'Harsha', 'Naveen', 'Sachin', 'Darshan', 'Varun', 'Chetan', 'Mohith', 'Yashwanth', 'Sumanth', 'Abhishek', 'Rohan', 'Tejas', 'Nikhil', 'Vinay', 'Shreyas'];
const FF = ['Ananya', 'Divya', 'Meghana', 'Pooja', 'Shreya', 'Keerthi', 'Nandini', 'Sneha', 'Bhavana', 'Chaitra', 'Deepika', 'Harshitha', 'Kavya', 'Lakshmi', 'Namratha', 'Rakshitha', 'Sahana', 'Tejaswini', 'Vaishnavi', 'Spoorthi'];
const LN = ['Gowda', 'Naik', 'Shetty', 'Hegde', 'Patil', 'Reddy', 'Bhat', 'Rao', 'Kumar', 'Murthy', 'Prasad', 'Acharya'];
const BOARDS = ['State (SSLC)', 'State (SSLC)', 'CBSE', 'ICSE', 'State (SSLC)'];
const SOURCES = ['Walk-in', 'School visit', 'Referral', 'Website', 'Scholarship test', 'Hoarding / ad'];
const TOWNS = ['Shivamogga', 'Bhadravathi', 'Sagara', 'Thirthahalli', 'Shikaripura', 'Hosanagara', 'Davanagere', 'Chitradurga'];

const mulberry = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const baseApplicants = (): Applicant[] => {
  const r = mulberry(2026);
  const w: Stage[] = ['Enquiry', 'Enquiry', 'Applied', 'Applied', 'Applied', 'Documents verified', 'Documents verified', 'Seat offered', 'Fee paid', 'Admitted', 'Admitted', 'Admitted', 'Rejected'];
  return Array.from({ length: 72 }, (_, i) => {
    const female = r() < 0.48; const first = (female ? FF : FM)[Math.floor(r() * 20)]; const last = LN[Math.floor(r() * LN.length)];
    const day = 1 + Math.floor(r() * 28); const mo = 3 + Math.floor(r() * 3);
    const stage = w[Math.floor(r() * w.length)];
    return {
      id: `ADM-${2601 + i}`, name: `${first} ${last}`, gender: female ? 'Female' : 'Male', parent: `${FM[Math.floor(r() * 20)]} ${last}`,
      phone: `9${Math.floor(r() * 900000000 + 100000000)}`, sslc: Math.round((62 + r() * 36) * 10) / 10, board: BOARDS[Math.floor(r() * BOARDS.length)],
      cls: r() < 0.62 ? '1st PUC' : r() < 0.8 ? '2nd PUC' : 'Long term', stream: STREAMS[Math.floor(r() * STREAMS.length)], stage,
      applied: `2026-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`, hostel: r() < 0.55, source: SOURCES[Math.floor(r() * SOURCES.length)],
      note: stage === 'Rejected' ? 'Did not meet the minimum SSLC percentage for the chosen stream' : stage === 'Seat offered' ? 'Waiting for fee payment · offer valid for 7 days' : `From ${TOWNS[Math.floor(r() * TOWNS.length)]}`,
    };
  });
};

const tone = (s: Stage): 'green' | 'red' | 'amber' | 'grey' | 'gold' => s === 'Admitted' ? 'green' : s === 'Rejected' ? 'red' : s === 'Fee paid' ? 'gold' : s === 'Seat offered' ? 'amber' : 'grey';
const T = 'admission';

export const AdmissionAcademic: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [extra, setExtra] = useState<Applicant[]>(() => { try { return JSON.parse(localStorage.getItem('mt-adm-new') || '[]'); } catch { return []; } });
  const [over, setOver] = useState<Record<string, Stage>>(() => { try { return JSON.parse(localStorage.getItem('mt-adm-stage') || '{}'); } catch { return {}; } });
  const [stage, setStage] = usePS<string>(T, 'stage', 'All');
  const [cls, setCls] = usePS<string>(T, 'cls', 'All');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Applicant | null>(null);
  const [adding, setAdding] = useState(false);

  const all = useMemo(() => [...extra, ...baseApplicants()].map((a) => ({ ...a, stage: over[a.id] || a.stage })), [extra, over]);
  const shown = all.filter((a) => (stage === 'All' || a.stage === stage) && (cls === 'All' || a.cls === cls) && (!q || `${a.name} ${a.parent} ${a.id}`.toLowerCase().includes(q.toLowerCase())));
  const count = (s: Stage) => all.filter((a) => a.stage === s).length;
  const admitted = (c: string) => all.filter((a) => a.cls === c && (a.stage === 'Admitted' || a.stage === 'Fee paid')).length;

  const save = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } };
  const move = (a: Applicant, s: Stage) => { const next = { ...over, [a.id]: s }; setOver(next); save('mt-adm-stage', next); setOpen({ ...a, stage: s }); };
  const nextStage = (s: Stage): Stage | null => { const i = STAGES.indexOf(s); return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null; };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHead title="Admission" sub="SIR MV PU College · 2026-27 intake · enquiries, applications and seats" onBack={onExit}
        right={<button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#a3161b] text-white text-xs font-bold hover:bg-[#8f1218]"><Plus className="w-3.5 h-3.5" />New application</button>} />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total applicants" value={all.length} tone="slate" />
        <StatCard label="Awaiting documents" value={count('Applied')} tone="gold" />
        <StatCard label="Seat offered" value={count('Seat offered')} tone="gold" />
        <StatCard label="Admitted" value={count('Admitted')} tone="green" />
        <StatCard label="Rejected" value={count('Rejected')} />
      </div>
      <Card title="Seats filled">
        <div className="grid sm:grid-cols-3 gap-4">
          {CLASSES.map((c) => { const used = admitted(c); const pct = Math.min(100, Math.round((used / SEATS[c]) * 100)); return (
            <div key={c}>
              <div className="flex justify-between text-xs mb-1"><b className="text-slate-800">{c}</b><span className="text-slate-500">{used} of {SEATS[c]} seats</span></div>
              <div className="h-2.5 rounded-full bg-[#f3ede6] overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-[#a3161b] to-[#c28535] transition-all duration-700" style={{ width: `${pct}%` }} /></div>
            </div>); })}
        </div>
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        {['All', ...STAGES, 'Rejected'].map((s) => <Chip key={s} active={stage === s} onClick={() => setStage(s)}>{s === 'All' ? `All ${all.length}` : `${s} ${count(s as Stage)}`}</Chip>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {['All', ...CLASSES].map((c) => <Chip key={c} active={cls === c} onClick={() => setCls(c)}>{c === 'All' ? 'All classes' : c}</Chip>)}
        <label className="relative ml-auto"><Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or ID" className="pl-8 pr-3 py-2 text-xs bg-white border border-[#ded9cf] rounded-xl w-52 outline-none" /></label>
      </div>
      <Card className="!p-0 overflow-hidden">
        {shown.length === 0 ? <Empty text="No applications match." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-[#f6efe6] text-[11px] text-slate-600 text-left"><th className="py-2.5 px-4">Applicant</th><th>ID</th><th>Class · stream</th><th>SSLC</th><th>Applied</th><th>Status</th></tr></thead>
              <tbody>
                {shown.slice(0, 60).map((a) => (
                  <tr key={a.id} onClick={() => setOpen(a)} className="border-t border-[#f3ede6] cursor-pointer hover:bg-[#fff8f4]">
                    <td className="py-2 px-4"><span className="inline-flex items-center gap-2.5"><Avatar name={a.name} person={{ seed: a.id, gender: a.gender, age: 16, role: 'student' }} size={34} /><span><b className="block text-[13px] text-slate-900">{a.name}</b><span className="text-[11px] text-slate-500">Parent: {a.parent}</span></span></span></td>
                    <td className="text-slate-600 text-xs">{a.id}</td><td className="text-xs text-slate-700">{a.cls} · {a.stream}</td><td className="text-xs">{a.sslc}%</td>
                    <td className="text-xs text-slate-600">{new Date(a.applied).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td><td><Pill tone={tone(a.stage)}>{a.stage}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {shown.length > 60 && <p className="text-[11px] text-slate-500 text-center py-2">Showing the first 60 of {shown.length}. Use search or filters to narrow down.</p>}
      </Card>

      {open && (
        <div className="fixed inset-0 z-[70] bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOpen(null)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <Avatar name={open.name} person={{ seed: open.id, gender: open.gender, age: 16, role: 'student' }} size={64} />
              <div className="flex-1"><h3 className="font-bold text-lg text-slate-900 font-heading">{open.name}</h3><p className="text-xs text-slate-500">{open.id} · {open.cls} · {open.stream}</p><Pill tone={tone(open.stage)}>{open.stage}</Pill></div>
              <button onClick={() => setOpen(null)} aria-label="Close"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {[['Parent', open.parent], ['Phone', open.phone], ['Board', open.board], ['SSLC / Class 10', `${open.sslc}%`], ['Hostel needed', open.hostel ? 'Yes' : 'No'], ['Heard about us', open.source], ['Applied on', new Date(open.applied).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })]].map(([k, v]) => <div key={k}><dt className="text-slate-500">{k}</dt><dd className="font-semibold text-slate-800">{v}</dd></div>)}
            </dl>
            <p className="text-xs text-slate-600 bg-[#fbf6ee] rounded-xl p-3">{open.note}</p>
            <div className="flex flex-wrap gap-2">
              {nextStage(open.stage) && <button onClick={() => move(open, nextStage(open.stage)!)} className="px-4 py-2 rounded-xl bg-[#a3161b] text-white text-xs font-bold hover:bg-[#8f1218]">Move to “{nextStage(open.stage)}”</button>}
              {open.stage !== 'Rejected' && open.stage !== 'Admitted' && <button onClick={() => move(open, 'Rejected')} className="px-4 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold">Reject</button>}
              {open.stage === 'Rejected' && <button onClick={() => move(open, 'Applied')} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">Reopen</button>}
            </div>
          </div>
        </div>
      )}

      {adding && <AddForm onClose={() => setAdding(false)} onSave={(a) => { const next = [a, ...extra]; setExtra(next); save('mt-adm-new', next); setAdding(false); }} idNo={all.length + 2601} />}
    </div>
  );
};

const AddForm: React.FC<{ onClose: () => void; onSave: (a: Applicant) => void; idNo: number }> = ({ onClose, onSave, idNo }) => {
  const [f, setF] = useState({ name: '', parent: '', phone: '', sslc: '', cls: '1st PUC', stream: 'PCMB', gender: 'Male', board: 'State (SSLC)', hostel: false });
  const inp = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none';
  const ok = f.name.trim() && f.parent.trim() && /^\d{10}$/.test(f.phone) && Number(f.sslc) > 0 && Number(f.sslc) <= 100;
  return (
    <div className="fixed inset-0 z-[70] bg-black/45 flex items-center justify-center p-4" onClick={onClose}>
      <form className="bg-white rounded-3xl w-full max-w-md p-5 space-y-3" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); if (!ok) return; onSave({ id: `ADM-${idNo}`, name: f.name.trim(), gender: f.gender as 'Male' | 'Female', parent: f.parent.trim(), phone: f.phone, sslc: Number(f.sslc), board: f.board, cls: f.cls, stream: f.stream, stage: 'Applied', applied: new Date().toISOString().slice(0, 10), hostel: f.hostel, source: 'Walk-in', note: 'Application received at the office' }); }}>
        <div className="flex items-center justify-between"><h3 className="font-bold text-slate-900">New application</h3><button type="button" onClick={onClose} aria-label="Close"><X className="w-4 h-4 text-slate-500" /></button></div>
        <input className={inp} placeholder="Student name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className={inp} placeholder="Parent name" value={f.parent} onChange={(e) => setF({ ...f, parent: e.target.value })} />
        <div className="grid grid-cols-2 gap-2"><input className={inp} placeholder="Parent mobile (10 digits)" inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} /><input className={inp} placeholder="SSLC %" inputMode="decimal" value={f.sslc} onChange={(e) => setF({ ...f, sslc: e.target.value })} /></div>
        <div className="grid grid-cols-3 gap-2">
          <select className={inp} value={f.cls} onChange={(e) => setF({ ...f, cls: e.target.value })}>{CLASSES.map((c) => <option key={c}>{c}</option>)}</select>
          <select className={inp} value={f.stream} onChange={(e) => setF({ ...f, stream: e.target.value })}>{STREAMS.map((c) => <option key={c}>{c}</option>)}</select>
          <select className={inp} value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}><option>Male</option><option>Female</option></select>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={f.hostel} onChange={(e) => setF({ ...f, hostel: e.target.checked })} className="accent-[#a3161b]" />Hostel needed</label>
        <button disabled={!ok} className="w-full py-2.5 rounded-xl bg-[#a3161b] disabled:bg-slate-300 text-white text-xs font-bold">Save application</button>
      </form>
    </div>
  );
};
