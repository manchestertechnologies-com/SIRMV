import React, { useEffect, useMemo, useState } from 'react';
import { doneOpen, gotoDetail, hasReturn, peekOpen, returnBack, usePS } from './persist';
import { Eye } from 'lucide-react';
import {
  ALL_DEPTS, Period, SLOTS, Staff, Status, SubjectName, WEEKDAYS, attendanceSeries, checkIn, dayName, getStaff, pct, sectionById, staffPeriodStats, staffStatus, staffOf, staffWeekLoad,
} from './sampleData';
import { Avatar, EditableCard, PhotoBox, Bar, BarChart, Card, Chip, Donut, GREEN, AMBER, RED, Legend, Pill, PageHead, PeopleModal, PersonRow, StatCard, SubjectIcon, TabBar, GREY } from './ui';

type Nav = { v: 'home' } | { v: 'dept'; dept: SubjectName; tab?: string } | { v: 'staff'; id: string; tab?: string };
const PERIODS: { key: Period; label: string }[] = [{ key: 'day', label: 'Day' }, { key: 'week', label: 'Week' }, { key: 'month', label: 'Month' }, { key: 'year', label: 'Year' }];

const staffRows = (list: Staff[]): PersonRow[] => { const d = new Date(); return list.map((s) => { const st = staffStatus(s.id, d); return { id: s.id, name: s.name, sub: `${s.role === 'Non-Teaching' ? s.designation : s.subject + ' · ' + s.role}`, status: st === 'H' ? undefined : st, note: st === 'P' ? checkIn(s.id) : undefined }; }); };

const todayCounts = (list: Staff[]) => {
  const d = new Date(); let p = 0, a = 0, l = 0;
  list.forEach((s) => { const st = staffStatus(s.id, d); if (st === 'P') p++; else if (st === 'A') a++; else if (st === 'L') l++; });
  return { p, a, l, pct: pct(p, p + a + l) };
};

