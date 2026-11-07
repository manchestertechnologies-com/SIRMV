import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Check, Download, Wand2 } from 'lucide-react';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { useAuth } from '../context/AuthContext';
import { Staff, SubjectName, TEACHING_SUBJECTS, allSections, getStudents, pct, sectionById, staffById, staffOf } from './sampleData';
import { floorName, loadClassrooms, totalCapacity } from './classrooms';
import { ExamPlan, Syllabus, clearPlan, fixPlan, freeFaculty, fmtTime, loadPlan, planStart, savePlan, sectionsFor, todayIso } from './examPlan';
import { HallModel } from './ClassModel';
import { Room3D } from './Room3D';
import { DutyRequest, addNotes, loadNotes, loadRequests, markNotesRead, saveRequests } from './notify';
import { RoomPlan, Seat, autoRooms, buildSeating, groupName, seatsFor } from './seating';
import { dutyPdf, studentListPdf } from './examPdf';
import { gotoDetail, usePS } from './persist';
import { Avatar, Card, PageHead, Pill, StatCard, TabBar } from './ui';

const Legacy = lazyWithRetry(() => import('../pages/ExamManagementModule').then((m) => ({ default: m.ExamManagementModule })));
const field = 'mt-1 w-full px-3 py-2.5 rounded-xl border border-[#ded9cf] bg-white text-sm text-slate-900 outline-none focus:border-[#c7222a]';
const T = 'exam-management';
const GOLD = '#c28535', RED = '#a3161b', EMPTY = '#cfc8bc', OK = '#2e9e62', ABS = '#d64545', LEAVE = '#e6b23a';
const studentsOf = (id: string) => getStudents(id);
const fmtDay = (d: string, o: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'short' }) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', o);
const endTime = (start: string, mins: number) => { const m = +start.slice(0, 2) * 60 + +start.slice(3) + mins; return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

interface Props { onExit: () => void; onOpenBlueprint?: () => void }

// who should see a notification
const audience = (n: { to: 'exam' | 'hod' | 'staff' }, role: string) => {
  if (role === 'ADMIN' || role === 'PRINCIPAL') return true;
  if (role === 'EXAM_DEPARTMENT') return n.to === 'exam';
  if (role === 'HOD') return n.to === 'hod';
  if (role === 'TEACHER') return n.to === 'staff';
  return false;
};

export const ExamAcademic: React.FC<Props> = ({ onExit, onOpenBlueprint }) => {
  const { user } = useAuth();
  const [tab, setTab] = usePS(T, 'tab', loadPlan() ? 'Live exam' : 'Set up exam');
  const [ver, setVer] = useState(0);
  const role = user?.role || 'ADMIN';
  const showSetup = role !== 'HOD' && role !== 'TEACHER';
  const unread = loadNotes().filter((n) => !n.read && audience(n, role)).length;
  const pending = loadRequests().filter((r) => r.status === 'pending').length;
  const tabs = [...(showSetup ? ['Set up exam'] : []), 'Live exam', ...(role === 'HOD' || role === 'ADMIN' || role === 'PRINCIPAL' ? [`Duty requests${pending ? ` (${pending})` : ''}`] : []), `Notifications${unread ? ` (${unread})` : ''}`, 'Halls', 'Schedule & results'];
  const cur = tabs.find((t) => t.split(' (')[0] === tab.split(' (')[0]) || tabs[0];
  const key = cur.split(' (')[0];
  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHead title="Exam Management" sub="Plan the exam, ask the HODs for invigilators, and follow it live" onBack={onExit} />
      <TabBar items={tabs} value={cur} onChange={setTab} />
      {key === 'Set up exam' && <Setup key={ver} onSaved={() => { setVer((v) => v + 1); setTab('Live exam'); }} onOpenBlueprint={onOpenBlueprint} />}
      {key === 'Live exam' && <Live key={ver} onSetup={() => setTab('Set up exam')} canSetup={showSetup} />}
      {key === 'Duty requests' && <Requests key={ver} onChanged={() => setVer((v) => v + 1)} />}
      {key === 'Notifications' && <Notifications key={ver} role={role} />}
      {key === 'Halls' && <Halls key={ver} onOpenBlueprint={onOpenBlueprint} />}
      {key === 'Schedule & results' && <Suspense fallback={<p className="text-sm text-slate-500 py-10 text-center">Loading…</p>}><Legacy /></Suspense>}
    </div>
  );
};

