import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { allSections, attendanceSeries, getStaff, staffWeekLoad } from '../academic/sampleData';
import { sectionsFor } from '../academic/scope';

// Animated progress ring: draws from empty to its value once it appears.
export const Ring: React.FC<{ value: number; size?: number; stroke?: number; color?: string; label?: string }> = ({ value, size = 84, stroke = 9, color = '#a3161b', label }) => {
  const [v, setV] = useState(0);
  useEffect(() => { const t = requestAnimationFrame(() => setV(value)); return () => cancelAnimationFrame(t); }, [value]);
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#efe6d6" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, v) / 100)} style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900 font-heading">{label ?? `${Math.round(value)}%`}</div>
    </div>
  );
};

// Small line chart that draws itself; hover a point to read it.
const Trend: React.FC<{ data: { label: string; v: number }[]; color?: string }> = ({ data, color = '#a3161b' }) => {
  const [on, setOn] = useState(false); const [hi, setHi] = useState<number | null>(null);
  useEffect(() => { const t = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(t); }, []);
  const W = 320, H = 96, pad = 8; const lo = Math.min(...data.map((d) => d.v)) - 2, hiV = Math.max(...data.map((d) => d.v)) + 2;
  const pts = data.map((d, i) => [pad + (i * (W - pad * 2)) / (data.length - 1), H - pad - ((d.v - lo) / (hiV - lo || 1)) * (H - pad * 2)] as const);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24 overflow-visible">
        <defs><linearGradient id="mt-trend" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".22" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        <path d={`${line} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`} fill="url(#mt-trend)" style={{ opacity: on ? 1 : 0, transition: 'opacity 1s ease .3s' }} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={on ? 0 : 1} style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(.2,.8,.2,1)' }} />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={hi === i ? 5 : 3} fill="#fff" stroke={color} strokeWidth="2" onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} style={{ transition: 'r .2s' }} />)}
      </svg>
      <p className="text-[11px] text-slate-500 h-4">{hi !== null ? `${data[hi].label}: ${data[hi].v.toFixed(1)}%` : 'Last 7 days'}</p>
    </div>
  );
};

const Kpi: React.FC<{ label: string; value: React.ReactNode; sub?: string }> = ({ label, value, sub }) => (
  <div className="mt-glass-card rounded-2xl p-4 flex flex-col justify-between min-h-[112px]">
    <p className="text-[11px] text-slate-500 font-medium">{label}</p>
    <p className="text-3xl font-bold text-slate-900 font-heading leading-tight">{value}</p>
    {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
  </div>
);

// A compact overview on the dashboard: what is useful for the signed-in role, in the same sample data as the rest of the app.
export const Overview: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role;
  if (!role || ['STUDENT', 'PARENT'].includes(role)) return null;
  const staff = getStaff(); const secs = allSections();
  const me = user?.staffId ? staff.find((s) => s.id === user.staffId) : undefined;

  if (role === 'TEACHER' && me) {
    const mine = sectionsFor('TEACHER', me.id) || []; const grid = staffWeekLoad(me.id);
    const periods = grid.reduce((a, r) => a + r.filter(Boolean).length, 0); const capacity = grid.reduce((a, r) => a + r.length, 0);
    const students = secs.filter((s) => mine.includes(s.id)).reduce((a, s) => a + s.count, 0);
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="mt-glass-card rounded-2xl p-4 flex items-center gap-4 col-span-2 lg:col-span-1"><Ring value={(periods / capacity) * 100} /><div><p className="text-[11px] text-slate-500">Teaching load</p><p className="text-sm font-bold text-slate-900">{periods} of {capacity} periods</p></div></div>
        <Kpi label="Classes you teach" value={mine.length} sub="this week" /><Kpi label="Students in them" value={students} /><Kpi label="Periods today" value={grid[Math.max(0, Math.min(5, new Date().getDay() - 1))]?.filter(Boolean).length ?? 0} />
      </div>
    );
  }

  const group = role === 'HOD' && me ? staff.filter((s) => s.subject === me.subject) : staff;
  const series = attendanceSeries(group, 'week');
  const pct = (b: { present: number; total: number }) => (b.total ? (b.present / b.total) * 100 : 0);
  const today = series[series.length - 1]; const trend = series.filter((b) => b.total && b.present).map((b) => ({ label: b.label, v: pct(b) }));
  const students = (role === 'HOD' && me ? secs.filter((s) => (sectionsFor('HOD', me.id) || []).includes(s.id)) : secs).reduce((a, s) => a + s.count, 0);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="mt-glass-card rounded-2xl p-4 flex items-center gap-4"><Ring value={pct(today)} /><div><p className="text-[11px] text-slate-500">Faculty present today</p><p className="text-sm font-bold text-slate-900">{today.present} of {today.total}</p></div></div>
      <Kpi label={role === 'HOD' ? 'Department staff' : 'Faculty and staff'} value={group.length} />
      <Kpi label={role === 'HOD' ? 'Students in your classes' : 'Students'} value={students} sub={`${role === 'HOD' ? '' : secs.length + ' classes'}`} />
      <div className="mt-glass-card rounded-2xl p-4 col-span-2 lg:col-span-1"><p className="text-[11px] text-slate-500 font-medium mb-1">Faculty attendance</p><Trend data={trend} /></div>
    </div>
  );
};