export const StaffsAcademic: React.FC<{ onExit: () => void; onManage?: () => void; lockDept?: SubjectName }> = ({ onExit, onManage, lockDept }) => {
  const open = peekOpen('staff');
  const [navRaw, setNavRaw] = usePS<Nav>('staffs', 'nav', lockDept ? { v: 'dept', dept: lockDept } : { v: 'home' }, open ? { v: 'staff', id: open } : undefined);
  // a HOD only ever sees their own department
  const setNav = (n: Nav) => setNavRaw(lockDept && n.v === 'home' ? { v: 'dept', dept: lockDept } : n);
  const nav: Nav = lockDept && (navRaw.v === 'home' || (navRaw.v === 'dept' && navRaw.dept !== lockDept)) ? { v: 'dept', dept: lockDept } : navRaw;
  const [via, setVia] = usePS<boolean>('staffs', 'via', false, open ? true : undefined);
  useEffect(() => { if (open) doneOpen('staff'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const manage = null;
  void onManage;

  const [pop, setPop] = useState<{ title: string; rows: PersonRow[]; initial: 'P' | 'A' | 'L' | 'all' } | null>(null);

  if (nav.v === 'home') {
    const all = getStaff(); const t = todayCounts(all);
    const show = (title: string, initial: 'P' | 'A' | 'L' | 'all') => setPop({ title, rows: staffRows(all), initial });
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {pop && <PeopleModal title={pop.title} rows={pop.rows} initial={pop.initial} onClose={() => setPop(null)} onOpen={(id) => { setPop(null); setNav({ v: 'staff', id }); }} />}
        <PageHead title="Staffs" sub={`SIR MV PU College · ${all.length} staff across ${ALL_DEPTS.length} departments`} onBack={onExit} right={manage} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total staff" value={all.length} tone="slate" onClick={() => show('All staff · today', 'all')} />
          <StatCard label="Present today" value={t.p} suffix={`${t.pct}% of staff`} tone="green" onClick={() => show('Present today', 'P')} />
          <StatCard label="On leave" value={t.l} tone="gold" onClick={() => show('On leave today', 'L')} />
          <StatCard label="Absent" value={t.a} onClick={() => show('Absent today', 'A')} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {ALL_DEPTS.map((d) => {
            const g = staffOf(d); const list = getStaff().filter((s) => s.subject === d); const c = todayCounts(list);
            return (
              <button key={d} onClick={() => setNav({ v: 'dept', dept: d })} className="mt-tile mt-tile-card text-left rounded-2xl bg-white p-4 flex flex-col gap-3">
                <SubjectIcon subject={d} className="w-16 h-16" />
                <div className="min-w-0 w-full">
                  <p className="text-sm font-bold text-slate-900 font-heading truncate">{d}</p>
                  <p className="text-[11px] text-slate-500 truncate">HOD: {g.hod?.name ?? '-'}</p>
                  <p className="text-[11px] text-slate-500">{g.teaching.length} teaching · {g.nonTeaching.length} non-teaching</p>
                </div>
                <div className="w-full"><div className="flex justify-between text-[10px] text-slate-500 mb-1"><span>Today</span><b className="text-slate-800">{c.pct}%</b></div><Bar value={c.pct} color={GREEN} h="h-1.5" /></div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (nav.v === 'dept') {
    const dept = nav.dept; const g = staffOf(dept); const list = getStaff().filter((s) => s.subject === dept);
    const tab = nav.tab || 'Faculty';
    const crumbs = [{ label: 'Staffs', onClick: () => setNav({ v: 'home' }) }, { label: dept }];
    return (
      <div className="space-y-5 max-w-7xl mx-auto">
        <PageHead title={dept} sub={`${list.length} staff · ${g.teaching.length} teaching · ${g.nonTeaching.length} non-teaching`} onBack={() => (lockDept ? onExit() : setNav({ v: 'home' }))} crumbs={lockDept ? [{ label: dept }] : crumbs}
          right={<SubjectIcon subject={dept} className="w-11 h-11" />} />
        <TabBar items={['Faculty', 'Attendance']} value={tab} onChange={(t) => setNav({ v: 'dept', dept, tab: t })} />
        {tab === 'Faculty' ? (
          <div className="space-y-6">
            {g.hod && (
              <div>
                <h3 className="text-sm font-bold font-heading text-slate-900 mb-2">Head of department</h3>
                <button onClick={() => setNav({ v: 'staff', id: g.hod!.id })} className="mt-tile-card w-full sm:w-auto sm:min-w-[360px] text-left rounded-2xl bg-[#8f1218] text-white p-4 flex items-center gap-4">
                  <Avatar name={g.hod.name} pid={g.hod.id} size={64} />
                  <span><b className="block text-base font-heading">{g.hod.name}</b><span className="text-xs text-white/75">{g.hod.designation}</span><span className="block text-xs text-white/75 mt-0.5">{g.hod.qualification} · {g.hod.experience} yrs</span></span>
                </button>
              </div>
            )}
            <Group title="Teaching staff" list={g.teaching} onOpen={(id) => setNav({ v: 'staff', id })} />
            <Group title="Non-teaching staff" list={g.nonTeaching} onOpen={(id) => setNav({ v: 'staff', id })} />
          </div>
        ) : (
          <DeptAttendance list={list} onOpen={(id) => setNav({ v: 'staff', id, tab: 'Attendance' })} />
        )}
      </div>
    );
  }

  const staff = getStaff().find((s) => s.id === nav.id)!;
  const back = () => { if (via && hasReturn()) { setVia(false); returnBack(); } else setNav({ v: 'dept', dept: staff.subject }); };
  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHead title={staff.name} sub={staff.designation} onBack={back}
        crumbs={[{ label: 'Staffs', onClick: () => setNav({ v: 'home' }) }, { label: staff.subject, onClick: back }, { label: staff.name }]} />
      <StaffDetail staff={staff} tab={nav.tab || 'Account'} setTab={(t) => setNav({ v: 'staff', id: staff.id, tab: t })} />
    </div>
  );
};

const Group: React.FC<{ title: string; list: Staff[]; onOpen: (id: string) => void }> = ({ title, list, onOpen }) => (
  <div>
    <h3 className="text-sm font-bold font-heading text-slate-900 mb-2">{title} <span className="text-slate-400 font-medium">({list.length})</span></h3>
    {list.length === 0 ? <p className="text-xs text-slate-500">No staff in this group.</p> : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((s) => {
          const st = staffStatus(s.id, new Date());
          return (
            <button key={s.id} onClick={() => onOpen(s.id)} className="mt-tile-card text-left rounded-2xl border border-[#ece4da] bg-white p-3 flex items-center gap-3 hover:border-[#d9a85a] transition">
              <Avatar name={s.name} pid={s.id} size={46} />
              <span className="min-w-0 flex-1"><b className="block text-sm text-slate-900 truncate">{s.name}</b><span className="block text-[11px] text-slate-500 truncate">{s.designation}</span></span>
              <StatusPill st={st} />
            </button>
          );
        })}
      </div>
    )}
  </div>
);

const StatusPill: React.FC<{ st: Status }> = ({ st }) => <Pill tone={st === 'P' ? 'green' : st === 'A' ? 'red' : st === 'L' ? 'amber' : 'grey'}>{st === 'P' ? 'Present' : st === 'A' ? 'Absent' : st === 'L' ? 'Leave' : 'Holiday'}</Pill>;

const PeriodSwitch: React.FC<{ value: Period; onChange: (p: Period) => void }> = ({ value, onChange }) => (
  <div className="flex gap-2">{PERIODS.map((p) => <Chip key={p.key} active={value === p.key} onClick={() => onChange(p.key)}>{p.label}</Chip>)}</div>
);

export const DeptAttendance: React.FC<{ list: Staff[]; onOpen?: (id: string) => void }> = ({ list, onOpen }) => {
  const [period, setPeriod] = useState<Period>('week');
  const series = useMemo(() => attendanceSeries(list, period), [list, period]);
  const sum = series.reduce((a, b) => ({ p: a.p + b.present, a: a.a + b.absent, l: a.l + b.leave }), { p: 0, a: 0, l: 0 });
  const today = todayCounts(list);
  const rows = list.map((s) => ({ s, st: staffPeriodStats(s, period) }));
  const [pop, setPop] = useState<'P' | 'A' | 'L' | 'all' | null>(null);
  const popRows: PersonRow[] = pop ? (period === 'day' ? staffRows(list) : rows.map(({ s, st }) => ({ id: s.id, name: s.name, sub: s.role === 'Non-Teaching' ? s.designation : s.subject, status: pop === 'all' ? undefined : pop, note: pop === 'all' ? `${st.percent}%` : `${pop === 'P' ? st.present : pop === 'A' ? st.absent : st.leave} days` })).filter((r) => pop === 'all' || parseInt(r.note || '0', 10) > 0)) : [];
  return (
    <div className="space-y-5">
      {pop && <PeopleModal title={`${pop === 'P' ? 'Present' : pop === 'A' ? 'Absent' : pop === 'L' ? 'On leave' : 'All staff'} · ${period === 'day' ? 'today' : 'this ' + period}`} rows={popRows} initial={period === 'day' ? pop : 'all'} onClose={() => setPop(null)} onOpen={onOpen ? (id) => { setPop(null); onOpen(id); } : (id) => { setPop(null); gotoDetail('staff', id); }} />}
      <PeriodSwitch value={period} onChange={setPeriod} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={period === 'day' ? 'Present today' : 'Average attendance'} value={period === 'day' ? today.pct : pct(sum.p, sum.p + sum.a + sum.l)} suffix="% present" tone="green" onClick={() => setPop('all')} />
        <StatCard label="Present" value={period === 'day' ? today.p : sum.p} suffix={period === 'day' ? 'staff today' : 'staff-days'} tone="slate" onClick={() => setPop('P')} />
        <StatCard label="Leave" value={period === 'day' ? today.l : sum.l} tone="gold" onClick={() => setPop('L')} />
        <StatCard label="Absent" value={period === 'day' ? today.a : sum.a} onClick={() => setPop('A')} />
      </div>
      {period === 'day' ? (
        <Card title="Today"><Donut centre={`${today.pct}%`} centreSub="present" parts={[{ label: 'Present', v: today.p, color: GREEN, onClick: () => setPop('P') }, { label: 'Leave', v: today.l, color: AMBER, onClick: () => setPop('L') }, { label: 'Absent', v: today.a, color: RED, onClick: () => setPop('A') }]} /></Card>
      ) : (
        <Card title={period === 'week' ? 'Last 7 days' : period === 'month' ? 'Last 30 days' : 'Last 12 months'} right={<Legend items={[{ label: 'Present', color: GREEN }, { label: 'Leave', color: AMBER }, { label: 'Absent', color: RED }]} />}>
          <BarChart data={series.map((b) => ({ label: b.label, title: `${b.label}: ${b.present} present, ${b.leave} leave, ${b.absent} absent`, parts: [{ v: b.present, color: GREEN }, { v: b.leave, color: AMBER }, { v: b.absent, color: RED }] }))} />
        </Card>
      )}
      <Card title="Staff-wise attendance">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500 border-b border-[#f0ebe4]"><th className="py-2 pr-3">Staff</th>{period === 'day' ? <><th className="pr-3">Status</th><th className="pr-3">Check-in</th></> : <><th className="pr-3">Present</th><th className="pr-3">Leave</th><th className="pr-3">Absent</th><th className="pr-3 w-36">Attendance</th></>}{onOpen && <th className="text-right">Details</th>}</tr></thead>
            <tbody>
              {rows.map(({ s, st }) => {
                const today = staffStatus(s.id, new Date());
                return (
                  <tr key={s.id} className="border-b border-[#f7f2ec]">
                    <td className="py-2.5 pr-3"><span className="inline-flex items-center gap-2"><Avatar name={s.name} pid={s.id} size={30} /><span><b className="block text-slate-900 text-[13px]">{s.name}</b><span className="text-[11px] text-slate-500">{s.role}</span></span></span></td>
                    {period === 'day' ? <><td className="pr-3"><StatusPill st={today} /></td><td className="pr-3 text-xs text-slate-600">{today === 'P' ? checkIn(s.id) : '-'}</td></> : <>
                      <td className="pr-3 text-emerald-700 font-semibold">{st.present}</td><td className="pr-3 text-amber-600 font-semibold">{st.leave}</td><td className="pr-3 text-red-600 font-semibold">{st.absent}</td>
                      <td className="pr-3"><div className="flex items-center gap-2"><div className="flex-1"><Bar value={st.percent} color={st.percent >= 90 ? GREEN : st.percent >= 80 ? AMBER : RED} /></div><b className="text-xs w-9 text-right">{st.percent}%</b></div></td></>}
                    {onOpen && <td className="text-right"><button onClick={() => onOpen(s.id)} className="p-2 rounded-lg border border-[#ded9cf] text-slate-600 hover:text-[#a3161b] hover:border-[#d9a85a]" title="View details"><Eye className="w-4 h-4" /></button></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const StaffDetail: React.FC<{ staff: Staff; tab: string; setTab: (t: string) => void }> = ({ staff, tab, setTab }) => (
  <div className="space-y-5">
    <div className="rounded-3xl bg-[#8f1218] text-white p-5 flex items-center gap-4">
      <PhotoBox pid={staff.id} name={staff.name} size={96} />
      <div className="min-w-0"><h2 className="text-xl font-bold font-heading">{staff.name}</h2><p className="text-sm text-white/80">{staff.designation}</p><p className="text-xs text-white/65 mt-1">{staff.empId} · {staff.mobile}</p></div>
    </div>
    <TabBar items={staff.role === 'Non-Teaching' ? ['Account', 'Attendance'] : ['Account', 'Attendance', 'Timetable']} value={tab} onChange={setTab} />
    {tab === 'Account' && (
      <EditableCard id={staff.id} title="Account details" fields={([['name', 'Name', staff.name], ['gender', 'Gender', staff.gender], ['region', 'Region', staff.region], ['dept', 'Department', staff.subject], ['designation', 'Designation', staff.designation], ['mobile', 'Mobile', staff.mobile], ['email', 'Email', staff.email], ['empId', 'Employee ID', staff.empId], ['qualification', 'Qualification', staff.qualification], ['experience', 'Experience', `${staff.experience} years`], ['joined', 'Joined on', staff.joined], ['teaches', 'Teaching subject', staff.role === 'Non-Teaching' ? 'Not applicable' : staff.subject]] as [string, string, string][]).map(([key, label, value]) => ({ key, label, value, locked: key === 'empId' }))} />
    )}
    {tab === 'Attendance' && <OneAttendance staff={staff} />}
    {tab === 'Timetable' && <StaffTimetable staff={staff} />}
  </div>
);

const OneAttendance: React.FC<{ staff: Staff }> = ({ staff }) => {
  const [period, setPeriod] = useState<Period>('month');
  const s = staffPeriodStats(staff, period);
  const colour = (st: Status) => (st === 'P' ? 'bg-emerald-500 text-white' : st === 'A' ? 'bg-red-500 text-white' : st === 'L' ? 'bg-amber-400 text-white' : 'bg-slate-200 text-slate-500');
  const days = useMemo(() => { const n = period === 'week' ? 7 : 30; return Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (n - 1 - i)); return { d, st: staffStatus(staff.id, d) }; }); }, [staff, period]);
  const months = useMemo(() => attendanceSeries([staff], 'year'), [staff]);
  return (
    <div className="space-y-5">
      <PeriodSwitch value={period} onChange={setPeriod} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Attendance" value={s.percent} suffix="% present" tone="green" />
        <StatCard label="Days present" value={s.present} tone="slate" />
        <StatCard label="Leave" value={s.leave} tone="gold" />
        <StatCard label="Absent" value={s.absent} />
      </div>
      {period === 'day' && (
        <Card title="Today"><div className="flex items-center gap-4"><StatusPill st={staffStatus(staff.id, new Date())} /><span className="text-sm text-slate-600">Check-in {staffStatus(staff.id, new Date()) === 'P' ? checkIn(staff.id) : '-'}</span></div></Card>
      )}
      {(period === 'week' || period === 'month') && (
        <Card title={period === 'week' ? 'Last 7 days' : 'Last 30 days'} right={<Legend items={[{ label: 'Present', color: GREEN }, { label: 'Leave', color: AMBER }, { label: 'Absent', color: RED }, { label: 'Holiday', color: GREY }]} />}>
          <div className="flex flex-wrap gap-2">
            {days.map(({ d, st }, i) => <span key={i} title={`${d.toDateString()}: ${st}`} className={`w-11 h-12 rounded-xl flex flex-col items-center justify-center text-[10px] font-semibold ${colour(st)}`}><span>{d.getDate()}</span><span className="opacity-80 font-normal">{dayName(d)}</span></span>)}
          </div>
        </Card>
      )}
      {period === 'year' && (
        <Card title="Last 12 months"><BarChart max={100} showValues data={months.map((m) => ({ label: m.label, parts: [{ v: pct(m.present, m.total), color: GREEN }] }))} /></Card>
      )}
    </div>
  );
};

const StaffTimetable: React.FC<{ staff: Staff }> = ({ staff }) => {
  const grid = useMemo(() => staffWeekLoad(staff.id), [staff]);
  const total = grid.flat().filter(Boolean).length;
  let p = -1;
  return (
    <Card title="Weekly class hours" right={<Pill tone="gold">{total} periods / week</Pill>}>
      <div className="mt-box-scroll">
        <table className="w-full text-xs min-w-[640px]">
          <thead><tr className="text-left text-slate-500 border-b border-[#f0ebe4]"><th className="py-2 pr-3 w-36">Time</th>{WEEKDAYS.map((d) => <th key={d} className="pr-2">{d}</th>)}</tr></thead>
          <tbody>
            {SLOTS.map((s) => {
              if (s.kind === 'break') return <tr key={s.key}><td colSpan={7} className="py-1.5"><div className="rounded-lg bg-[#fbf3e4] text-[#8a5a14] text-center font-semibold py-1">{s.label} · {s.start} – {s.end}</div></td></tr>;
              p++;
              return (
                <tr key={s.key} className="border-b border-[#f7f2ec]">
                  <td className="py-2 pr-3"><b className="block text-slate-900">{s.start}</b><span className="text-slate-400">to {s.end}</span></td>
                  {WEEKDAYS.map((_, d) => { const c = grid[d][p]; return <td key={d} className="pr-2 py-1.5">{c ? <span className="block rounded-lg bg-[#fff1ee] text-[#8c1118] font-semibold px-2 py-1.5 truncate">{sectionById(c.sectionId)!.title.replace(' - ', ' ')}</span> : <span className="text-slate-300">-</span>}</td>; })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
