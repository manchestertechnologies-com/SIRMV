import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Check, Wand2 } from 'lucide-react';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { useAuth } from '../context/AuthContext';
import { SectionDef, Staff, SubjectName, TEACHING_SUBJECTS, allSections, getStudents, pct, staffById, staffOf } from './sampleData';
import { Classroom, loadClassrooms, roomCapacity, totalCapacity, floorName } from './classrooms';
import { ExamPlan, clearPlan, freeFaculty, fmtTime, loadPlan, planStart, savePlan, todayIso } from './examPlan';
import { HallModel } from './ClassModel';
import { DutyRequest, addNotes, loadNotes, loadRequests, markNotesRead, saveRequests } from './notify';
import { SeatingMode, benchCols, layoutSeats } from './seating';
import { Avatar, Bar, Card, GREEN, AMBER, RED, PageHead, Pill, StatCard, TabBar } from './ui';

const Legacy = lazyWithRetry(() => import('../pages/ExamManagementModule').then((m) => ({ default: m.ExamManagementModule })));

const field = 'mt-1 w-full px-3 py-2.5 rounded-xl border border-[#ded9cf] bg-white text-sm text-slate-900 outline-none focus:border-[#c7222a]';

interface Props { onExit: () => void; onOpenStaff?: (id: string) => void; onOpenBlueprint?: () => void }

export const ExamAcademic: React.FC<Props> = ({ onExit, onOpenStaff, onOpenBlueprint }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState(loadPlan() ? 'Live exam' : 'Set up exam');
  const [ver, setVer] = useState(0);
  const open = (id: string) => onOpenStaff?.(id);
  const role = user?.role || 'ADMIN';
  const showSetup = role !== 'HOD' && role !== 'TEACHER';
  const unread = loadNotes().filter((n) => !n.read && audience(n, role, user?.name)).length;
  const pending = loadRequests().filter((r) => r.status === 'pending').length;
  const tabs = [...(showSetup ? ['Set up exam'] : []), 'Live exam', ...(role === 'HOD' || role === 'ADMIN' || role === 'PRINCIPAL' ? [`Duty requests${pending ? ` (${pending})` : ''}`] : []), `Notifications${unread ? ` (${unread})` : ''}`, 'Halls', 'Schedule & results'];
  const cur = tabs.find((t) => t.split(' (')[0] === tab.split(' (')[0]) || tabs[0];
  const key = cur.split(' (')[0];
  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHead title="Exam Management" sub="Plan the exam, ask each HOD for invigilators, and follow it live" onBack={onExit} />
      <TabBar items={tabs} value={cur} onChange={setTab} />
      {key === 'Set up exam' && <Setup key={ver} onSaved={() => { setVer((v) => v + 1); setTab('Live exam'); }} onOpenStaff={open} onOpenBlueprint={onOpenBlueprint} />}
      {key === 'Live exam' && <Live key={ver} onOpenStaff={open} onSetup={() => setTab('Set up exam')} canSetup={showSetup} />}
      {key === 'Duty requests' && <Requests key={ver} onOpenStaff={open} userName={user?.name} onChanged={() => setVer((v) => v + 1)} />}
      {key === 'Notifications' && <Notifications key={ver} role={role} userName={user?.name} onOpenStaff={open} />}
      {key === 'Halls' && <Halls key={ver} onOpenBlueprint={onOpenBlueprint} />}
      {key === 'Schedule & results' && <Suspense fallback={<p className="text-sm text-slate-500 py-10 text-center">Loading…</p>}><Legacy /></Suspense>}
    </div>
  );
};

