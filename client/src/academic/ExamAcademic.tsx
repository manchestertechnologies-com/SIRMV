import React, { useEffect, useMemo, useState } from 'react';
import { Suspense } from 'react';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { SectionDef, allSections, getStaff, getStudents, pct, staffById } from './sampleData';
import { loadClassrooms, roomCapacity, totalCapacity } from './classrooms';
import { Avatar, Bar, Card, GREEN, AMBER, RED, PageHead, Pill, StatCard, TabBar } from './ui';

const Legacy = lazyWithRetry(() => import('../pages/ExamManagementModule').then((m) => ({ default: m.ExamManagementModule })));
const TABS = ['Sections & capacity', 'Live exam', 'Schedule & results'];

export const ExamAcademic: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [tab, setTab] = useState('Live exam');
  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHead title="Exam Management" sub="SIR MV PU College · sections, halls and live exam monitor" onBack={onExit} />
      <TabBar items={TABS} value={tab} onChange={setTab} />
      {tab === 'Sections & capacity' && <Capacity />}
      {tab === 'Live exam' && <Live />}
      {tab === 'Schedule & results' && <Suspense fallback={<p className="text-sm text-slate-500 py-10 text-center">Loading…</p>}><Legacy /></Suspense>}
    </div>
  );
};

// give every exam section a hall that fits it, biggest sections first
const assign = (secs: SectionDef[]) => {
  const rooms = loadClassrooms().sort((a, b) => roomCapacity(a) - roomCapacity(b)); const used = new Set<string>(); const out = new Map<string, { room: string; cap: number } | null>();
  [...secs].sort((a, b) => b.count - a.count).forEach((s) => { const r = rooms.find((x) => !used.has(x.id) && roomCapacity(x) >= s.count) || rooms.filter((x) => !used.has(x.id)).pop(); if (r) { used.add(r.id); out.set(s.id, { room: r.name, cap: roomCapacity(r) }); } else out.set(s.id, null); });
  return out;
};

