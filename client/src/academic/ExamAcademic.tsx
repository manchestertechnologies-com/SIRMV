import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Check, Wand2 } from 'lucide-react';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { SectionDef, Staff, allSections, getStudents, pct, staffById } from './sampleData';
import { Classroom, loadClassrooms, roomCapacity, totalCapacity, floorName } from './classrooms';
import { ExamPlan, clearPlan, freeFaculty, fmtTime, loadPlan, planStart, savePlan, todayIso } from './examPlan';
import { HallModel } from './ClassModel';
import { Avatar, Bar, Card, GREEN, AMBER, RED, PageHead, Pill, StatCard, TabBar } from './ui';

const Legacy = lazyWithRetry(() => import('../pages/ExamManagementModule').then((m) => ({ default: m.ExamManagementModule })));
const TABS = ['Set up exam', 'Live exam', 'Halls', 'Schedule & results'];
const field = 'mt-1 w-full px-3 py-2.5 rounded-xl border border-[#ded9cf] bg-white text-sm text-slate-900 outline-none focus:border-[#c7222a]';

interface Props { onExit: () => void; onOpenStaff?: (id: string) => void; onOpenBlueprint?: () => void }

export const ExamAcademic: React.FC<Props> = ({ onExit, onOpenStaff, onOpenBlueprint }) => {
  const [tab, setTab] = useState(loadPlan() ? 'Live exam' : 'Set up exam');
  const [ver, setVer] = useState(0);
  const open = (id: string) => onOpenStaff?.(id);
  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHead title="Exam Management" sub="Pick the classes, halls and invigilators in four easy steps" onBack={onExit} />
      <TabBar items={TABS} value={tab} onChange={setTab} />
      {tab === 'Set up exam' && <Setup key={ver} onSaved={() => { setVer((v) => v + 1); setTab('Live exam'); }} onOpenStaff={open} onOpenBlueprint={onOpenBlueprint} />}
      {tab === 'Live exam' && <Live key={ver} onOpenStaff={open} onSetup={() => setTab('Set up exam')} />}
      {tab === 'Halls' && <Halls key={ver} onOpenBlueprint={onOpenBlueprint} />}
      {tab === 'Schedule & results' && <Suspense fallback={<p className="text-sm text-slate-500 py-10 text-center">Loading…</p>}><Legacy /></Suspense>}
    </div>
  );
};

// clicking a faculty name opens that faculty's details
const StaffLink: React.FC<{ s: Pick<Staff, 'id' | 'name'>; onOpen: (id: string) => void; size?: number }> = ({ s, onOpen, size = 26 }) => (
  <button onClick={() => onOpen(s.id)} title="Open faculty details" className="inline-flex items-center gap-2 text-left font-medium text-slate-800 hover:text-[#a3161b] hover:underline"><Avatar name={s.name} pid={s.id} size={size} />{s.name}</button>
);

// smallest hall that fits, biggest class first
const autoHalls = (secs: SectionDef[], rooms: Classroom[]) => {
  const sorted = [...rooms].sort((a, b) => roomCapacity(a) - roomCapacity(b)); const used = new Set<string>(); const out: Record<string, string> = {};
  [...secs].sort((a, b) => b.count - a.count).forEach((s) => {
    const r = sorted.find((x) => !used.has(x.id) && roomCapacity(x) >= s.count) || [...sorted].reverse().find((x) => !used.has(x.id));
    if (r) { used.add(r.id); out[s.id] = r.id; }
  });
  return out;
};