// tapping a faculty name opens their details; Back returns here
const StaffLink: React.FC<{ s: Pick<Staff, 'id' | 'name'>; size?: number }> = ({ s, size = 26 }) => (
  <button onClick={() => gotoDetail('staff', s.id)} title="Open faculty details" className="inline-flex items-center gap-2 text-left font-medium text-slate-800 hover:text-[#a3161b] hover:underline"><Avatar name={s.name} pid={s.id} size={size} />{s.name}</button>
);

const spreadDemand = (rooms: number): Record<string, number> => { const d: Record<string, number> = {}; for (let i = 0; i < rooms; i++) { const k = TEACHING_SUBJECTS[i % TEACHING_SUBJECTS.length]; d[k] = (d[k] || 0) + 1; } return d; };
const newPlan = (): ExamPlan => ({ name: 'Grand Test 4', date: todayIso(), start: '09:00', durationMin: 180, syllabus: 'both', sectionIds: [], roomIds: [], demand: {} });

// ---------- set up: 5 steps ----------
const STEPS = ['Exam', 'Classes', 'Rooms', 'Seating', 'Faculty'];
const SYL: [Syllabus, string, string][] = [['1st', '1st PU syllabus', 'Only 11th classes write'], ['2nd', '2nd PU syllabus', '12th and LT classes write'], ['both', 'Both syllabuses', '1st PU and 2nd PU papers together']];

