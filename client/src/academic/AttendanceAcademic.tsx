import { usePS } from './persist';
import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import {
  ALL_DEPTS, SectionDef, Status, Student, TEACHING_SUBJECTS, allSections, fmtDate, getStandards, getStaff, getStudents, pct, sectionById, staffStatus, standardTotals, studentDayStatus, studentMonthPct, SubjectName,
} from './sampleData';
import { Avatar, Bar, Card, Chip, Donut, GREEN, AMBER, RED, PageHead, PickCard, StandardIcon, StatCard, SubjectIcon, GroupIcon } from './ui';
import { DeptAttendance } from './StaffsAcademic';

type Nav = { v: 'home' } | { v: 'students' } | { v: 'std'; std: string } | { v: 'sec'; sec: string } | { v: 'teachers'; group: 'Teaching' | 'Non-Teaching' } | { v: 'dept'; dept: SubjectName; group: 'Teaching' | 'Non-Teaching' };

const dayCounts = (list: Student[], d: Date) => { let p = 0, a = 0, l = 0; list.forEach((s) => { const x = studentDayStatus(s.id, d); if (x === 'P') p++; else if (x === 'A') a++; else if (x === 'L') l++; }); return { p, a, l, pct: pct(p, p + a + l) }; };
const prevWorkday = () => { const d = new Date(); if (d.getDay() === 0) d.setDate(d.getDate() - 1); return d; };

export const AttendanceAcademic: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [nav, setNav] = usePS<Nav>('attendance', 'nav', { v: 'home' });
  const standards = getStandards();
  const everyone = useMemo(() => allSections().flatMap((s) => getStudents(s.id).filter((x) => x.active)), []);
  const staff = getStaff();

  if (nav.v === 'home') {
    const today = dayCounts(everyone, prevWorkday());
    const st = staff.filter((s) => staffStatus(s.id, new Date()) === 'P').length;
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHead title="Attendance" sub="SIR MV PU College · students, staff and classrooms" onBack={onExit} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Students present" value={today.p} suffix={`${today.pct}% of ${everyone.length}`} tone="green" />
          <StatCard label="Students absent" value={today.a} />
          <StatCard label="Students on leave" value={today.l} tone="gold" />
          <StatCard label="Staff present today" value={st} suffix={`of ${staff.length}`} tone="slate" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PickCard icon={<GroupIcon kind="section" />} title="Students" lines={['College overall', 'Class, section and P / A / L']} onClick={() => setNav({ v: 'students' })} />
          <PickCard icon={<GroupIcon kind="class" />} title="Teachers and staff" lines={['Overall and subject-wise', 'Teaching and non-teaching']} onClick={() => setNav({ v: 'teachers', group: 'Teaching' })} />
        </div>
      </div>
    );
  }
  const home = () => setNav({ v: 'home' });

  if (nav.v === 'students') {
    const d = prevWorkday(); const t = dayCounts(everyone, d);
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHead title="Students attendance" sub={`College overall · ${fmtDate(d)}`} onBack={home} crumbs={[{ label: 'Attendance', onClick: home }, { label: 'Students' }]} />
        <Card><Donut centre={`${t.pct}%`} centreSub="present" parts={[{ label: 'Present', v: t.p, color: GREEN }, { label: 'Leave', v: t.l, color: AMBER }, { label: 'Absent', v: t.a, color: RED }]} /></Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {standards.map((s) => { const list = allSections().filter((x) => x.std === s.id).flatMap((x) => getStudents(x.id).filter((y) => y.active)); const c = dayCounts(list, d); const tt = standardTotals(s); return (
            <PickCard key={s.id} icon={<StandardIcon id={s.id} />} title={s.full} lines={[`${tt.classes} sections · ${tt.students} students`, `Present ${c.pct}% (${c.p}/${c.p + c.a + c.l})`]} onClick={() => setNav({ v: 'std', std: s.id })} />); })}
        </div>
      </div>
    );
  }
  if (nav.v === 'std') {
    const std = standards.find((s) => s.id === nav.std)!; const d = prevWorkday();
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHead title={std.full} sub="Choose a section" onBack={() => setNav({ v: 'students' })} crumbs={[{ label: 'Attendance', onClick: home }, { label: 'Students', onClick: () => setNav({ v: 'students' }) }, { label: std.label }]} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {allSections().filter((x) => x.std === std.id).map((x) => { const c = dayCounts(getStudents(x.id).filter((y) => y.active), d); return (
            <PickCard key={x.id} icon={<GroupIcon kind="section" />} title={x.title} lines={[x.batch, `P ${c.p} · A ${c.a} · L ${c.l}`]} badge={`${c.pct}%`} onClick={() => setNav({ v: 'sec', sec: x.id })} />); })}
        </div>
      </div>
    );
  }
  if (nav.v === 'sec') return <SectionList sec={sectionById(nav.sec)!} onBack={(s) => setNav({ v: 'std', std: s.std })} onHome={home} />;

  if (nav.v === 'teachers') {
    const g = nav.group;
    const depts = ALL_DEPTS.filter((d) => (g === 'Teaching' ? TEACHING_SUBJECTS.includes(d) : staff.some((s) => s.subject === d && s.role === 'Non-Teaching')));
    const groupStaff = staff.filter((s) => (g === 'Teaching' ? s.role !== 'Non-Teaching' : s.role === 'Non-Teaching'));
    const today = new Date(); let p = 0; groupStaff.forEach((s) => { if (staffStatus(s.id, today) === 'P') p++; });
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHead title="Teachers and staff attendance" sub="Overall and by subject" onBack={home} crumbs={[{ label: 'Attendance', onClick: home }, { label: 'Staff' }]} />
        <div className="flex gap-2">{(['Teaching', 'Non-Teaching'] as const).map((x) => <Chip key={x} active={g === x} onClick={() => setNav({ v: 'teachers', group: x })}>{x}</Chip>)}</div>
        <DeptAttendance key={g} list={groupStaff} />
        <h3 className="text-sm font-bold font-heading text-slate-900">By subject</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {depts.map((d) => { const list = staff.filter((s) => s.subject === d && (g === 'Teaching' ? s.role !== 'Non-Teaching' : s.role === 'Non-Teaching')); const pr = list.filter((s) => staffStatus(s.id, today) === 'P').length; const pc = pct(pr, list.length); return (
            <div key={d} className="mt-tile-card rounded-2xl bg-white p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between"><SubjectIcon subject={d} className="w-14 h-14" /><button onClick={() => setNav({ v: 'dept', dept: d, group: g })} title="View details" className="p-2 rounded-xl border border-[#ded9cf] text-slate-600 hover:text-[#a3161b] hover:border-[#d9a85a]"><Eye className="w-4 h-4" /></button></div>
              <div><p className="text-sm font-bold font-heading text-slate-900">{d}</p><p className="text-[11px] text-slate-500">{pr} of {list.length} present today</p></div>
              <div><div className="flex justify-between text-[10px] text-slate-500 mb-1"><span>Attendance</span><b className="text-slate-800">{pc}%</b></div><Bar value={pc} color={pc >= 90 ? GREEN : pc >= 75 ? AMBER : RED} h="h-1.5" /></div>
            </div>); })}
        </div>
        <p className="text-[11px] text-slate-400">{p} of {groupStaff.length} present today.</p>
      </div>
    );
  }
  const list = staff.filter((s) => s.subject === nav.dept && (nav.group === 'Teaching' ? s.role !== 'Non-Teaching' : s.role === 'Non-Teaching'));
  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHead title={`${nav.dept} · ${nav.group}`} sub={`${list.length} staff`} onBack={() => setNav({ v: 'teachers', group: nav.group })} crumbs={[{ label: 'Attendance', onClick: home }, { label: 'Staff', onClick: () => setNav({ v: 'teachers', group: nav.group }) }, { label: nav.dept }]} right={<SubjectIcon subject={nav.dept} className="w-11 h-11" />} />
      <DeptAttendance list={list} />
    </div>
  );
};