// who should see a notification
const audience = (n: { to: 'exam' | 'hod' | 'staff'; staffId?: string }, role: string, name?: string) => {
  if (role === 'ADMIN' || role === 'PRINCIPAL') return true;
  if (role === 'EXAM_DEPARTMENT') return n.to === 'exam';
  if (role === 'HOD') return n.to === 'hod';
  if (role === 'TEACHER') return n.to === 'staff' && (!name || !n.staffId || staffById(n.staffId)?.name === name || !getStaffNames().includes(name));
  return false;
};
const getStaffNames = () => allSections().length ? TEACHING_SUBJECTS.flatMap((d) => [...staffOf(d).teaching, ...(staffOf(d).hod ? [staffOf(d).hod!] : [])]).map((x) => x.name) : [];

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

const spreadDepts = (secs: SectionDef[]) => { const out: Record<string, SubjectName> = {}; secs.forEach((x, i) => { out[x.id] = TEACHING_SUBJECTS[i % TEACHING_SUBJECTS.length]; }); return out; };

// bench plan of one hall; zig-zag seats the class on every other seat first
const SeatingStep: React.FC<{ picked: SectionDef[]; rooms: Classroom[]; halls: Record<string, string>; mode: SeatingMode; onMode: (m: SeatingMode) => void }> = ({ picked, rooms, halls, mode, onMode }) => {
  const [sid, setSid] = useState(picked[0]?.id);
  const sec = picked.find((x) => x.id === sid) || picked[0]; const room = rooms.find((r) => r.id === halls[sec?.id || '']);
  if (!sec || !room) return <Card title="Seating">Pick a hall for each class first.</Card>;
  const seats = layoutSeats(room, sec.count, mode); const cols = benchCols(room); const placed = seats.filter((x) => x.student !== null).length;
  const benches = [...Array(room.benches).keys()];
  return (
    <Card title="How should students sit?">
      <div className="flex flex-wrap gap-2 mb-4">
        {([['zigzag', 'Zig-zag', 'Every other seat first, so nobody sits right next to a classmate'], ['straight', 'Straight', 'Bench by bench in roll order']] as [SeatingMode, string, string][]).map(([m, t, d]) => (
          <button key={m} onClick={() => onMode(m)} className={`text-left px-4 py-2.5 rounded-xl border ${mode === m ? 'bg-[#a3161b] text-white border-[#a3161b]' : 'bg-white border-[#ded9cf] text-slate-700'}`}><b className="block text-sm">{t}</b><span className={`text-[11px] ${mode === m ? 'text-white/80' : 'text-slate-500'}`}>{d}</span></button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-3">{picked.map((x) => <button key={x.id} onClick={() => setSid(x.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${sec.id === x.id ? 'bg-[#8c1118] text-white border-[#8c1118]' : 'bg-white text-slate-600 border-[#ded9cf]'}`}>{rooms.find((r) => r.id === halls[x.id])?.name} · {x.code}</button>)}</div>
      <p className="text-xs text-slate-500 mb-3">{room.name} · {sec.title} · {placed} of {sec.count} students seated on {room.benches} benches ({room.perBench} per bench). Numbers are seat order.</p>
      <div className="rounded-xl border-2 border-[#8c1118]/60 bg-[#fffdf9] p-3">
        <div className="text-center text-[11px] font-semibold text-slate-400 mb-2">Board</div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {benches.map((b) => { const row = Math.floor(b / cols); const col0 = b % cols; const col = row % 2 ? cols - 1 - col0 : col0; return (
            <div key={b} style={{ gridColumn: col + 1, gridRow: row + 1 }} className="rounded-lg border border-[#c28535]/70 bg-white p-1.5 flex gap-1">
              {seats.filter((x) => x.bench === b).map((x) => <span key={x.side} title={x.label} className={`flex-1 h-8 rounded-md text-[11px] font-bold inline-flex items-center justify-center ${x.student === null ? 'bg-slate-100 text-slate-300' : x.pass === 0 || mode === 'straight' ? 'bg-[#c28535] text-white' : 'bg-[#a3161b] text-white'}`}>{x.student === null ? '' : x.student + 1}</span>)}
            </div>); })}
        </div>
      </div>
      {mode === 'zigzag' && <p className="mt-3 text-[11px] text-slate-500"><i className="inline-block w-3 h-3 rounded-sm bg-[#c28535] align-middle mr-1" />first round (alternate seats) <i className="inline-block w-3 h-3 rounded-sm bg-[#a3161b] align-middle mx-1 ml-4" />second round fills the gaps</p>}
    </Card>
  );
};

// ---------- set up: 5 steps ----------
const STEPS = ['Exam', 'Classes', 'Halls', 'Seating', 'Faculty'];
const Setup: React.FC<{ onSaved: () => void; onOpenStaff: (id: string) => void; onOpenBlueprint?: () => void }> = ({ onSaved, onOpenStaff, onOpenBlueprint }) => {
  const rooms = useMemo(() => loadClassrooms(), []);
  const all = useMemo(() => allSections(), []);
  const saved = loadPlan();
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState<ExamPlan>(saved || { name: 'Grand Test 4', date: todayIso(), start: '09:00', durationMin: 180, sectionIds: [], halls: {}, inv: {}, seating: 'zigzag', reqDept: {} });
  const set = (p: Partial<ExamPlan>) => setPlan((x) => ({ ...x, ...p }));
  const picked = all.filter((s) => plan.sectionIds.includes(s.id));
  const needSeats = picked.reduce((a, s) => a + s.count, 0);

  const toggle = (id: string) => set({ sectionIds: plan.sectionIds.includes(id) ? plan.sectionIds.filter((x) => x !== id) : [...plan.sectionIds, id], halls: {}, inv: {} });
  const hallsOk = picked.length > 0 && picked.every((s) => plan.halls[s.id]);
  const canNext = step === 0 ? !!plan.name.trim() && !!plan.date && plan.durationMin > 0 : step === 1 ? picked.length > 0 : step === 2 ? hallsOk : true;
  const hint = step === 1 && !picked.length ? 'Choose at least one class.' : step === 2 && !hallsOk ? 'Give every class a hall.' : '';

  const goNext = () => {
    if (step === 1 && !hallsOk) set({ halls: autoHalls(picked, rooms) });
    setStep(step + 1);
  };
  const save = () => {
    const reqDept = { ...spreadDepts(picked), ...(plan.reqDept || {}) };
    const final: ExamPlan = { ...plan, inv: {}, reqDept, seating: plan.seating || 'zigzag' };
    savePlan(final);
    const now = Date.now();
    const reqs: DutyRequest[] = picked.map((x, i) => ({ id: `rq${now}-${i}`, examName: final.name, sectionId: x.id, hallName: rooms.find((r) => r.id === final.halls[x.id])?.name || '-', classTitle: x.title, date: final.date, start: final.start, durationMin: final.durationMin, sectionIds: final.sectionIds, dept: reqDept[x.id], status: 'pending', createdAt: now }));
    saveRequests(reqs);
    addNotes([
      ...reqs.map((r) => ({ to: 'hod' as const, dept: r.dept, text: `Exam Management asks for an invigilator: ${r.hallName} (${r.classTitle}) · ${r.examName} · ${new Date(`${r.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at ${fmtTime(r.start)}. Please assign a free faculty.` })),
      { to: 'exam' as const, text: `${final.name}: ${reqs.length} invigilator requests sent to the HODs. Waiting for assignment.` },
    ]);
    onSaved();
  };

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

      {step === 3 && <SeatingStep picked={picked} rooms={rooms} halls={plan.halls} mode={plan.seating || 'zigzag'} onMode={(m) => set({ seating: m })} />}

      {step === 4 && (
        <Card title="Ask the HODs for invigilators" right={<button onClick={() => set({ reqDept: spreadDepts(picked) })} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a3161b] hover:underline"><Wand2 className="w-3.5 h-3.5" />Spread across departments</button>}>
          <p className="text-xs text-slate-500 mb-3">Exam Management does not choose the faculty. Each request goes to the HOD you pick. The HOD sees which faculty are free at that time and assigns one. The faculty and Exam Management are notified, and the name shows against the class.</p>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500 border-b border-[#f0ebe4]"><th className="py-2 pr-3">Hall</th><th className="pr-3">Class</th><th className="pr-3">Ask the HOD of</th><th>HOD</th></tr></thead>
            <tbody>{picked.map((s) => { const d = (plan.reqDept || {})[s.id] || 'Physics'; const hod = staffOf(d).hod; return (
              <tr key={s.id} className="border-b border-[#f7f2ec]">
                <td className="py-2.5 pr-3 font-semibold text-slate-900">{rooms.find((x) => x.id === plan.halls[s.id])?.name || '-'}</td><td className="pr-3">{s.title}</td>
                <td className="pr-3"><select value={d} onChange={(e) => set({ reqDept: { ...(plan.reqDept || {}), [s.id]: e.target.value as SubjectName } })} className="px-2 py-1.5 rounded-lg border border-[#ded9cf] bg-white text-xs">{TEACHING_SUBJECTS.map((x) => <option key={x} value={x}>{x}</option>)}</select></td>
                <td>{hod ? <StaffLink s={hod} onOpen={onOpenStaff} /> : '-'}</td>
              </tr>); })}</tbody>
          </table></div>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3">
        <button disabled={step === 0} onClick={() => setStep(step - 1)} className="px-5 py-2.5 rounded-xl border border-[#ded9cf] bg-white text-sm font-semibold text-slate-700 disabled:opacity-40">Back</button>
        <span className="text-xs text-amber-700">{hint}</span>
        {step < 4 ? <button disabled={!canNext} onClick={goNext} className="px-6 py-2.5 rounded-xl bg-[#a3161b] text-white text-sm font-semibold disabled:opacity-40">Next</button>
          : <button disabled={!canNext} onClick={save} className="px-6 py-2.5 rounded-xl bg-[#a3161b] text-white text-sm font-semibold disabled:opacity-40">Save and send to HODs</button>}
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

const Live: React.FC<{ onOpenStaff: (id: string) => void; onSetup: () => void; canSetup: boolean }> = ({ onOpenStaff, onSetup, canSetup }) => {
  const saved = useMemo(() => loadPlan(), []);
  const plan = useMemo(() => saved || samplePlan(), [saved]);
  const rooms = useMemo(() => loadClassrooms(), []);
  const reqs = useMemo(() => loadRequests(), []);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const start = planStart(plan); const endMs = +start + plan.durationMin * 60000;
  const state = +now < +start ? 'soon' : +now > endMs ? 'done' : 'live';
  const elapsed = Math.max(0, Math.min(plan.durationMin * 60, Math.floor((+now - +start) / 1000))); const left = Math.max(0, Math.floor((endMs - +now) / 1000));
  const rows = useMemo(() => allSections().filter((s) => plan.sectionIds.includes(s.id)).map((s, i) => {
    const req = reqs.find((q) => q.sectionId === s.id && q.examName === plan.name);
    const studs = getStudents(s.id).filter((x) => x.active);
    const hall = rooms.find((r) => r.id === plan.halls[s.id]); const seatOf = hall ? layoutSeats(hall, studs.length, plan.seating || 'zigzag') : [];
    const marks = studs.map((st, k) => ({ st, present: (st.no * 7 + i * 3 + k) % 13 !== 0, seat: seatOf.find((x) => x.student === k)?.label || String(k + 1), enter: new Date(+start + (k % 9) * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }));
    return { s, room: rooms.find((r) => r.id === plan.halls[s.id])?.name || '-', inv: staffById(req?.staffId || plan.inv[s.id] || ''), wait: req && req.status === 'pending' ? req.dept : null, marks, present: marks.filter((m) => m.present).length };
  }), [plan, rooms, start, reqs]);
  const [sel, setSel] = useState(rows[0]?.s.id);
  const cur = rows.find((r) => r.s.id === sel) || rows[0];
  const totalP = rows.reduce((a, r) => a + r.present, 0); const totalS = rows.reduce((a, r) => a + r.marks.length, 0);
  return (
    <div className="space-y-5">
      {!saved && <div className="rounded-xl bg-[#fff7e6] border border-[#f1dfb8] px-4 py-2.5 text-xs text-[#7a5518] flex items-center justify-between gap-3 flex-wrap">This is a sample exam.{canSetup && <button onClick={onSetup} className="font-semibold text-[#a3161b] hover:underline">Set up your own exam</button>}</div>}
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
                  <td className="pr-3" onClick={(e) => e.stopPropagation()}>{r.inv ? <StaffLink s={r.inv} onOpen={onOpenStaff} /> : r.wait ? <Pill tone="gold">Waiting for {r.wait} HOD</Pill> : <span className="text-slate-400">Not assigned</span>}</td>
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
              <thead><tr className="text-left text-xs text-slate-500 border-b border-[#f0ebe4]"><th className="py-2 pr-3">Seat (row-bench)</th><th className="pr-3">Student</th><th className="pr-3">Roll No</th><th className="pr-3">Status</th><th>Checked in</th></tr></thead>
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

// ---------- HOD: assign free faculty ----------
const Requests: React.FC<{ onOpenStaff: (id: string) => void; userName?: string; onChanged: () => void }> = ({ onOpenStaff, userName, onChanged }) => {
  const [reqs, setReqs] = useState(loadRequests());
  const myDept = TEACHING_SUBJECTS.find((d) => staffOf(d).hod?.name === userName);
  const [dept, setDept] = useState<string>(myDept || 'All');
  const [more, setMore] = useState<Record<string, boolean>>({});
  const [pick, setPick] = useState<Record<string, string>>({});
  const shown = reqs.filter((r) => dept === 'All' || r.dept === dept).sort((a, b) => (a.status === b.status ? 0 : a.status === 'pending' ? -1 : 1));
  const assign = (r: DutyRequest, staffId: string) => {
    const st = staffById(staffId); if (!st) return;
    const next = reqs.map((x) => (x.id === r.id ? { ...x, status: 'assigned' as const, staffId, assignedAt: Date.now() } : x));
    saveRequests(next); setReqs(next);
    const when = `${new Date(`${r.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at ${fmtTime(r.start)}`;
    addNotes([
      { to: 'staff', staffId, text: `You are the invigilator for ${r.hallName} (${r.classTitle}) · ${r.examName} · ${when}, ${r.durationMin} minutes. Assigned by the ${r.dept} HOD.` },
      { to: 'exam', text: `${st.name} (${st.subject}) is assigned to ${r.hallName} · ${r.classTitle} for ${r.examName}.` },
    ]);
    onChanged();
  };
  const counts = (d: string) => reqs.filter((r) => (d === 'All' || r.dept === d) && r.status === 'pending').length;
  if (!reqs.length) return <Card title="Duty requests"><p className="text-sm text-slate-500">No requests yet. When Exam Management saves an exam, the requests for each department arrive here.</p></Card>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">{['All', ...TEACHING_SUBJECTS.filter((d) => reqs.some((r) => r.dept === d))].map((d) => <button key={d} onClick={() => setDept(d)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${dept === d ? 'bg-[#a3161b] text-white border-[#a3161b]' : 'bg-white text-slate-600 border-[#ded9cf]'}`}>{d}{counts(d) ? ` · ${counts(d)} waiting` : ''}</button>)}</div>
      {shown.map((r) => {
        const takenIds = reqs.filter((x) => x.status === 'assigned' && x.staffId && x.date === r.date && x.start === r.start).map((x) => x.staffId!);
        const free = freeFaculty(r.date, r.start, r.durationMin, r.sectionIds, takenIds);
        const mine = free.filter((f) => f.subject === r.dept); const others = free.filter((f) => f.subject !== r.dept);
        const list = more[r.id] ? [...mine, ...others] : mine; const who = r.staffId ? staffById(r.staffId) : null;
        return (
          <Card key={r.id} title={`${r.hallName} · ${r.classTitle}`} right={r.status === 'pending' ? <Pill tone="gold">Needs faculty</Pill> : <Pill tone="green">Assigned</Pill>}>
            <p className="text-xs text-slate-500">{r.examName} · {new Date(`${r.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })} · {fmtTime(r.start)} for {r.durationMin} minutes · asked of the {r.dept} HOD</p>
            {r.status === 'assigned' && who ? (
              <p className="mt-3 text-sm flex items-center gap-2">Invigilator <StaffLink s={who} onOpen={onOpenStaff} /></p>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-xs font-semibold text-slate-700">Free faculty at this time · {list.length}</p>
                <div className="flex flex-wrap gap-2">
                  {list.map((f) => <button key={f.id} onClick={() => setPick({ ...pick, [r.id]: f.id })} className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs ${pick[r.id] === f.id ? 'border-[#a3161b] bg-[#fff1ee] font-semibold' : 'border-[#ded9cf] bg-white'}`}><Avatar name={f.name} pid={f.id} size={22} />{f.name}<span className="text-slate-400">{f.subject}</span></button>)}
                  {list.length === 0 && <span className="text-xs text-slate-500">Nobody in {r.dept} is free. Show other departments.</span>}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button disabled={!pick[r.id]} onClick={() => assign(r, pick[r.id])} className="px-4 py-2 rounded-xl bg-[#a3161b] text-white text-xs font-semibold disabled:opacity-40">{pick[r.id] ? `Assign ${staffById(pick[r.id])?.name}` : 'Choose a faculty'}</button>
                  <button onClick={() => setMore({ ...more, [r.id]: !more[r.id] })} className="text-xs font-semibold text-[#a3161b] hover:underline">{more[r.id] ? `Only ${r.dept}` : 'Show free faculty from other departments'}</button>
                  {pick[r.id] && <button onClick={() => onOpenStaff(pick[r.id])} className="text-xs font-semibold text-slate-600 hover:underline">View details</button>}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

// ---------- notifications ----------
const Notifications: React.FC<{ role: string; userName?: string; onOpenStaff: (id: string) => void }> = ({ role, userName, onOpenStaff }) => {
  const [notes, setNotes] = useState(loadNotes());
  const mine = notes.filter((n) => audience(n, role, userName));
  const unread = mine.filter((n) => !n.read);
  const markAll = () => { markNotesRead(unread.map((n) => n.id)); setNotes(loadNotes()); };
  return (
    <Card title={`Notifications${unread.length ? ` · ${unread.length} new` : ''}`} right={unread.length ? <button onClick={markAll} className="text-xs font-semibold text-[#a3161b] hover:underline">Mark all as read</button> : undefined}>
      <div className="divide-y divide-[#f0ebe4]">
        {mine.map((n) => (
          <div key={n.id} className="py-3 flex items-start gap-3">
            <i className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-slate-200' : 'bg-[#a3161b]'}`} />
            <div className="min-w-0 flex-1"><p className={`text-sm ${n.read ? 'text-slate-600' : 'text-slate-900 font-medium'}`}>{n.text}</p><p className="text-[11px] text-slate-400 mt-0.5">{new Date(n.ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{n.staffId && <> · <button onClick={() => onOpenStaff(n.staffId!)} className="font-semibold text-[#a3161b] hover:underline">{staffById(n.staffId)?.name}</button></>}</p></div>
          </div>
        ))}
        {mine.length === 0 && <p className="text-sm text-slate-500 py-2">Nothing yet. Requests and assignments show up here.</p>}
      </div>
    </Card>
  );
};