// ---------- set up: 4 steps ----------
const STEPS = ['Exam', 'Classes', 'Halls', 'Faculty'];
const Setup: React.FC<{ onSaved: () => void; onOpenStaff: (id: string) => void; onOpenBlueprint?: () => void }> = ({ onSaved, onOpenStaff, onOpenBlueprint }) => {
  const rooms = useMemo(() => loadClassrooms(), []);
  const all = useMemo(() => allSections(), []);
  const saved = loadPlan();
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState<ExamPlan>(saved || { name: 'Grand Test 4', date: todayIso(), start: '09:00', durationMin: 180, sectionIds: [], halls: {}, inv: {} });
  const set = (p: Partial<ExamPlan>) => setPlan((x) => ({ ...x, ...p }));
  const picked = all.filter((s) => plan.sectionIds.includes(s.id));
  const needSeats = picked.reduce((a, s) => a + s.count, 0);

  const toggle = (id: string) => set({ sectionIds: plan.sectionIds.includes(id) ? plan.sectionIds.filter((x) => x !== id) : [...plan.sectionIds, id], halls: {}, inv: {} });
  const free = useMemo(() => freeFaculty(plan.date, plan.start, plan.durationMin, plan.sectionIds), [plan.date, plan.start, plan.durationMin, plan.sectionIds]);
  const hallsOk = picked.length > 0 && picked.every((s) => plan.halls[s.id]);
  const invOk = picked.length > 0 && picked.every((s) => plan.inv[s.id]);
  const canNext = step === 0 ? !!plan.name.trim() && !!plan.date && plan.durationMin > 0 : step === 1 ? picked.length > 0 : step === 2 ? hallsOk : invOk;
  const hint = step === 1 && !picked.length ? 'Choose at least one class.' : step === 2 && !hallsOk ? 'Give every class a hall.' : step === 3 && !invOk ? 'Choose an invigilator for every hall.' : '';

  const goNext = () => {
    if (step === 1 && !hallsOk) set({ halls: autoHalls(picked, rooms) });
    setStep(step + 1);
  };
  const autoFaculty = () => {
    const taken: string[] = []; const inv: Record<string, string> = {};
    picked.forEach((s) => { const f = freeFaculty(plan.date, plan.start, plan.durationMin, plan.sectionIds, taken).find((x) => x.subject !== 'Administration'); if (f) { inv[s.id] = f.id; taken.push(f.id); } });
    set({ inv });
  };
  const save = () => { savePlan(plan); onSaved(); };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 overflow-x-auto bg-white border border-[#ded9cf] rounded-2xl p-2">
        {STEPS.map((t, i) => (
          <React.Fragment key={t}>
            <button onClick={() => (i <= step || canNext) && setStep(i)} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${i === step ? 'bg-[#a3161b] text-white' : i < step ? 'text-emerald-700' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] ${i === step ? 'bg-white/25' : i < step ? 'bg-emerald-100' : 'bg-slate-100'}`}>{i < step ? <Check className="w-3 h-3" /> : i + 1}</span>{t}
            </button>
            {i < STEPS.length - 1 && <i className="w-6 h-px bg-[#e3dccf] shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {step === 0 && (
        <Card title="What is the exam?">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="text-xs text-slate-500 lg:col-span-2">Exam name<input value={plan.name} onChange={(e) => set({ name: e.target.value })} className={field} /></label>
            <label className="text-xs text-slate-500">Date<input type="date" value={plan.date} onChange={(e) => set({ date: e.target.value, inv: {} })} className={field} /></label>
            <label className="text-xs text-slate-500">Starts at<input type="time" value={plan.start} onChange={(e) => set({ start: e.target.value, inv: {} })} className={field} /></label>
            <label className="text-xs text-slate-500">How long (minutes)<select value={plan.durationMin} onChange={(e) => set({ durationMin: +e.target.value, inv: {} })} className={field}>{[60, 90, 120, 180, 200, 240].map((m) => <option key={m} value={m}>{m} minutes</option>)}</select></label>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card title="Which classes write it?" right={<span className="flex gap-3 text-xs font-semibold"><button onClick={() => set({ sectionIds: all.map((s) => s.id), halls: {}, inv: {} })} className="text-[#a3161b] hover:underline">Select all</button><button onClick={() => set({ sectionIds: [], halls: {}, inv: {} })} className="text-slate-500 hover:underline">Clear</button></span>}>
          {['11', '12', 'LT'].map((std) => (
            <div key={std} className="mb-4 last:mb-0">
              <p className="text-xs font-semibold text-slate-500 mb-2">{std === 'LT' ? 'Long Term' : `${std}th Standard`}</p>
              <div className="flex flex-wrap gap-2">
                {all.filter((s) => s.std === std).map((s) => { const on = plan.sectionIds.includes(s.id); return (
                  <button key={s.id} onClick={() => toggle(s.id)} className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left ${on ? 'bg-[#a3161b] text-white border-[#a3161b]' : 'bg-white text-slate-700 border-[#ded9cf] hover:border-[#a3161b]'}`}>{s.title}<span className={`block font-normal ${on ? 'text-white/80' : 'text-slate-500'}`}>{s.count} students</span></button>); })}
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-500 mt-2">{picked.length} classes · {needSeats} students need seats</p>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <Card title="Which hall for each class?" right={<button onClick={() => set({ halls: autoHalls(picked, rooms), inv: {} })} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a3161b] hover:underline"><Wand2 className="w-3.5 h-3.5" />Pick halls for me</button>}>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-500 border-b border-[#f0ebe4]"><th className="py-2 pr-3">Class</th><th className="pr-3">Students</th><th className="pr-3">Hall</th><th className="pr-3 w-36">Seats used</th><th>Fits?</th></tr></thead>
              <tbody>{picked.map((s) => { const r = rooms.find((x) => x.id === plan.halls[s.id]); const cap = r ? roomCapacity(r) : 0; const fill = r ? pct(s.count, cap) : 0; const takenByOthers = new Set(Object.entries(plan.halls).filter(([k]) => k !== s.id).map(([, v]) => v)); return (
                <tr key={s.id} className="border-b border-[#f7f2ec]">
                  <td className="py-2.5 pr-3 font-semibold text-slate-900">{s.title}</td><td className="pr-3">{s.count}</td>
                  <td className="pr-3"><select value={plan.halls[s.id] || ''} onChange={(e) => set({ halls: { ...plan.halls, [s.id]: e.target.value } })} className="px-2 py-1.5 rounded-lg border border-[#ded9cf] bg-white text-xs"><option value="">Choose a hall</option>{rooms.filter((x) => !takenByOthers.has(x.id)).map((x) => <option key={x.id} value={x.id}>{x.name} · {floorName(x.floor)} · {roomCapacity(x)} seats</option>)}</select></td>
                  <td className="pr-3">{r && <div className="flex items-center gap-2"><div className="flex-1"><Bar value={Math.min(100, fill)} color={fill > 100 ? RED : fill > 85 ? AMBER : GREEN} h="h-1.5" /></div><b className="text-xs w-9 text-right">{fill}%</b></div>}</td>
                  <td>{!r ? <Pill tone="gold">Pick a hall</Pill> : cap >= s.count ? <Pill tone="green">Fits</Pill> : <Pill tone="red">Short by {s.count - cap}</Pill>}</td>
                </tr>); })}</tbody>
            </table></div>
            <p className="text-[11px] text-slate-500 mt-3">Halls come from your Blueprint. {onOpenBlueprint && <button onClick={onOpenBlueprint} className="font-semibold text-[#a3161b] hover:underline">Change classrooms or benches in Blueprint</button>}</p>
          </Card>
          <HallModel rooms={rooms} sections={all} halls={plan.halls} />
        </div>
      )}

      {step === 3 && (
        <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
          <Card title="Who watches each hall?" right={<button onClick={autoFaculty} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a3161b] hover:underline"><Wand2 className="w-3.5 h-3.5" />Pick free faculty for me</button>}>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-500 border-b border-[#f0ebe4]"><th className="py-2 pr-3">Hall</th><th className="pr-3">Class</th><th>Invigilator (free faculty only)</th></tr></thead>
              <tbody>{picked.map((s) => { const taken = Object.entries(plan.inv).filter(([k]) => k !== s.id).map(([, v]) => v); const opts = free.filter((f) => !taken.includes(f.id)); const cur = plan.inv[s.id]; return (
                <tr key={s.id} className="border-b border-[#f7f2ec]">
                  <td className="py-2.5 pr-3 font-semibold text-slate-900">{rooms.find((x) => x.id === plan.halls[s.id])?.name || '-'}</td><td className="pr-3">{s.title}</td>
                  <td><select value={cur || ''} onChange={(e) => set({ inv: { ...plan.inv, [s.id]: e.target.value } })} className="px-2 py-1.5 rounded-lg border border-[#ded9cf] bg-white text-xs min-w-[220px]"><option value="">Choose faculty</option>{cur && !opts.some((o) => o.id === cur) && <option value={cur}>{staffById(cur)?.name}</option>}{opts.map((f) => <option key={f.id} value={f.id}>{f.name} · {f.subject}</option>)}</select></td>
                </tr>); })}</tbody>
            </table></div>
          </Card>
          <Card title={`Free faculty · ${free.length}`}>
            <p className="text-[11px] text-slate-500 mb-3">No lecture on {new Date(`${plan.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })} between {fmtTime(plan.start)} and {fmtTime(`${String(Math.floor(((+plan.start.slice(0, 2)) * 60 + +plan.start.slice(3) + plan.durationMin) / 60) % 24).padStart(2, '0')}:${String(((+plan.start.slice(0, 2)) * 60 + +plan.start.slice(3) + plan.durationMin) % 60).padStart(2, '0')}`)}. Tap a name to see their details.</p>
            <div className="space-y-1.5">
              {free.map((f) => <div key={f.id} className="flex items-center justify-between gap-2 text-xs"><StaffLink s={f} onOpen={onOpenStaff} size={22} /><span className="text-slate-500 shrink-0">{f.subject}</span></div>)}
              {free.length === 0 && <p className="text-xs text-slate-500">Nobody is free in this time. Change the start time.</p>}
            </div>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button disabled={step === 0} onClick={() => setStep(step - 1)} className="px-5 py-2.5 rounded-xl border border-[#ded9cf] bg-white text-sm font-semibold text-slate-700 disabled:opacity-40">Back</button>
        <span className="text-xs text-amber-700">{hint}</span>
        {step < 3 ? <button disabled={!canNext} onClick={goNext} className="px-6 py-2.5 rounded-xl bg-[#a3161b] text-white text-sm font-semibold disabled:opacity-40">Next</button>
          : <button disabled={!canNext} onClick={save} className="px-6 py-2.5 rounded-xl bg-[#a3161b] text-white text-sm font-semibold disabled:opacity-40">Save exam</button>}
      </div>
      {saved && <button onClick={() => { clearPlan(); setPlan({ name: 'Grand Test 4', date: todayIso(), start: '09:00', durationMin: 180, sectionIds: [], halls: {}, inv: {} }); setStep(0); }} className="text-xs font-semibold text-slate-500 hover:text-[#a3161b] hover:underline">Remove the saved exam and start again</button>}
    </div>
  );
};

// ---------- halls tab ----------
const Halls: React.FC<{ onOpenBlueprint?: () => void }> = ({ onOpenBlueprint }) => {
  const rooms = useMemo(() => loadClassrooms(), []); const secs = useMemo(() => allSections(), []); const plan = loadPlan();
  const strength = (plan ? secs.filter((s) => plan.sectionIds.includes(s.id)) : secs).reduce((a, s) => a + s.count, 0);
  const cap = totalCapacity(rooms);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Classrooms" value={rooms.length} tone="slate" />
        <StatCard label="Seats in college" value={cap} tone="green" />
        <StatCard label={plan ? 'Students in this exam' : 'Total students'} value={strength} />
        <StatCard label="Free seats" value={Math.max(0, cap - strength)} tone="gold" />
      </div>
      <HallModel rooms={rooms} sections={secs} halls={plan?.halls || {}} />
      <p className="text-xs text-slate-500">This model is your Blueprint. {onOpenBlueprint && <button onClick={onOpenBlueprint} className="font-semibold text-[#a3161b] hover:underline">Edit it in Blueprint</button>}</p>
    </div>
  );
};

// ---------- live exam ----------
const clock = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const samplePlan = (): ExamPlan => {
  const rooms = loadClassrooms(); const secs = allSections().filter((s) => s.std !== '11' && s.stream === 'PCMB');
  const d = new Date(); d.setMinutes(d.getMinutes() - 74); const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const start = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const ids = secs.map((s) => s.id); const taken: string[] = []; const inv: Record<string, string> = {};
  secs.forEach((s) => { const f = freeFaculty(date, start, 200, ids, taken)[0]; if (f) { inv[s.id] = f.id; taken.push(f.id); } });
  return { name: 'Grand Test 4', date, start, durationMin: 200, sectionIds: ids, halls: autoHalls(secs, rooms), inv };
};

const Live: React.FC<{ onOpenStaff: (id: string) => void; onSetup: () => void }> = ({ onOpenStaff, onSetup }) => {
  const saved = useMemo(() => loadPlan(), []);
  const plan = useMemo(() => saved || samplePlan(), [saved]);
  const rooms = useMemo(() => loadClassrooms(), []);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const start = planStart(plan); const endMs = +start + plan.durationMin * 60000;
  const state = +now < +start ? 'soon' : +now > endMs ? 'done' : 'live';
  const elapsed = Math.max(0, Math.min(plan.durationMin * 60, Math.floor((+now - +start) / 1000))); const left = Math.max(0, Math.floor((endMs - +now) / 1000));
  const rows = useMemo(() => allSections().filter((s) => plan.sectionIds.includes(s.id)).map((s, i) => {
    const studs = getStudents(s.id).filter((x) => x.active);
    const marks = studs.map((st, k) => ({ st, present: (st.no * 7 + i * 3 + k) % 13 !== 0, seat: k + 1, enter: new Date(+start + (k % 9) * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }));
    return { s, room: rooms.find((r) => r.id === plan.halls[s.id])?.name || '-', inv: staffById(plan.inv[s.id] || ''), marks, present: marks.filter((m) => m.present).length };
  }), [plan, rooms, start]);
  const [sel, setSel] = useState(rows[0]?.s.id);
  const cur = rows.find((r) => r.s.id === sel) || rows[0];
  const totalP = rows.reduce((a, r) => a + r.present, 0); const totalS = rows.reduce((a, r) => a + r.marks.length, 0);
  return (
    <div className="space-y-5">
      {!saved && <div className="rounded-xl bg-[#fff7e6] border border-[#f1dfb8] px-4 py-2.5 text-xs text-[#7a5518] flex items-center justify-between gap-3 flex-wrap">This is a sample exam. <button onClick={onSetup} className="font-semibold text-[#a3161b] hover:underline">Set up your own exam</button></div>}
      <div className="rounded-3xl bg-[#8f1218] text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><p className="inline-flex items-center gap-2 text-xs font-bold bg-white/15 rounded-full px-3 py-1"><i className={`w-2 h-2 rounded-full ${state === 'live' ? 'bg-emerald-400 animate-pulse' : 'bg-[#e6c28f]'}`} />{state === 'live' ? 'LIVE' : state === 'soon' ? 'NOT STARTED' : 'FINISHED'}</p><h2 className="mt-2 text-xl font-bold font-heading">{plan.name}</h2><p className="text-sm text-white/75">{start.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {plan.durationMin} minutes · {rows.length} halls</p></div>
        <div className="flex gap-6 text-center"><div><p className="text-[11px] text-white/60">Starts</p><p className="text-lg font-semibold">{start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p></div><div><p className="text-[11px] text-white/60">Elapsed</p><p className="text-lg font-semibold tabular-nums">{clock(elapsed)}</p></div><div><p className="text-[11px] text-white/60">Time left</p><p className="text-lg font-semibold tabular-nums text-[#e6c28f]">{clock(state === 'soon' ? plan.durationMin * 60 : left)}</p></div></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Halls in use" value={rows.length} tone="slate" /><StatCard label="Present" value={totalP} tone="green" suffix={`${pct(totalP, totalS)}% of ${totalS}`} /><StatCard label="Absent" value={totalS - totalP} /><StatCard label="Invigilators on duty" value={rows.filter((r) => r.inv).length} tone="gold" />
      </div>
      <Card title="Halls">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500 border-b border-[#f0ebe4]"><th className="py-2 pr-3">Hall</th><th className="pr-3">Class</th><th className="pr-3">Branch</th><th className="pr-3">Section</th><th className="pr-3">Invigilator</th><th className="pr-3">Present</th><th>Absent</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.s.id} onClick={() => setSel(r.s.id)} className={`border-b border-[#f7f2ec] cursor-pointer ${sel === r.s.id ? 'bg-[#fff6f4]' : 'hover:bg-[#fffaf7]'}`}>
                  <td className="py-2.5 pr-3 font-semibold text-slate-900">{r.room}</td><td className="pr-3">{r.s.std === 'LT' ? 'LT' : r.s.std + 'th'}</td><td className="pr-3">{r.s.stream} · {r.s.batch}</td><td className="pr-3">{r.s.code}</td>
                  <td className="pr-3" onClick={(e) => e.stopPropagation()}>{r.inv ? <StaffLink s={r.inv} onOpen={onOpenStaff} /> : <span className="text-slate-400">Not assigned</span>}</td>
                  <td className="pr-3 text-emerald-700 font-semibold">{r.present}</td><td className="text-red-600 font-semibold">{r.marks.length - r.present}</td>
                </tr>))}
            </tbody>
          </table>
        </div>
      </Card>
      {cur && (
        <Card title={`${cur.room} · ${cur.s.title} · students`} right={cur.inv ? <span className="text-[11px] text-slate-500">Invigilator <button onClick={() => onOpenStaff(cur.inv!.id)} className="font-semibold text-[#a3161b] hover:underline">{cur.inv.name}</button></span> : undefined}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-500 border-b border-[#f0ebe4]"><th className="py-2 pr-3">Seat</th><th className="pr-3">Student</th><th className="pr-3">Roll No</th><th className="pr-3">Status</th><th>Checked in</th></tr></thead>
              <tbody>
                {cur.marks.map((m) => (
                  <tr key={m.st.id} className="border-b border-[#f7f2ec]">
                    <td className="py-2 pr-3 text-slate-500">{m.seat}</td><td className="pr-3"><span className="inline-flex items-center gap-2"><Avatar name={m.st.name} pid={m.st.id} size={28} />{m.st.name}</span></td>
                    <td className="pr-3">{m.st.roll}</td><td className="pr-3"><Pill tone={m.present ? 'green' : 'red'}>{m.present ? 'Present' : 'Absent'}</Pill></td><td className="text-xs text-slate-600">{m.present ? m.enter : '-'}</td>
                  </tr>))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