const SectionList: React.FC<{ sec: SectionDef; onBack: (s: SectionDef) => void; onHome: () => void }> = ({ sec, onBack, onHome }) => {
  const [date, setDate] = useState(prevWorkday());
  const [over, setOver] = useState<Record<string, Status>>({});
  const studs = getStudents(sec.id).filter((s) => s.active);
  const status = (s: Student): Status => over[s.id + date.toDateString()] ?? studentDayStatus(s.id, date);
  const counts = studs.reduce((a, s) => { const x = status(s); if (x === 'P') a.p++; else if (x === 'A') a.a++; else if (x === 'L') a.l++; return a; }, { p: 0, a: 0, l: 0 });
  const move = (n: number) => { const d = new Date(date); d.setDate(d.getDate() + n); if (d.getDay() === 0) d.setDate(d.getDate() + n); if (d <= new Date()) setDate(d); };
  const set = (s: Student, v: Status) => setOver({ ...over, [s.id + date.toDateString()]: v });
  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHead title={sec.title} sub={`${sec.batch} · ${studs.length} students`} onBack={() => onBack(sec)} crumbs={[{ label: 'Attendance', onClick: onHome }, { label: 'Students', onClick: () => onBack(sec) }, { label: sec.title }]}
        right={<div className="flex items-center gap-1 bg-white border border-[#ded9cf] rounded-xl px-1 py-1"><button onClick={() => move(-1)} className="p-1.5 rounded-lg hover:bg-[#fff6f4]"><ChevronLeft className="w-4 h-4" /></button><span className="text-xs font-semibold px-2 min-w-[96px] text-center">{fmtDate(date)}</span><button onClick={() => move(1)} className="p-1.5 rounded-lg hover:bg-[#fff6f4]"><ChevronRight className="w-4 h-4" /></button></div>} />
      <div className="grid grid-cols-3 gap-3"><StatCard label="Present (P)" value={counts.p} tone="green" /><StatCard label="Absent (A)" value={counts.a} /><StatCard label="Leave (L)" value={counts.l} tone="gold" /></div>
      <Card title="Student list" right={<span className="text-[11px] text-slate-400">tap P / A / L to correct a mark</span>}>
        <ul className="divide-y divide-[#f3ede6]">
          {studs.map((s) => { const x = status(s); return (
            <li key={s.id} className="py-2.5 flex items-center gap-3">
              <span className="w-6 text-xs text-slate-400 text-right">{s.no}</span><Avatar name={s.name} pid={s.id} size={38} square />
              <span className="min-w-0 flex-1"><b className="block text-sm text-slate-900 truncate">{s.name}</b><span className="text-[11px] text-slate-500">Roll {s.roll} · 30-day {studentMonthPct(s.id)}%</span></span>
              <span className="inline-flex gap-1">{(['P', 'A', 'L'] as const).map((k) => <button key={k} onClick={() => set(s, k)} className={`w-8 h-8 rounded-lg text-xs font-bold transition ${x === k ? (k === 'P' ? 'bg-emerald-500 text-white' : k === 'A' ? 'bg-red-500 text-white' : 'bg-amber-400 text-white') : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{k}</button>)}</span>
            </li>); })}
        </ul>
      </Card>
    </div>
  );
};
