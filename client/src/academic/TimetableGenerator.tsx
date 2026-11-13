import React, { useMemo, useState } from 'react';
import { allSections, getStandards } from './sampleData';
import { Card, Chip, PageHead } from './ui';
import { usePS } from './persist';

export interface GenSettings {
  days: string[]; start: string; end: string; periodMin: number;
  lunchStart: string; lunchMin: number; washroomMin: number; sectionIds: string[];
}
export interface GenSlot { key: string; label: string; start: string; end: string; kind: 'class' | 'washroom' | 'lunch' }
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const KEY = 'mt-tt-blank';

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const fmt = (m: number) => { const h = Math.floor(m / 60) % 24; const mm = m % 60; return `${String(h % 12 || 12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };

// Periods fill the day. The washroom break sits half-way between the start and the lunch break
// (on the nearest period boundary), then the lunch break, then the remaining periods.
export const buildSlots = (s: GenSettings): GenSlot[] => {
  const start = toMin(s.start), end = toMin(s.end), lunchAt = toMin(s.lunchStart);
  const washAt = start + Math.round((lunchAt - start) / 2);
  const out: GenSlot[] = []; let cur = start; let p = 0; let wash = s.washroomMin <= 0; let lunch = s.lunchMin <= 0;
  while (cur < end) {
    if (!wash && cur >= washAt - s.periodMin / 2) { out.push({ key: 'W', label: 'Washroom break', start: fmt(cur), end: fmt(cur + s.washroomMin), kind: 'washroom' }); cur += s.washroomMin; wash = true; continue; }
    if (!lunch && cur >= lunchAt - s.periodMin / 2) { out.push({ key: 'L', label: 'Lunch break', start: fmt(cur), end: fmt(cur + s.lunchMin), kind: 'lunch' }); cur += s.lunchMin; lunch = true; continue; }
    if (cur + s.periodMin > end) break;
    p++; out.push({ key: 'P' + p, label: `Period ${p}`, start: fmt(cur), end: fmt(cur + s.periodMin), kind: 'class' }); cur += s.periodMin;
  }
  return out;
};

const DEFAULTS: GenSettings = { days: DAYS.slice(), start: '08:30', end: '15:30', periodMin: 50, lunchStart: '12:10', lunchMin: 50, washroomMin: 10, sectionIds: [] };
export const loadBlank = (): { settings: GenSettings; slots: GenSlot[]; at: string } | null => { try { const v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch { return null; } };

export const TimetableGenerator: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const sections = allSections();
  const [cfg, setCfg] = usePS<GenSettings>('timetable', 'gen', { ...DEFAULTS, sectionIds: sections.map((x) => x.id) });
  const [made, setMade] = useState(loadBlank());
  const [view, setView] = useState<string>(cfg.sectionIds[0] || sections[0].id);
  const set = (p: Partial<GenSettings>) => setCfg({ ...cfg, ...p });
  const preview = useMemo(() => buildSlots(cfg), [cfg]);
  const problems = [
    toMin(cfg.end) <= toMin(cfg.start) && 'College end time must be after the start time.',
    (toMin(cfg.lunchStart) <= toMin(cfg.start) + cfg.periodMin) && 'Lunch should start after the first period.',
    toMin(cfg.lunchStart) + cfg.lunchMin >= toMin(cfg.end) && 'Lunch break must finish before the college ends.',
    cfg.days.length === 0 && 'Pick at least one working day.',
    cfg.sectionIds.length === 0 && 'Pick at least one class.',
  ].filter(Boolean) as string[];
  const generate = () => { const r = { settings: cfg, slots: buildSlots(cfg), at: new Date().toLocaleString() }; try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* ignore */ } setMade(r); setView(cfg.sectionIds[0]); };
  const num = (k: 'periodMin' | 'lunchMin' | 'washroomMin', label: string, min: number, max: number, step = 5) => (
    <label className="text-xs font-semibold text-slate-600">{label}
      <input type="number" min={min} max={max} step={step} value={cfg[k]} onChange={(e) => set({ [k]: Math.max(min, Math.min(max, Number(e.target.value) || min)) } as Partial<GenSettings>)} className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-[#ded9cf] bg-white" />
    </label>
  );
  const time = (k: 'start' | 'end' | 'lunchStart', label: string) => (
    <label className="text-xs font-semibold text-slate-600">{label}
      <input type="time" value={cfg[k]} onChange={(e) => set({ [k]: e.target.value } as Partial<GenSettings>)} className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-[#ded9cf] bg-white" />
    </label>
  );
  const Grid: React.FC<{ slots: GenSlot[]; days: string[] }> = ({ slots, days }) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-xs border-separate border-spacing-y-1">
        <thead><tr className="text-left text-slate-500"><th className="py-2 pr-3 w-44">Time</th>{days.map((d) => <th key={d} className="pr-2">{d}</th>)}</tr></thead>
        <tbody>
          {slots.map((s) => s.kind !== 'class'
            ? <tr key={s.key}><td colSpan={days.length + 1} className={`text-center text-[11px] font-semibold rounded-lg py-1.5 ${s.kind === 'lunch' ? 'bg-[#fbf3e4] text-[#8a5a14]' : 'bg-[#eef4fb] text-[#2d5d8a]'}`}>{s.label} · {s.start} to {s.end}</td></tr>
            : <tr key={s.key}><td className="pr-3 align-top"><b className="text-slate-800">{s.label}</b><span className="block text-[11px] text-slate-500">{s.start} - {s.end}</span></td>{days.map((d) => <td key={d} className="pr-2"><div className="rounded-xl border border-dashed border-[#d9cbb2] bg-[#fffdf9] h-11" /></td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHead title="Timetable generator" sub="Set the day, then generate blank timetables for the classes. Subjects are added afterwards." onBack={onBack} />
      <Card title="Settings">
        <div className="space-y-4">
          <div><p className="text-xs font-semibold text-slate-600 mb-1.5">Working days</p><div className="flex flex-wrap gap-2">{DAYS.map((d) => <Chip key={d} active={cfg.days.includes(d)} onClick={() => set({ days: cfg.days.includes(d) ? cfg.days.filter((x) => x !== d) : DAYS.filter((x) => x === d || cfg.days.includes(x)) })}>{d}</Chip>)}</div></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{time('start', 'College starts')}{time('end', 'College ends')}{num('periodMin', 'Period length (minutes)', 20, 120)}</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{time('lunchStart', 'Lunch break starts')}{num('lunchMin', 'Lunch break (minutes)', 10, 90)}{num('washroomMin', 'Washroom break (minutes)', 0, 30)}<p className="text-[11px] text-slate-500 self-end pb-2">The washroom break is placed half-way between the college start and the lunch break.</p></div>
          <div>
            <div className="flex items-center justify-between mb-1.5"><p className="text-xs font-semibold text-slate-600">Classes ({cfg.sectionIds.length} of {sections.length})</p>
              <div className="flex gap-2"><button onClick={() => set({ sectionIds: sections.map((x) => x.id) })} className="text-[11px] font-semibold text-[#a3161b]">All</button><button onClick={() => set({ sectionIds: [] })} className="text-[11px] font-semibold text-slate-500">None</button></div></div>
            {getStandards().map((st) => (
              <div key={st.id} className="flex flex-wrap gap-1.5 mb-1.5 items-center"><span className="text-[11px] text-slate-500 w-20">{st.label}</span>
                {sections.filter((x) => x.std === st.id).map((x) => <Chip key={x.id} active={cfg.sectionIds.includes(x.id)} onClick={() => set({ sectionIds: cfg.sectionIds.includes(x.id) ? cfg.sectionIds.filter((i) => i !== x.id) : [...cfg.sectionIds, x.id] })}>{x.title.replace(/^\d+(st|nd|th) - /, '')}</Chip>)}</div>
            ))}
          </div>
        </div>
      </Card>
      <Card title="Day plan from these settings" right={<span className="text-xs text-slate-500">{preview.filter((s) => s.kind === 'class').length} periods a day</span>}>
        <div className="flex flex-wrap gap-2">{preview.map((s) => <span key={s.key} className={`px-3 py-1.5 rounded-xl text-xs border ${s.kind === 'class' ? 'bg-white border-[#ece4da] text-slate-700' : s.kind === 'lunch' ? 'bg-[#fbf3e4] border-[#e7d3b0] text-[#8a5a14]' : 'bg-[#eef4fb] border-[#c9dcf0] text-[#2d5d8a]'}`}><b>{s.label}</b> {s.start} - {s.end}</span>)}</div>
        {problems.length > 0 && <ul className="mt-3 text-xs text-red-600 space-y-0.5">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
        <button disabled={problems.length > 0} onClick={generate} className="mt-4 px-5 py-2.5 rounded-xl bg-[#a3161b] text-white text-sm font-semibold disabled:opacity-40">Generate blank timetable</button>
      </Card>
      {made && (
        <Card title="Blank timetable" right={<span className="text-xs text-slate-500">Generated {made.at} · no subjects allotted yet</span>}>
          <div className="flex flex-wrap gap-1.5 mb-3">{made.settings.sectionIds.map((id) => { const sc = sections.find((x) => x.id === id)!; return <Chip key={id} active={view === id} onClick={() => setView(id)}>{sc.title}</Chip>; })}</div>
          <Grid slots={made.slots} days={made.settings.days} />
        </Card>
      )}
    </div>
  );
};
