import { usePS } from './persist';
import React, { useMemo, useState } from 'react';
import { Settings2 } from 'lucide-react';
import {
  SLOTS, WEEKDAYS, allSections, findStudent, fmtDate, getStandards, getStudents, getTimetables, leaderboard, pct, sectionAttendance, sectionById, sectionResults,
  sectionTestSummary, staffById, standardTotals, SectionDef, StandardDef, StreamDef,
} from './sampleData';
import { Avatar, Bar, BarChart, Card, Chip, GREEN, GroupIcon, MAROON, Pill, PageHead, PickCard, StandardIcon, StatCard, SubjectIcon, TabBar, AMBER, RED } from './ui';
import { StudentGrid, StudentProfile } from './StudentViews';

type Nav = { v: 'home' } | { v: 'std'; std: string } | { v: 'class'; std: string; stream: string } | { v: 'sec'; sec: string; tab?: string } | { v: 'stu'; id: string };

export const ClassesAcademic: React.FC<{ onExit: () => void; onManage?: () => void }> = ({ onExit, onManage }) => {
  const [nav, setNav] = usePS<Nav>('classes', 'nav', { v: 'home' });
  const standards = getStandards();
  const manage = onManage ? (
    <button onClick={onManage} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#ded9cf] bg-white text-xs font-semibold text-slate-700 hover:text-[#a3161b]"><Settings2 className="w-3.5 h-3.5" /> Manage classes</button>
  ) : null;

  if (nav.v === 'home') {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHead title="Classes" sub={`SIR MV PU College · ${allSections().length} sections`} onBack={onExit} right={manage} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {standards.map((s) => {
            const t = standardTotals(s);
            return <PickCard key={s.id} icon={<StandardIcon id={s.id} />} title={s.full} lines={[`${s.streams.length} Classes · ${t.classes} Sections`, `${t.students} Students`]} onClick={() => setNav({ v: 'std', std: s.id })} />;
          })}
        </div>
      </div>
    );
  }

  if (nav.v === 'std') {
    const std = standards.find((s) => s.id === nav.std)!;
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHead title={std.full} sub="Choose a class" onBack={() => setNav({ v: 'home' })} crumbs={[{ label: 'Classes', onClick: () => setNav({ v: 'home' }) }, { label: std.label }]} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {std.streams.map((st) => {
            const secs = st.batches.flatMap((b) => b.sections);
            return <PickCard key={st.stream} icon={<GroupIcon kind="class" />} title={`${std.label} - ${st.stream}`} lines={[st.label, `${st.batches.length} ${st.batches.length === 1 ? "batch" : "batches"} · ${secs.length} ${secs.length === 1 ? "section" : "sections"}`, `${secs.reduce((a, s) => a + s.count, 0)} students`]} onClick={() => setNav({ v: 'class', std: std.id, stream: st.stream })} />;
          })}
        </div>
      </div>
    );
  }

  if (nav.v === 'class') {
    const std = standards.find((s) => s.id === nav.std) as StandardDef; const st = std.streams.find((x) => x.stream === nav.stream) as StreamDef;
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHead title={`${std.label} - ${st.stream}`} sub={st.label} onBack={() => setNav({ v: 'std', std: std.id })}
          crumbs={[{ label: 'Classes', onClick: () => setNav({ v: 'home' }) }, { label: std.label, onClick: () => setNav({ v: 'std', std: std.id }) }, { label: st.stream }]} />
        <div className="space-y-5">
          {st.batches.map((b) => (
            <Card key={b.name}>
              <div className="flex items-center gap-3 mb-4">
                <GroupIcon kind="batch" className="w-12 h-12" />
                <div><p className="text-sm font-bold font-heading text-slate-900">{b.name}</p><p className="text-[11px] text-slate-500">Batch · {b.sections.length} {b.sections.length === 1 ? "section" : "sections"} · {b.sections.reduce((a, s) => a + s.count, 0)} students</p></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pl-3 sm:pl-6 border-l-2 border-[#ecd9bd]">
                {b.sections.map((s) => {
                  const ct = staffById(s.classTeacherId)!;
                  return (
                    <button key={s.id} onClick={() => setNav({ v: 'sec', sec: s.id })} className="mt-tile mt-tile-card text-left rounded-2xl bg-white border border-[#f0e8de] p-3">
                      <GroupIcon kind="section" className="w-12 h-12" />
                      <p className="mt-2 text-sm font-bold text-slate-900">Section {s.code}</p>
                      <p className="text-[11px] text-slate-500">{s.count} students</p>
                      <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-[#f3ede6]"><Avatar name={ct.name} pid={ct.id} size={30} /><span className="min-w-0"><b className="block text-[11px] text-slate-800 truncate">{ct.name}</b><span className="block text-[10px] text-slate-500">Class teacher</span></span></div>
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (nav.v === 'stu') {
    const student = findStudent(nav.id)!; const sec = sectionById(student.sectionId)!;
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHead title={student.name} sub={`${sec.title} · Roll ${student.roll}`} onBack={() => setNav({ v: 'sec', sec: sec.id, tab: 'Students' })}
          crumbs={[{ label: 'Classes', onClick: () => setNav({ v: 'home' }) }, { label: sec.title, onClick: () => setNav({ v: 'sec', sec: sec.id, tab: 'Students' }) }, { label: student.name }]} />
        <StudentProfile student={student} />
      </div>
    );
  }

  const sec = sectionById(nav.sec)!;
  return (
    <SectionPage sec={sec} tab={nav.tab || 'Students'} setTab={(t) => setNav({ v: 'sec', sec: sec.id, tab: t })}
      onBack={() => setNav({ v: 'class', std: sec.std, stream: sec.stream })} onHome={() => setNav({ v: 'home' })} onStudent={(id) => setNav({ v: 'stu', id })}
      onStd={() => setNav({ v: 'std', std: sec.std })} />
  );
};

// ---------- section page ----------
const TABS = ['Students', 'Timetable', 'Staffs', 'Attendance', 'Analytics', 'Leaderboard'];
const SectionPage: React.FC<{ sec: SectionDef; tab: string; setTab: (t: string) => void; onBack: () => void; onHome: () => void; onStd: () => void; onStudent: (id: string) => void }> = ({ sec, tab, setTab, onBack, onHome, onStd, onStudent }) => {
  const ct = staffById(sec.classTeacherId)!;
  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHead title={sec.title} sub={`${sec.batch} · ${sec.count} students`} onBack={onBack}
        crumbs={[{ label: 'Classes', onClick: onHome }, { label: sec.std === 'LT' ? 'LT' : sec.std + 'th', onClick: onStd }, { label: `${sec.stream} · ${sec.batch}`, onClick: onBack }, { label: `Section ${sec.code}` }]}
        right={<span className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-[#ecd9bd] bg-[#fffaf2]"><Avatar name={ct.name} size={28} /><span className="text-xs"><span className="text-slate-500">Class teacher </span><b className="text-slate-900">{ct.name}</b></span></span>} />
      <TabBar items={TABS} value={tab} onChange={setTab} />
      {tab === 'Students' && <StudentGrid sectionId={sec.id} onOpen={onStudent} />}
      {tab === 'Timetable' && <Timetable sec={sec} />}
      {tab === 'Staffs' && <Staffs sec={sec} />}
      {tab === 'Attendance' && <Attendance sec={sec} />}
      {tab === 'Analytics' && <Analytics sec={sec} />}
      {tab === 'Leaderboard' && <Board sec={sec} onStudent={onStudent} />}
    </div>
  );
};

const Timetable: React.FC<{ sec: SectionDef }> = ({ sec }) => {
  const today = new Date().getDay(); // 0 = Sun
  const [day, setDay] = useState(today >= 1 && today <= 6 ? today - 1 : 0);
  const grid = getTimetables().get(sec.id)!;
  const row = grid[day];
  let p = -1;
  const load = useMemo(() => {
    const m = new Map<string, { n: number; subject: string }>();
    grid.forEach((r) => r.forEach((c) => { const v = m.get(c.staffId) || { n: 0, subject: c.subject }; v.n++; m.set(c.staffId, v); }));
    return Array.from(m.entries());
  }, [grid]);
  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-5">
      <Card title="Class hours" right={<div className="flex gap-1.5 flex-wrap justify-end">{WEEKDAYS.map((d, i) => <Chip key={d} active={day === i} onClick={() => setDay(i)}>{d}</Chip>)}</div>}>
        <ul className="divide-y divide-[#f3ede6]">
          {SLOTS.map((s) => {
            if (s.kind === 'break') return <li key={s.key} className="py-2.5 flex items-center gap-3 text-xs text-slate-500"><span className="w-[148px] shrink-0 font-medium">{s.start} – {s.end}</span><span className="flex-1 text-center rounded-lg bg-[#fbf3e4] py-1.5 font-semibold text-[#8a5a14]">{s.label}</span></li>;
            p++; const c = row[p]; const t = staffById(c.staffId)!;
            return (
              <li key={s.key} className="py-2.5 flex items-center gap-3">
                <span className="w-[148px] shrink-0 text-xs"><b className="block text-slate-900">{s.start} – {s.end}</b><span className="text-slate-400">{s.label}</span></span>
                <SubjectIcon subject={c.subject} className="w-9 h-9 shrink-0" />
                <span className="min-w-0 flex-1"><b className="block text-sm text-slate-900 truncate">{c.subject}</b><span className="text-xs text-slate-500 truncate block">{t.name}</span></span>
                <Pill tone="grey">{c.room}</Pill>
              </li>
            );
          })}
        </ul>
      </Card>
      <Card title="Faculty hours per week">
        <ul className="space-y-3">
          {load.map(([id, v]) => { const t = staffById(id)!; return (
            <li key={id} className="flex items-center gap-3"><Avatar name={t.name} size={34} /><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-900 truncate">{t.name}</p><p className="text-[11px] text-slate-500">{v.subject}</p></div><Pill tone="gold">{v.n} hrs</Pill></li>
          ); })}
        </ul>
        <p className="text-[11px] text-slate-400 mt-3">Weekly count of periods this faculty takes in {sec.title}.</p>
      </Card>
    </div>
  );
};

const Staffs: React.FC<{ sec: SectionDef }> = ({ sec }) => {
  const grid = getTimetables().get(sec.id)!;
  const rows = useMemo(() => {
    const m = new Map<string, string>();
    grid.forEach((r) => r.forEach((c) => { m.set(c.subject + '|' + c.staffId, c.subject); }));
    return Array.from(m.entries()).map(([k, subject]) => ({ subject, staff: staffById(k.split('|')[1])! })).sort((a, b) => a.subject.localeCompare(b.subject));
  }, [grid]);
  return (
    <Card title="Staffs">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-500 border-b border-[#f0ebe4]"><th className="py-2 pr-4">Subject</th><th className="pr-4">Staff</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-[#f7f2ec]">
                <td className="py-2.5 pr-4"><span className="inline-flex items-center gap-2"><SubjectIcon subject={r.subject} className="w-7 h-7" />{r.subject}</span></td>
                <td className="pr-4"><span className="inline-flex items-center gap-2"><Avatar name={r.staff.name} size={28} />{r.staff.name}</span></td>
                <td>{r.staff.id === sec.classTeacherId ? <Pill tone="gold">Class Teacher</Pill> : <Pill tone="grey">Teacher</Pill>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

const Attendance: React.FC<{ sec: SectionDef }> = ({ sec }) => {
  const rows = sectionAttendance(sec.id, 14);
  const avg = Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="14-day average" value={avg} suffix="% present" tone="green" />
        <StatCard label="Absent days (total)" value={rows.reduce((a, r) => a + r.absent, 0)} tone="gold" />
        <StatCard label="On leave (total)" value={rows.reduce((a, r) => a + r.leave, 0)} tone="slate" />
      </div>
      <Card title="Attendance">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500 border-b border-[#f0ebe4]"><th className="py-2 pr-3">Sl No</th><th className="pr-3">Date</th><th className="pr-3">Day</th><th className="pr-3 w-44">Percentage</th><th className="pr-3">Present</th><th className="pr-3">Absent</th><th>Leave</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.sl} className="border-b border-[#f7f2ec]">
                  <td className="py-2.5 pr-3 text-slate-500">{r.sl}</td><td className="pr-3 font-medium">{fmtDate(r.date)}</td><td className="pr-3">{r.day}</td>
                  <td className="pr-3"><div className="flex items-center gap-2"><div className="flex-1"><Bar value={r.pct} color={r.pct >= 90 ? GREEN : r.pct >= 80 ? AMBER : RED} /></div><b className="text-xs w-9 text-right">{r.pct}%</b></div></td>
                  <td className="pr-3 text-emerald-700 font-semibold">{r.present}</td><td className="pr-3 text-red-600 font-semibold">{r.absent}</td><td className="text-amber-600 font-semibold">{r.leave}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const Analytics: React.FC<{ sec: SectionDef }> = ({ sec }) => {
  const tests = sectionTestSummary(sec.id);
  const res = sectionResults(sec.id);
  const avg = Math.round(tests.reduce((a, t) => a + t.avg, 0) / tests.length);
  const pass = Math.round(tests.reduce((a, t) => a + pct(t.pass, t.appeared), 0) / tests.length);
  const subjectAvg = sec.subjects.map((sub) => {
    let m = 0, x = 0; res.forEach((rows) => rows.forEach((t) => { const s = t.subjects.find((q) => q.subject === sub)!; m += s.marks; x += s.max; }));
    return { sub, v: Math.max(0, pct(m, x)) };
  });
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Tests conducted" value={tests.length} tone="slate" />
        <StatCard label="Average score" value={avg} suffix="% of marks" />
        <StatCard label="Students appeared" value={sec.count} tone="gold" />
        <StatCard label="Overall pass rate" value={pass} suffix="% above 35%" tone="green" />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Class average by test"><BarChart max={100} showValues data={tests.map((t) => ({ label: t.name[0] + t.name.split(' ').pop(), title: `${t.name}: ${t.avg}%`, parts: [{ v: t.avg, color: t.avg >= 55 ? GREEN : t.avg >= 40 ? AMBER : RED }] }))} /></Card>
        <Card title="Subject average">
          <div className="space-y-4">
            {subjectAvg.map((s) => (
              <div key={s.sub}><div className="flex justify-between text-xs mb-1"><span className="inline-flex items-center gap-2 font-semibold text-slate-800"><SubjectIcon subject={s.sub} className="w-6 h-6" />{s.sub}</span><b>{s.v}%</b></div><Bar value={s.v} color={MAROON} h="h-2.5" /></div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

const Board: React.FC<{ sec: SectionDef; onStudent: (id: string) => void }> = ({ sec, onStudent }) => {
  const rows = leaderboard(sec.id).filter((r) => getStudents(sec.id).find((s) => s.id === r.st.id)!.active);
  const top = rows.slice(0, 3);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3 items-end">
        {[top[1], top[0], top[2]].map((r, i) => r && (
          <button key={r.st.id} onClick={() => onStudent(r.st.id)} className="rounded-2xl bg-white border border-[#ece4da] p-3 text-center hover:border-[#d9a85a]" style={{ paddingTop: i === 1 ? 28 : 14 }}>
            <div className="flex justify-center"><Avatar name={r.st.name} size={i === 1 ? 64 : 52} /></div>
            <p className="mt-2 text-xs font-semibold text-slate-900 truncate">{r.st.name}</p>
            <p className="text-[11px] text-slate-500">Rank {r.rank}</p>
            <p className="text-lg font-semibold text-[#a3161b]">{r.avg}%</p>
          </button>
        ))}
      </div>
      <Card title="Leaderboard">
        <ul className="divide-y divide-[#f3ede6]">
          {rows.map((r) => (
            <li key={r.st.id}>
              <button onClick={() => onStudent(r.st.id)} className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-[#fff8f4] rounded-xl px-2">
                <span className="w-8 text-sm font-semibold text-slate-400">{r.rank}</span>
                <Avatar name={r.st.name} pid={r.st.id} size={36} />
                <span className="min-w-0 flex-1"><b className="block text-sm text-slate-900 truncate">{r.st.name}</b><span className="text-[11px] text-slate-500">Roll {r.st.roll}</span></span>
                <span className="w-32 hidden sm:block"><Bar value={r.avg} color={r.avg >= 70 ? GREEN : r.avg >= 45 ? AMBER : RED} /></span>
                <b className="w-12 text-right text-sm">{r.avg}%</b>
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};