const Capacity: React.FC = () => {
  const secs = allSections(); const rooms = loadClassrooms(); const map = useMemo(() => assign(secs), []); // eslint-disable-line react-hooks/exhaustive-deps
  const strength = secs.reduce((a, s) => a + s.count, 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Sections" value={secs.length} tone="slate" />
        <StatCard label="Total students" value={strength} />
        <StatCard label="Hall capacity" value={totalCapacity(rooms)} tone="green" suffix={`${rooms.length} classrooms`} />
        <StatCard label="Free seats" value={Math.max(0, totalCapacity(rooms) - strength)} tone="gold" />
      </div>
      <Card title="Section capacity">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500 border-b border-[#f0ebe4]"><th className="py-2 pr-3">Section</th><th className="pr-3">Batch</th><th className="pr-3">Students</th><th className="pr-3">Hall</th><th className="pr-3">Hall capacity</th><th className="pr-3 w-40">Seats used</th><th>Status</th></tr></thead>
            <tbody>
              {secs.map((s) => { const a = map.get(s.id); const fill = a ? pct(s.count, a.cap) : 0; return (
                <tr key={s.id} className="border-b border-[#f7f2ec]">
                  <td className="py-2.5 pr-3 font-semibold text-slate-900">{s.title}</td><td className="pr-3 text-slate-600">{s.batch}</td><td className="pr-3">{s.count}</td>
                  <td className="pr-3">{a?.room ?? '-'}</td><td className="pr-3">{a?.cap ?? '-'}</td>
                  <td className="pr-3">{a && <div className="flex items-center gap-2"><div className="flex-1"><Bar value={fill} color={fill > 100 ? RED : fill > 85 ? AMBER : GREEN} h="h-1.5" /></div><b className="text-xs w-9 text-right">{fill}%</b></div>}</td>
                  <td>{!a ? <Pill tone="red">No hall</Pill> : a.cap >= s.count ? <Pill tone="green">Fits</Pill> : <Pill tone="red">Needs {s.count - a.cap} more seats</Pill>}</td>
                </tr>); })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400 mt-3">Halls come from the classroom blueprint in Attendance. Add benches there to raise capacity.</p>
      </Card>
    </div>
  );
};

// ---------- live exam monitor ----------
const EXAM = { name: 'Grand Test 4', pattern: 'NEET pattern · Physics, Chemistry, Biology', durationMin: 200 };
const Live: React.FC = () => {
  const start = useMemo(() => { const d = new Date(); d.setMinutes(d.getMinutes() - 74); return d; }, []);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const elapsed = Math.floor((+now - +start) / 1000); const left = Math.max(0, EXAM.durationMin * 60 - elapsed);
  const clock = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const secs = useMemo(() => allSections().filter((s) => s.std !== '11' && s.stream === 'PCMB'), []);
  const rooms = useMemo(() => assign(secs), [secs]);
  const teachers = useMemo(() => getStaff().filter((s) => s.role === 'Teacher'), []);
  const rows = useMemo(() => secs.map((s, i) => {
    const studs = getStudents(s.id).filter((x) => x.active);
    const marks = studs.map((st, k) => ({ st, present: (st.no * 7 + i * 3 + k) % 13 !== 0, seat: k + 1, enter: new Date(+start + (k % 9) * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }));
    return { s, room: rooms.get(s.id)?.room || '-', inv: teachers[(i * 2 + 3) % teachers.length], marks, present: marks.filter((m) => m.present).length };
  }), [secs, rooms, teachers, start]);
  const [sel, setSel] = useState(rows[0]?.s.id);
  const cur = rows.find((r) => r.s.id === sel) || rows[0];
  const totalP = rows.reduce((a, r) => a + r.present, 0); const totalS = rows.reduce((a, r) => a + r.marks.length, 0);
  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-[#8f1218] text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><p className="inline-flex items-center gap-2 text-xs font-bold bg-white/15 rounded-full px-3 py-1"><i className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />LIVE</p><h2 className="mt-2 text-xl font-bold font-heading">{EXAM.name}</h2><p className="text-sm text-white/75">{EXAM.pattern}</p></div>
        <div className="flex gap-6 text-center"><div><p className="text-[11px] text-white/60">Started</p><p className="text-lg font-semibold">{start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p></div><div><p className="text-[11px] text-white/60">Elapsed</p><p className="text-lg font-semibold tabular-nums">{clock(elapsed)}</p></div><div><p className="text-[11px] text-white/60">Time left</p><p className="text-lg font-semibold tabular-nums text-[#e6c28f]">{clock(left)}</p></div></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Halls in use" value={rows.length} tone="slate" /><StatCard label="Present" value={totalP} tone="green" suffix={`${pct(totalP, totalS)}% of ${totalS}`} /><StatCard label="Absent" value={totalS - totalP} /><StatCard label="Invigilators on duty" value={rows.length} tone="gold" />
      </div>
      <Card title="Classrooms">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500 border-b border-[#f0ebe4]"><th className="py-2 pr-3">Classroom</th><th className="pr-3">Class</th><th className="pr-3">Branch</th><th className="pr-3">Section</th><th className="pr-3">Invigilator</th><th className="pr-3">Present</th><th>Absent</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.s.id} onClick={() => setSel(r.s.id)} className={`border-b border-[#f7f2ec] cursor-pointer ${sel === r.s.id ? 'bg-[#fff6f4]' : 'hover:bg-[#fffaf7]'}`}>
                  <td className="py-2.5 pr-3 font-semibold text-slate-900">{r.room}</td><td className="pr-3">{r.s.std === 'LT' ? 'LT' : r.s.std + 'th'}</td><td className="pr-3">{r.s.stream} · {r.s.batch}</td><td className="pr-3">{r.s.code}</td>
                  <td className="pr-3"><span className="inline-flex items-center gap-2"><Avatar name={r.inv.name} pid={r.inv.id} size={26} />{r.inv.name}</span></td>
                  <td className="pr-3 text-emerald-700 font-semibold">{r.present}</td><td className="text-red-600 font-semibold">{r.marks.length - r.present}</td>
                </tr>))}
            </tbody>
          </table>
        </div>
      </Card>
      {cur && (
        <Card title={`${cur.room} · ${cur.s.title} · students`} right={<span className="text-[11px] text-slate-500">Invigilator {staffById(cur.inv.id)?.name}</span>}>
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
