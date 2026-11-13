import { usePS } from './persist';
import React, { useState } from 'react';
import { SLOTS, WEEKDAYS, staffWeekLoad, allSections, getStandards, getTimetables, sectionById, staffById, standardTotals } from './sampleData';
import { TimetableGenerator } from './TimetableGenerator';
import { MyClassGroups } from './ClassPicker';
import { Avatar, Chip, PageHead, PickCard, Pill, StandardIcon, SubjectIcon, Card } from './ui';

type Nav = { v: 'gen' } | { v: 'home' } | { v: 'std'; std: string } | { v: 'sec'; sec: string };

export const TimetableAcademic: React.FC<{ onExit: () => void; only?: string[]; staffId?: string }> = ({ onExit, only, staffId }) => {
  const [nav, setNav] = usePS<Nav>('timetable', 'nav', { v: 'home' });

  if (only && (nav.v === 'home' || nav.v === 'std')) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHead title="My timetable" sub="Your periods this week, then the classes you teach" onBack={onExit} />
        <MySlots staffId={staffId} />
        <h3 className="text-sm font-bold font-heading text-slate-900 -mb-2">Open a class timetable</h3>
        <MyClassGroups only={only} staffId={staffId} onPick={(id) => setNav({ v: 'sec', sec: id })} />
      </div>
    );
  }
  const standards = getStandards();
  if (nav.v === 'gen') return <TimetableGenerator onBack={() => setNav({ v: 'home' })} />;
  if (nav.v === 'home') {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHead title="Timetable" sub={`SIR MV PU College · ${allSections().length} sections`} onBack={onExit} right={<button onClick={() => setNav({ v: 'gen' })} className="px-4 py-2 rounded-xl bg-[#a3161b] text-white text-xs font-semibold">Timetable generator</button>} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {standards.map((s) => { const t = standardTotals(s); return <PickCard key={s.id} icon={<StandardIcon id={s.id} />} title={s.full} lines={[`${t.classes} Classes`, `${t.students} Students`]} onClick={() => setNav({ v: 'std', std: s.id })} />; })}
        </div>
      </div>
    );
  }
  if (nav.v === 'std') {
    const std = standards.find((s) => s.id === nav.std)!;
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHead title={std.full} sub="Choose a class and section" onBack={() => setNav({ v: 'home' })} crumbs={[{ label: 'Timetable', onClick: () => setNav({ v: 'home' }) }, { label: std.label }]} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allSections().filter((s) => s.std === std.id).map((s) => { const ct = staffById(s.classTeacherId)!; return (
            <button key={s.id} onClick={() => setNav({ v: 'sec', sec: s.id })} className="mt-tile mt-tile-card text-left rounded-2xl bg-white p-4">
              <p className="text-sm font-bold text-slate-900 font-heading">{s.title}</p><p className="text-[11px] text-slate-500">{s.batch}</p>
              <div className="flex items-center gap-3 mt-4"><Avatar name={ct.name} pid={ct.id} size={42} /><div className="min-w-0"><p className="text-xs font-semibold text-slate-800 truncate">{ct.name}</p><p className="text-[11px] text-slate-500">Class teacher</p></div></div>
              <p className="mt-4 text-xs text-slate-600">Total students: <b className="text-slate-900">{s.count}</b></p>
            </button>); })}
        </div>
      </div>
    );
  }
  const sec = sectionById(nav.sec)!; const ct = staffById(sec.classTeacherId)!;
  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHead title={`${sec.title} timetable`} sub={`${sec.batch} · Class teacher ${ct.name}`} onBack={() => setNav({ v: 'std', std: sec.std })}
        crumbs={[{ label: 'Timetable', onClick: () => setNav({ v: 'home' }) }, { label: sec.std === 'LT' ? 'LT' : sec.std + 'th', onClick: () => setNav({ v: 'std', std: sec.std }) }, { label: sec.title }]} />
      <SectionTimetable sectionId={sec.id} />
    </div>
  );
};