const Setup: React.FC<{ onSaved: () => void; onOpenBlueprint?: () => void }> = ({ onSaved, onOpenBlueprint }) => {
  const rooms = useMemo(() => loadClassrooms(), []);
  const saved = loadPlan();
  const [step, setStep] = usePS(T, 'step', 0);
  const [rawPlan, setPlan] = usePS<ExamPlan>(T, 'plan', saved || newPlan());
  const plan = fixPlan(rawPlan);
  const [seatRoom, setSeatRoom] = usePS<string>(T, 'seatroom', '');
  const set = (p: Partial<ExamPlan>) => setPlan((x) => ({ ...x, ...p }));
  const allowed = useMemo(() => sectionsFor(plan.syllabus), [plan.syllabus]);
  const picked = allowed.filter((s) => plan.sectionIds.includes(s.id));
  const chosenRooms = rooms.filter((r) => plan.roomIds.includes(r.id));
  const seating = useMemo(() => buildSeating(chosenRooms, picked, studentsOf), [chosenRooms, picked]);
  const used = seating.plans.filter((p) => p.count > 0);
  const total = Object.values(plan.demand).reduce((a, b) => a + b, 0);
  const canNext = step === 0 ? !!plan.name.trim() && !!plan.date : step === 1 ? picked.length > 0 : step === 2 ? seating.unplaced === 0 && chosenRooms.length > 0 : true;
  const hint = step === 1 && !picked.length ? 'Choose at least one class.' : step === 2 && seating.unplaced > 0 ? `${seating.unplaced} students still need a seat. Add a room.` : step === 4 && total !== used.length ? `You need ${used.length} faculty in total, you asked for ${total}.` : '';

  const pickSyllabus = (sy: Syllabus) => set({ syllabus: sy, sectionIds: plan.sectionIds.filter((id) => sectionsFor(sy).some((s) => s.id === id)), roomIds: [], demand: {} });
  const autoPick = () => set({ roomIds: autoRooms(rooms, picked, studentsOf), demand: {} });
  const goNext = () => {
    if (step === 1 && !plan.roomIds.length) set({ roomIds: autoRooms(rooms, picked, studentsOf) });
    if (step === 3 && !Object.keys(plan.demand).length) set({ demand: spreadDemand(used.length) });
    setStep(step + 1);
  };
  const save = () => {
    const now = Date.now(); const roomIds = used.map((p) => p.room.id); let at = 0;
    const reqs: DutyRequest[] = TEACHING_SUBJECTS.filter((d) => (plan.demand[d] || 0) > 0).map((d, i) => {
      const ids = roomIds.slice(at, at + plan.demand[d]); at += plan.demand[d];
      return { id: `rq${now}-${i}`, examName: plan.name, date: plan.date, start: plan.start, durationMin: plan.durationMin, sectionIds: plan.sectionIds, dept: d, count: ids.length, roomIds: ids, roomNames: ids.map((id) => rooms.find((r) => r.id === id)?.name || ''), status: 'pending' as const, staffIds: [], createdAt: now };
    }).filter((r) => r.count > 0);
    savePlan({ ...plan, roomIds });
    saveRequests(reqs);
    addNotes([
      ...reqs.map((r) => ({ to: 'hod' as const, dept: r.dept, reqId: r.id, text: `Exam Management needs ${r.count} faculty from ${r.dept} for ${plan.name} on ${fmtDay(plan.date, { day: 'numeric', month: 'short' })}, ${fmtTime(plan.start)} to ${fmtTime(endTime(plan.start, plan.durationMin))}. Open Duty requests and pick ${r.count} free faculty.` })),
      { to: 'exam' as const, text: `${plan.name}: asked ${reqs.length} HODs for ${reqs.reduce((a, r) => a + r.count, 0)} faculty. Waiting for them to assign.` },
    ]);
    onSaved();
  };
  const toggleRoom = (id: string) => set({ roomIds: plan.roomIds.includes(id) ? plan.roomIds.filter((x) => x !== id) : [...plan.roomIds, id], demand: {} });
  const curPlan: RoomPlan | undefined = used.find((p) => p.room.id === seatRoom) || used[0];

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
            <label className="text-xs text-slate-500">Date<input type="date" value={plan.date} onChange={(e) => set({ date: e.target.value })} className={field} /></label>
            <label className="text-xs text-slate-500">Starts at<input type="time" value={plan.start} onChange={(e) => set({ start: e.target.value })} className={field} /></label>
            <label className="text-xs text-slate-500">How long (minutes)<select value={plan.durationMin} onChange={(e) => set({ durationMin: +e.target.value })} className={field}>{[60, 90, 120, 180, 200, 240].map((m) => <option key={m} value={m}>{m} minutes</option>)}</select></label>
          </div>
          <p className="mt-5 text-xs font-semibold text-slate-700">Which syllabus is the paper on?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SYL.map(([v, t, d]) => <button key={v} onClick={() => pickSyllabus(v)} className={`text-left px-4 py-2.5 rounded-xl border ${plan.syllabus === v ? 'bg-[#a3161b] text-white border-[#a3161b]' : 'bg-white border-[#ded9cf] text-slate-700'}`}><b className="block text-sm">{t}</b><span className={`text-[11px] ${plan.syllabus === v ? 'text-white/80' : 'text-slate-500'}`}>{d}</span></button>)}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">{plan.syllabus === 'both' ? 'Each bench has 3 seats. 1st PU and 2nd PU students sit on alternate seats, so every seat is used.' : 'Same paper for everyone: only 2 students sit on each bench, the middle seat stays empty, and the rest sit in the next room.'}</p>
        </Card>
      )}

      {step === 1 && (
        <Card title="Which classes write it?" right={<span className="flex gap-3 text-xs font-semibold"><button onClick={() => set({ sectionIds: allowed.map((s) => s.id), roomIds: [], demand: {} })} className="text-[#a3161b] hover:underline">Select all</button><button onClick={() => set({ sectionIds: [], roomIds: [], demand: {} })} className="text-slate-500 hover:underline">Clear</button></span>}>
          {['11', '12', 'LT'].filter((std) => allowed.some((s) => s.std === std)).map((std) => (
            <div key={std} className="mb-4 last:mb-0">
              <p className="text-xs font-semibold text-slate-500 mb-2">{std === 'LT' ? 'Long Term (2nd PU paper)' : `${std}th Standard (${std === '11' ? '1st' : '2nd'} PU paper)`}</p>
              <div className="flex flex-wrap gap-2">
                {allowed.filter((s) => s.std === std).map((s) => { const on = plan.sectionIds.includes(s.id); return (
                  <button key={s.id} onClick={() => set({ sectionIds: on ? plan.sectionIds.filter((x) => x !== s.id) : [...plan.sectionIds, s.id], roomIds: [], demand: {} })} className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left ${on ? 'bg-[#a3161b] text-white border-[#a3161b]' : 'bg-white text-slate-700 border-[#ded9cf] hover:border-[#a3161b]'}`}>{s.title}<span className={`block font-normal ${on ? 'text-white/80' : 'text-slate-500'}`}>{s.count} students</span></button>); })}
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-500 mt-2">{picked.length} classes · {picked.reduce((a, s) => a + s.count, 0)} students</p>
        </Card>
      )}

      {step === 2 && (
        <Card title="Which rooms?" right={<button onClick={autoPick} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a3161b] hover:underline"><Wand2 className="w-3.5 h-3.5" />Pick rooms for me</button>}>
          <p className="text-xs text-slate-500 mb-3">{seating.two ? 'Two syllabuses share every bench on alternate seats.' : 'One syllabus: 2 students per bench, middle seat empty.'} Tap rooms to add or remove them. Students who do not fit move to the next room.</p>
          {[...Array(Math.max(1, ...rooms.map((r) => r.floor + 1))).keys()].map((f) => (
            <div key={f} className="mb-3 last:mb-0">
              <p className="text-[11px] font-semibold text-slate-500 mb-1.5">{floorName(f)}</p>
              <div className="flex flex-wrap gap-2">{rooms.filter((r) => r.floor === f).map((r) => { const on = plan.roomIds.includes(r.id); return (
                <button key={r.id} onClick={() => toggleRoom(r.id)} className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left ${on ? 'bg-[#2e9e62] text-white border-[#2e9e62]' : 'bg-white text-slate-700 border-[#ded9cf] hover:border-[#2e9e62]'}`}>{r.name}<span className={`block font-normal ${on ? 'text-white/85' : 'text-slate-500'}`}>{seatsFor(r, seating.two)} seats</span></button>); })}</div>
            </div>
          ))}
          <div className="mt-4 rounded-xl bg-[#fbf6ee] border border-[#ece4da] px-4 py-3 text-sm">{seating.total} students · {chosenRooms.length} rooms · <b className={seating.unplaced ? 'text-red-600' : 'text-emerald-700'}>{seating.unplaced ? `${seating.unplaced} without a seat` : 'everyone has a seat'}</b>
            <p className="text-[11px] text-slate-500 mt-1">Rooms come from your Blueprint. {onOpenBlueprint && <button onClick={onOpenBlueprint} className="font-semibold text-[#a3161b] hover:underline">Change classrooms or benches</button>}</p></div>
        </Card>
      )}

      {step === 3 && curPlan && (
        <Card title="How students will sit">
          <div className="flex flex-wrap gap-2 mb-3">{used.map((p) => <button key={p.room.id} onClick={() => setSeatRoom(p.room.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${curPlan.room.id === p.room.id ? 'bg-[#8c1118] text-white border-[#8c1118]' : 'bg-white text-slate-600 border-[#ded9cf]'}`}>{p.room.name} · {p.count}</button>)}</div>
          <p className="text-xs text-slate-500 mb-3">{curPlan.room.name} · {curPlan.count} students on {curPlan.room.benches} benches. Roll numbers are shown on the seats. Tap a seat to see the student.</p>
          <Room3D plan={curPlan} color={(s: Seat) => (s.student ? (s.group === '1st' ? GOLD : RED) : EMPTY)} onSeat={(s) => gotoDetail('student', s.student!.id)} />
          <p className="mt-3 text-[11px] text-slate-500 flex flex-wrap gap-x-5 gap-y-1"><span><i className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: GOLD }} />{groupName('1st')} ({curPlan.seats.filter((s) => s.group === '1st').length})</span><span><i className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: RED }} />{groupName('2nd')} ({curPlan.seats.filter((s) => s.group === '2nd').length})</span><span><i className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: EMPTY }} />empty seat</span></p>
        </Card>
      )}

      {step === 4 && (
        <Card title="Ask the HODs for invigilators" right={<button onClick={() => set({ demand: spreadDemand(used.length) })} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a3161b] hover:underline"><Wand2 className="w-3.5 h-3.5" />Spread across departments</button>}>
          <p className="text-xs text-slate-500 mb-3">You need <b>{used.length}</b> faculty, one for each room. Say how many you want from each department. Each HOD gets this request, sees who is free at that time, and picks them. The faculty and Exam Management are notified when they do.</p>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500 border-b border-[#f0ebe4]"><th className="py-2 pr-3">Department</th><th className="pr-3">HOD</th><th>Faculty needed</th></tr></thead>
            <tbody>{TEACHING_SUBJECTS.map((d) => { const hod = staffOf(d).hod; return (
              <tr key={d} className="border-b border-[#f7f2ec]">
                <td className="py-2 pr-3 font-semibold text-slate-900">{d}</td><td className="pr-3">{hod ? <StaffLink s={hod} /> : '-'}</td>
                <td><input type="number" min={0} max={20} value={plan.demand[d] || 0} onChange={(e) => set({ demand: { ...plan.demand, [d]: Math.max(0, Math.min(20, +e.target.value || 0)) } })} className="w-20 px-2 py-1.5 rounded-lg border border-[#ded9cf] text-sm" /></td>
              </tr>); })}</tbody>
          </table></div>
          <p className={`mt-3 text-sm font-semibold ${total === used.length ? 'text-emerald-700' : 'text-amber-700'}`}>{total} of {used.length} faculty requested</p>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3">
        <button disabled={step === 0} onClick={() => setStep(step - 1)} className="px-5 py-2.5 rounded-xl border border-[#ded9cf] bg-white text-sm font-semibold text-slate-700 disabled:opacity-40">Back</button>
        <span className="text-xs text-amber-700">{hint}</span>
        {step < 4 ? <button disabled={!canNext} onClick={goNext} className="px-6 py-2.5 rounded-xl bg-[#a3161b] text-white text-sm font-semibold disabled:opacity-40">Next</button>
          : <button disabled={total !== used.length || !used.length} onClick={save} className="px-6 py-2.5 rounded-xl bg-[#a3161b] text-white text-sm font-semibold disabled:opacity-40">Save and send to HODs</button>}
      </div>
      {saved && <button onClick={() => { clearPlan(); setPlan(newPlan()); setStep(0); }} className="text-xs font-semibold text-slate-500 hover:text-[#a3161b] hover:underline">Remove the saved exam and start again</button>}
    </div>
  );
};

// ---------- halls tab ----------
const Halls: React.FC<{ onOpenBlueprint?: () => void }> = ({ onOpenBlueprint }) => {
  const rooms = useMemo(() => loadClassrooms(), []); const plan = loadPlan();
  const secs = plan ? allSections().filter((s) => plan.sectionIds.includes(s.id)) : allSections();
  const strength = secs.reduce((a, s) => a + s.count, 0); const cap = totalCapacity(rooms);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Classrooms" value={rooms.length} tone="slate" /><StatCard label="Seats in college" value={cap} tone="green" />
        <StatCard label={plan ? 'Students in this exam' : 'Total students'} value={strength} /><StatCard label="Rooms for this exam" value={plan?.roomIds.length || 0} tone="gold" />
      </div>
      <HallModel rooms={rooms} used={Object.fromEntries((plan?.roomIds || []).map((id) => [id, 'exam']))} />
      <p className="text-xs text-slate-500">This model is your Blueprint. {onOpenBlueprint && <button onClick={onOpenBlueprint} className="font-semibold text-[#a3161b] hover:underline">Edit it in Blueprint</button>}</p>
    </div>
  );
};

// ---------- live exam ----------
const clock = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const samplePlan = (): ExamPlan => {
  const rooms = loadClassrooms(); const secs = sectionsFor('2nd').filter((s) => s.stream === 'PCMB'); const d = new Date(); d.setMinutes(d.getMinutes() - 74);
  return { name: 'Grand Test 4', date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, start: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, durationMin: 200, syllabus: '2nd', sectionIds: secs.map((s) => s.id), roomIds: autoRooms(rooms, secs, studentsOf), demand: {} };
};
type Mark = 'present' | 'absent' | 'leave';
const markOf = (no: number, sid: string): Mark => { const h = no * 7 + sid.length * 3 + (sid.charCodeAt(sid.length - 1) || 0); return h % 13 === 0 ? 'absent' : h % 17 === 5 ? 'leave' : 'present'; };

// who invigilates each room: from HOD assignments, or a sample list for the demo exam
const invigilators = (plan: ExamPlan, saved: boolean): { map: Map<string, Staff>; waiting: Map<string, SubjectName> } => {
  const map = new Map<string, Staff>(); const waiting = new Map<string, SubjectName>();
  if (saved) loadRequests().filter((r) => r.examName === plan.name).forEach((r) => r.roomIds.forEach((rid, i) => { const st = r.staffIds[i] ? staffById(r.staffIds[i]) : undefined; if (st) map.set(rid, st); else waiting.set(rid, r.dept); }));
  else { const free = freeFaculty(plan.date, plan.start, plan.durationMin, plan.sectionIds); plan.roomIds.forEach((rid, i) => { if (free[i]) map.set(rid, free[i]); }); }
  return { map, waiting };
};

const Live: React.FC<{ onSetup: () => void; canSetup: boolean }> = ({ onSetup, canSetup }) => {
  const saved = useMemo(() => loadPlan(), []); const plan = useMemo(() => saved || samplePlan(), [saved]);
  const rooms = useMemo(() => loadClassrooms(), []);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const secs = useMemo(() => allSections().filter((s) => plan.sectionIds.includes(s.id)), [plan]);
  const seating = useMemo(() => buildSeating(rooms.filter((r) => plan.roomIds.includes(r.id)), secs, studentsOf), [rooms, plan, secs]);
  const used = seating.plans.filter((p) => p.count > 0);
  const inv = useMemo(() => invigilators(plan, !!saved), [plan, saved]);
  const start = planStart(plan); const endMs = +start + plan.durationMin * 60000;
  const state = +now < +start ? 'soon' : +now > endMs ? 'done' : 'live';
  const elapsed = Math.max(0, Math.min(plan.durationMin * 60, Math.floor((+now - +start) / 1000))); const left = Math.max(0, Math.floor((endMs - +now) / 1000));
  const [sel, setSel] = usePS<string>(T, 'live-room', '');
  const cur = used.find((p) => p.room.id === sel) || used[0];
  const count = (m: Mark) => used.reduce((a, p) => a + p.seats.filter((s) => s.student && markOf(s.student.no, s.student.sectionId) === m).length, 0);
  const totalS = used.reduce((a, p) => a + p.count, 0);
  const markColor = (s: Seat) => { if (!s.student) return EMPTY; const m = markOf(s.student.no, s.student.sectionId); return m === 'present' ? OK : m === 'absent' ? ABS : LEAVE; };
  const classes = (p: RoomPlan) => Array.from(new Set(p.seats.filter((s) => s.student).map((s) => sectionById(s.student!.sectionId)?.code))).join(', ');
  const download = () => studentListPdf(plan, used, (r) => floorName(r.floor), (id) => inv.map.get(id), (id) => sectionById(id)?.title || id);
  return (
    <div className="space-y-5">
      {!saved && <div className="rounded-xl bg-[#fff7e6] border border-[#f1dfb8] px-4 py-2.5 text-xs text-[#7a5518] flex items-center justify-between gap-3 flex-wrap">This is a sample exam.{canSetup && <button onClick={onSetup} className="font-semibold text-[#a3161b] hover:underline">Set up your own exam</button>}</div>}
      <div className="rounded-3xl bg-[#8f1218] text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><p className="inline-flex items-center gap-2 text-xs font-bold bg-white/15 rounded-full px-3 py-1"><i className={`w-2 h-2 rounded-full ${state === 'live' ? 'bg-emerald-400 animate-pulse' : 'bg-[#e6c28f]'}`} />{state === 'live' ? 'LIVE' : state === 'soon' ? 'NOT STARTED' : 'FINISHED'}</p><h2 className="mt-2 text-xl font-bold font-heading">{plan.name}</h2><p className="text-sm text-white/75">{fmtDay(plan.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {plan.durationMin} minutes · {used.length} rooms</p></div>
        <div className="flex gap-6 text-center"><div><p className="text-[11px] text-white/60">Starts</p><p className="text-lg font-semibold">{fmtTime(plan.start)}</p></div><div><p className="text-[11px] text-white/60">Elapsed</p><p className="text-lg font-semibold tabular-nums">{clock(elapsed)}</p></div><div><p className="text-[11px] text-white/60">Time left</p><p className="text-lg font-semibold tabular-nums text-[#e6c28f]">{clock(state === 'soon' ? plan.durationMin * 60 : left)}</p></div></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Rooms in use" value={used.length} tone="slate" /><StatCard label="Present" value={count('present')} tone="green" suffix={`${pct(count('present'), totalS)}% of ${totalS}`} /><StatCard label="Absent" value={count('absent')} /><StatCard label="On leave" value={count('leave')} tone="gold" /><StatCard label="Invigilators" value={inv.map.size} tone="slate" suffix={`of ${used.length}`} />
      </div>
      {canSetup && <div className="flex justify-end"><button onClick={download} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#a3161b] text-white text-xs font-semibold"><Download className="w-4 h-4" />Download student list with faculty (PDF)</button></div>}
      <Card title="Rooms">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-500 border-b border-[#f0ebe4]"><th className="py-2 pr-3">Room</th><th className="pr-3">Floor</th><th className="pr-3">Classes</th><th className="pr-3">Students</th><th className="pr-3">Invigilator</th><th className="pr-3">Present</th><th className="pr-3">Absent</th><th>Leave</th></tr></thead>
          <tbody>{used.map((p) => { const c = (m: Mark) => p.seats.filter((s) => s.student && markOf(s.student.no, s.student.sectionId) === m).length; const iv = inv.map.get(p.room.id); const w = inv.waiting.get(p.room.id); return (
            <tr key={p.room.id} onClick={() => setSel(p.room.id)} className={`border-b border-[#f7f2ec] cursor-pointer ${cur?.room.id === p.room.id ? 'bg-[#fff6f4]' : 'hover:bg-[#fffaf7]'}`}>
              <td className="py-2.5 pr-3 font-semibold text-slate-900">{p.room.name}</td><td className="pr-3">{floorName(p.room.floor)}</td><td className="pr-3">{classes(p)}</td><td className="pr-3">{p.count}</td>
              <td className="pr-3" onClick={(e) => e.stopPropagation()}>{iv ? <StaffLink s={iv} /> : w ? <Pill tone="gold">Waiting for {w} HOD</Pill> : <span className="text-slate-400">Not assigned</span>}</td>
              <td className="pr-3 text-emerald-700 font-semibold">{c('present')}</td><td className="pr-3 text-red-600 font-semibold">{c('absent')}</td><td className="text-amber-600 font-semibold">{c('leave')}</td>
            </tr>); })}</tbody>
        </table></div>
      </Card>
      {cur && (
        <Card title={`${cur.room.name} · ${floorName(cur.room.floor)}`} right={inv.map.get(cur.room.id) ? <span className="text-[11px] text-slate-500">Invigilator <button onClick={() => gotoDetail('staff', inv.map.get(cur.room.id)!.id)} className="font-semibold text-[#a3161b] hover:underline">{inv.map.get(cur.room.id)!.name}</button></span> : undefined}>
          <Room3D plan={cur} color={markColor} onSeat={(s) => gotoDetail('student', s.student!.id)} />
          <p className="mt-3 text-[11px] text-slate-600 flex flex-wrap gap-x-5 gap-y-1"><span><i className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: OK }} />present</span><span><i className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: ABS }} />absent</span><span><i className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: LEAVE }} />on leave</span><span><i className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: EMPTY }} />empty seat</span><span className="text-slate-400">Tap a seat to open the student.</span></p>
        </Card>
      )}
    </div>
  );
};

// ---------- HOD: pick free faculty ----------
const Requests: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const { user } = useAuth();
  const [reqs, setReqs] = useState(loadRequests());
  const myDept = TEACHING_SUBJECTS.find((d) => staffOf(d).hod?.name === user?.name);
  const [dept, setDept] = usePS<string>(T, 'req-dept', myDept || 'All');
  const [more, setMore] = useState<Record<string, boolean>>({});
  const [pick, setPick] = usePS<Record<string, string[]>>(T, 'req-pick', {});
  const shown = reqs.filter((r) => dept === 'All' || r.dept === dept).sort((a, b) => (a.status === b.status ? 0 : a.status === 'pending' ? -1 : 1));
  const toggle = (r: DutyRequest, id: string) => { const cur = pick[r.id] || []; setPick({ ...pick, [r.id]: cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < r.count ? [...cur, id] : cur }); };
  const assign = (r: DutyRequest) => {
    const ids = pick[r.id] || []; if (ids.length !== r.count) return;
    const next = reqs.map((x) => (x.id === r.id ? { ...x, status: 'assigned' as const, staffIds: ids, assignedAt: Date.now() } : x));
    saveRequests(next); setReqs(next);
    addNotes([
      ...ids.map((sid, i) => ({ to: 'staff' as const, staffId: sid, reqId: r.id, roomId: r.roomIds[i], text: `Invigilation duty: ${r.roomNames[i]} · ${r.examName} · ${fmtDay(r.date)}, ${fmtTime(r.start)} to ${fmtTime(endTime(r.start, r.durationMin))}. Assigned by the ${r.dept} HOD. The PDF has your students and seats.` })),
      { to: 'exam' as const, text: `${r.dept} HOD assigned ${ids.map((i) => staffById(i)?.name).join(', ')} to ${r.roomNames.join(', ')} for ${r.examName}.` },
    ]);
    onChanged();
  };
  if (!reqs.length) return <Card title="Duty requests"><p className="text-sm text-slate-500">No requests yet. When Exam Management saves an exam, each department's request arrives here.</p></Card>;
  const waiting = (d: string) => reqs.filter((r) => (d === 'All' || r.dept === d) && r.status === 'pending').length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">{['All', ...TEACHING_SUBJECTS.filter((d) => reqs.some((r) => r.dept === d))].map((d) => <button key={d} onClick={() => setDept(d)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${dept === d ? 'bg-[#a3161b] text-white border-[#a3161b]' : 'bg-white text-slate-600 border-[#ded9cf]'}`}>{d}{waiting(d) ? ` · ${waiting(d)} waiting` : ''}</button>)}</div>
      {shown.map((r) => {
        const taken = reqs.filter((x) => x.id !== r.id && x.date === r.date && x.start === r.start).flatMap((x) => x.staffIds);
        const free = freeFaculty(r.date, r.start, r.durationMin, r.sectionIds, taken);
        const mine = free.filter((f) => f.subject === r.dept); const list = more[r.id] ? [...mine, ...free.filter((f) => f.subject !== r.dept)] : mine;
        const chosen = pick[r.id] || [];
        return (
          <Card key={r.id} title={`${r.examName} · ${r.dept}`} right={r.status === 'pending' ? <Pill tone="gold">{r.count} faculty needed</Pill> : <Pill tone="green">Assigned</Pill>}>
            <p className="text-xs text-slate-500">{fmtDay(r.date)} · {fmtTime(r.start)} to {fmtTime(endTime(r.start, r.durationMin))} · rooms {r.roomNames.join(', ')}</p>
            {r.status === 'assigned' ? (
              <div className="mt-3 space-y-1.5">{r.staffIds.map((id, i) => <div key={id} className="text-sm flex items-center gap-2"><span className="text-slate-500 w-24">{r.roomNames[i]}</span><StaffLink s={staffById(id)!} /></div>)}</div>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-xs font-semibold text-slate-700">Free at this time · {list.length}. Pick {r.count} ({chosen.length} chosen)</p>
                <div className="flex flex-wrap gap-2">
                  {list.map((f) => { const on = chosen.includes(f.id); return (
                    <span key={f.id} className={`inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-xl border text-xs ${on ? 'border-[#a3161b] bg-[#fff1ee] font-semibold' : 'border-[#ded9cf] bg-white'}`}>
                      <button onClick={() => toggle(r, f.id)} className="inline-flex items-center gap-2"><Avatar name={f.name} pid={f.id} size={22} />{f.name}<span className="text-slate-400">{f.subject}</span>{on && <Check className="w-3.5 h-3.5 text-[#a3161b]" />}</button>
                      <button onClick={() => gotoDetail('staff', f.id)} className="text-[10px] font-semibold text-[#a3161b] hover:underline">details</button>
                    </span>); })}
                  {list.length === 0 && <span className="text-xs text-slate-500">Nobody in {r.dept} is free. Show other departments.</span>}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button disabled={chosen.length !== r.count} onClick={() => assign(r)} className="px-4 py-2 rounded-xl bg-[#a3161b] text-white text-xs font-semibold disabled:opacity-40">{chosen.length === r.count ? `Assign ${r.count} faculty` : `Choose ${r.count - chosen.length} more`}</button>
                  <button onClick={() => setMore({ ...more, [r.id]: !more[r.id] })} className="text-xs font-semibold text-[#a3161b] hover:underline">{more[r.id] ? `Only ${r.dept}` : 'Show free faculty from other departments'}</button>
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
const Notifications: React.FC<{ role: string }> = ({ role }) => {
  const [notes, setNotes] = useState(loadNotes());
  const mine = notes.filter((n) => audience(n, role)); const unread = mine.filter((n) => !n.read);
  const markAll = () => { markNotesRead(unread.map((n) => n.id)); setNotes(loadNotes()); };
  const pdf = async (staffId: string, roomId: string) => {
    const plan = loadPlan(); const st = staffById(staffId); if (!plan || !st) return;
    const rooms = loadClassrooms(); const secs = allSections().filter((s) => plan.sectionIds.includes(s.id));
    const rp = buildSeating(rooms.filter((r) => plan.roomIds.includes(r.id)), secs, studentsOf).plans.find((p) => p.room.id === roomId); if (!rp) return;
    await dutyPdf(plan, rp, floorName(rp.room.floor), st, (id) => sectionById(id)?.title || id);
  };
  return (
    <Card title={`Notifications${unread.length ? ` · ${unread.length} new` : ''}`} right={unread.length ? <button onClick={markAll} className="text-xs font-semibold text-[#a3161b] hover:underline">Mark all as read</button> : undefined}>
      <div className="divide-y divide-[#f0ebe4]">
        {mine.map((n) => (
          <div key={n.id} className="py-3 flex items-start gap-3">
            <i className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-slate-200' : 'bg-[#a3161b]'}`} />
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${n.read ? 'text-slate-600' : 'text-slate-900 font-medium'}`}>{n.text}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2">{new Date(n.ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                {n.staffId && <button onClick={() => gotoDetail('staff', n.staffId!)} className="font-semibold text-[#a3161b] hover:underline">{staffById(n.staffId)?.name}</button>}
                {n.staffId && n.roomId && <button onClick={() => pdf(n.staffId!, n.roomId!)} className="inline-flex items-center gap-1 font-semibold text-[#a3161b] hover:underline"><Download className="w-3 h-3" />Duty details PDF</button>}</p>
            </div>
          </div>
        ))}
        {mine.length === 0 && <p className="text-sm text-slate-500 py-2">Nothing yet. Requests and assignments show up here.</p>}
      </div>
    </Card>
  );
};