export const SectionTimetable: React.FC<{ sectionId: string }> = ({ sectionId }) => {
  const today = new Date().getDay();
  const [view, setView] = useState<'Day' | 'Week'>('Week');
  const [day, setDay] = useState(today >= 1 && today <= 6 ? today - 1 : 0);
  const grid = getTimetables().get(sectionId)!;
  const classSlots = SLOTS.map((s, i) => ({ s, i })); let p = -1;
  return (
    <Card title="Class hours" right={<div className="flex gap-1.5 flex-wrap justify-end"><Chip active={view === 'Week'} onClick={() => setView('Week')}>Week</Chip><Chip active={view === 'Day'} onClick={() => setView('Day')}>Day</Chip>{view === 'Day' && WEEKDAYS.map((d, i) => <Chip key={d} active={day === i} onClick={() => setDay(i)}>{d}</Chip>)}</div>}>
      {view === 'Week' ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-xs">
            <thead><tr className="text-left text-slate-500 border-b border-[#f0ebe4]"><th className="py-2 pr-3 w-40">Time</th>{WEEKDAYS.map((d) => <th key={d} className="pr-2">{d}</th>)}</tr></thead>
            <tbody>
              {classSlots.map(({ s }) => {
                if (s.kind === 'break') return <tr key={s.key}><td colSpan={7} className="py-1.5"><div className="rounded-lg bg-[#fbf3e4] text-[#8a5a14] text-center font-semibold py-1">{s.label} · {s.start} – {s.end}</div></td></tr>;
                p++; const pi = p;
                return (
                  <tr key={s.key} className="border-b border-[#f7f2ec]">
                    <td className="py-2 pr-3"><b className="block text-slate-900">{s.start}</b><span className="text-slate-400">to {s.end}</span></td>
                    {WEEKDAYS.map((_, d) => { const c = grid[d][pi]; const t = staffById(c.staffId)!; return (
                      <td key={d} className="pr-2 py-1.5 align-top"><div className="rounded-lg bg-[#fff6f0] border border-[#f3dfd0] px-2 py-1.5"><b className="block text-slate-900 truncate">{c.subject}</b><span className="block text-[10px] text-slate-500 truncate">{t.name}</span></div></td>); })}
                  </tr>);
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="divide-y divide-[#f3ede6]">
          {SLOTS.map((s) => {
            if (s.kind === 'break') return <li key={s.key} className="py-2.5 flex items-center gap-3 text-xs text-slate-500"><span className="w-[148px] shrink-0 font-medium">{s.start} – {s.end}</span><span className="flex-1 text-center rounded-lg bg-[#fbf3e4] py-1.5 font-semibold text-[#8a5a14]">{s.label}</span></li>;
            p++; const c = grid[day][p]; const t = staffById(c.staffId)!;
            return (
              <li key={s.key} className="py-2.5 flex items-center gap-3">
                <span className="w-[148px] shrink-0 text-xs"><b className="block text-slate-900">{s.start} – {s.end}</b><span className="text-slate-400">{s.label}</span></span>
                <SubjectIcon subject={c.subject} className="w-9 h-9 shrink-0" />
                <span className="min-w-0 flex-1"><b className="block text-sm text-slate-900 truncate">{c.subject}</b><span className="text-xs text-slate-500 truncate block">{t.name}</span></span>
                <Pill tone="grey">{c.room}</Pill>
              </li>);
          })}
        </ul>
      )}
    </Card>
  );
};

// the person's own week: one row per period (with the time), one column per day, the class in each box
export const MySlots: React.FC<{ staffId?: string }> = ({ staffId }) => {
  const grid = staffWeekLoad(staffId || ''); const tt = getTimetables(); const today = new Date().getDay() - 1;
  let p = -1; let total = 0;
  grid.forEach((r) => r.forEach((c) => { if (c) total++; }));
  return (
    <Card title="My periods this week" right={<span className="text-xs text-slate-500">{total} periods a week</span>}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-xs border-separate border-spacing-y-1">
          <thead><tr className="text-left text-slate-500"><th className="py-2 pr-3 w-44">Time</th>{WEEKDAYS.map((d, i) => <th key={d} className={`pr-2 ${i === today ? 'text-[#a3161b]' : ''}`}>{d}</th>)}</tr></thead>
          <tbody>
            {SLOTS.map((s) => {
              if (s.kind === 'break') return <tr key={s.key}><td colSpan={WEEKDAYS.length + 1} className="text-center text-[11px] text-slate-400 bg-[#faf6ee] rounded-lg py-1">{s.label} · {s.start} to {s.end}</td></tr>;
              p++; const pi = p;
              return (
                <tr key={s.key}>
                  <td className="pr-3 py-1 align-top"><b className="text-slate-800">{s.label}</b><span className="block text-[11px] text-slate-500">{s.start} - {s.end}</span></td>
                  {WEEKDAYS.map((d, di) => {
                    const c = grid[di][pi];
                    const sec = c ? sectionById(c.sectionId) : null; const cell = c ? tt.get(c.sectionId)?.[di]?.[pi] : null;
                    return <td key={d} className="pr-2 align-top">{sec ? <div className="rounded-xl border border-[#e7d3b0] bg-[#fff7e6] px-2 py-1.5"><b className="block text-slate-900">{sec.title}</b><span className="text-[11px] text-slate-500">{cell?.subject} · {cell?.room}</span></div> : <div className="rounded-xl bg-[#f6f3ee] px-2 py-2 text-[11px] text-slate-400 text-center">Free</div>}</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
