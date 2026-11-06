import React, { useRef, useState } from 'react';
import { Camera, Pencil } from 'lucide-react';
import { compressImage, getEdits, getPhoto, saveEdits, savePhoto } from './store';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import type { SubjectName } from './sampleData';

export const GREEN = '#2e9e62';
export const RED = '#d64545';
export const AMBER = '#e6b23a';
export const GREY = '#cfd4dc';
export const MAROON = '#a3161b';

// ---------- avatar (initials now; image once photos come from the database) ----------
const TINTS = ['#a3161b', '#c28535', '#8c1118', '#b4533a', '#7a4a1c', '#c7222a'];
export const Avatar: React.FC<{ name: string; src?: string; pid?: string; size?: number; square?: boolean }> = ({ name, src: srcIn, pid, size = 48, square }) => {
  const src = srcIn || getPhoto(pid);
  const initials = name.replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/i, '').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const tint = TINTS[(name.charCodeAt(0) + name.length) % TINTS.length];
  const style: React.CSSProperties = { width: size, height: size, borderRadius: square ? 14 : size, background: src ? undefined : tint, fontSize: size * 0.36 };
  return src ? (
    <img src={src} alt={name} style={style} className="object-cover shrink-0" />
  ) : (
    <span style={style} className="inline-flex items-center justify-center shrink-0 text-white font-semibold select-none ring-2 ring-white shadow-sm">{initials}</span>
  );
};

// ---------- page chrome ----------
export const Crumbs: React.FC<{ items: { label: string; onClick?: () => void }[] }> = ({ items }) => (
  <nav className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
    {items.map((c, i) => (
      <React.Fragment key={i}>
        {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300" />}
        {c.onClick ? (
          <button onClick={c.onClick} className="hover:text-[#a3161b] font-medium transition">{c.label}</button>
        ) : (
          <span className="text-slate-800 font-semibold">{c.label}</span>
        )}
      </React.Fragment>
    ))}
  </nav>
);

export const PageHead: React.FC<{ title: string; sub?: string; onBack: () => void; crumbs?: { label: string; onClick?: () => void }[]; right?: React.ReactNode }> = ({ title, sub, onBack, crumbs, right }) => (
  <div className="pb-3 border-b border-[#ded9cf] space-y-2">
    {crumbs && <Crumbs items={crumbs} />}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onBack} className="p-2 bg-white hover:bg-[#fff6f4] border border-[#ded9cf] rounded-xl text-slate-600 transition shrink-0" title="Back">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-slate-900 font-heading truncate">{title}</h1>
          {sub && <p className="text-xs text-slate-500 truncate">{sub}</p>}
        </div>
      </div>
      {right && <div className="flex items-center gap-2 flex-wrap">{right}</div>}
    </div>
  </div>
);

export const Chip: React.FC<{ active?: boolean; onClick?: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button onClick={onClick} data-active={active ? 'true' : undefined} className="mt-chip px-3.5 py-1.5 rounded-full border border-[#ded9cf] bg-white text-xs font-semibold text-slate-700 whitespace-nowrap">
    <span>{children}</span>
  </button>
);

export const TabBar: React.FC<{ items: string[]; value: string; onChange: (v: string) => void }> = ({ items, value, onChange }) => (
  <div className="flex gap-1 overflow-x-auto bg-white border border-[#ded9cf] rounded-2xl p-1">
    {items.map((t) => (
      <button key={t} onClick={() => onChange(t)}
        className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${value === t ? 'bg-[#a3161b] text-white shadow-sm' : 'text-slate-600 hover:bg-[#fff6f4] hover:text-[#a3161b]'}`}>
        {t}
      </button>
    ))}
  </div>
);

export const Card: React.FC<{ className?: string; children: React.ReactNode; title?: string; right?: React.ReactNode }> = ({ className = '', children, title, right }) => (
  <div className={`rounded-2xl border border-[#ece4da] bg-white p-4 sm:p-5 ${className}`}>
    {title && (
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="text-sm font-bold text-slate-900 font-heading">{title}</h3>
        {right}
      </div>
    )}
    {children}
  </div>
);

export const StatCard: React.FC<{ label: string; value: string | number; suffix?: string; sub?: string; tone?: 'red' | 'gold' | 'green' | 'slate' }> = ({ label, value, suffix, sub, tone = 'red' }) => {
  const colour = { red: 'text-[#a3161b]', gold: 'text-[#b27a2c]', green: 'text-[#1f8a52]', slate: 'text-slate-900' }[tone];
  return (
    <div className="rounded-2xl border border-[#ece4da] bg-white p-4">
      <p className="text-[11px] text-slate-500 font-medium">{label}</p>
      <p className={`mt-1 text-2xl font-semibold font-heading ${colour}`}>{value}</p>
      {(suffix || sub) && <p className="text-[11px] text-slate-400 mt-0.5">{suffix || sub}</p>}
    </div>
  );
};

export const Pill: React.FC<{ tone: 'green' | 'red' | 'amber' | 'grey' | 'gold'; children: React.ReactNode }> = ({ tone, children }) => {
  const c = { green: 'bg-emerald-50 text-emerald-700', red: 'bg-red-50 text-red-700', amber: 'bg-amber-50 text-amber-700', grey: 'bg-slate-100 text-slate-600', gold: 'bg-[#fbf1df] text-[#8a5a14]' }[tone];
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${c}`}>{children}</span>;
};

export const Bar: React.FC<{ value: number; color?: string; h?: string }> = ({ value, color = MAROON, h = 'h-2' }) => (
  <div className={`${h} w-full rounded-full bg-slate-100 overflow-hidden`}>
    <div className={`${h} rounded-full`} style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
  </div>
);

export const Stacked: React.FC<{ parts: { v: number; color: string }[] }> = ({ parts }) => {
  const total = parts.reduce((a, p) => a + p.v, 0) || 1;
  return (
    <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100">
      {parts.map((p, i) => <div key={i} className="h-3" style={{ width: `${(p.v / total) * 100}%`, background: p.color }} />)}
    </div>
  );
};

export const Legend: React.FC<{ items: { label: string; color: string }[] }> = ({ items }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1">
    {items.map((i) => (
      <span key={i.label} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
        <i className="w-2.5 h-2.5 rounded-sm" style={{ background: i.color }} />{i.label}
      </span>
    ))}
  </div>
);

// ---------- charts (svg, no library) ----------
export interface BarDatum { label: string; parts: { v: number; color: string }[]; title?: string; onClick?: () => void }
export const BarChart: React.FC<{ data: BarDatum[]; max?: number; height?: number; showValues?: boolean }> = ({ data, max, height = 170, showValues }) => {
  const m = max ?? Math.max(1, ...data.map((d) => d.parts.reduce((a, p) => a + p.v, 0)));
  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-1.5 sm:gap-2" style={{ height, minWidth: data.length * 28 }}>
        {data.map((d, i) => {
          const total = d.parts.reduce((a, p) => a + p.v, 0);
          return (
            <button key={i} onClick={d.onClick} title={d.title || `${d.label}: ${total}`} disabled={!d.onClick}
              className="group flex-1 min-w-[22px] h-full flex flex-col justify-end items-center gap-1 disabled:cursor-default">
              {showValues && <span className="text-[10px] text-slate-500">{total}</span>}
              <div className="w-full max-w-[34px] flex flex-col-reverse rounded-t-md overflow-hidden transition group-hover:opacity-85" style={{ height: `${(total / m) * (height - 36)}px` }}>
                {d.parts.map((p, k) => <div key={k} style={{ height: `${total ? (p.v / total) * 100 : 0}%`, background: p.color }} />)}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex gap-1.5 sm:gap-2 mt-1.5" style={{ minWidth: data.length * 28 }}>
        {data.map((d, i) => <span key={i} className="flex-1 min-w-[22px] text-center text-[9px] sm:text-[10px] text-slate-500 truncate">{d.label}</span>)}
      </div>
    </div>
  );
};

export const Donut: React.FC<{ parts: { label: string; v: number; color: string }[]; size?: number; centre?: string; centreSub?: string }> = ({ parts, size = 150, centre, centreSub }) => {
  const total = parts.reduce((a, p) => a + p.v, 0) || 1; const r = size / 2 - 12; const c = 2 * Math.PI * r; let off = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f1f4" strokeWidth={18} />
        {parts.map((p, i) => {
          const len = (p.v / total) * c; const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.color} strokeWidth={18} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-off} />; off += len; return el;
        })}
        {centre && (
          <g className="rotate-90" style={{ transformOrigin: 'center' }}>
            <text x={size / 2} y={size / 2 + 2} textAnchor="middle" className="fill-slate-900" style={{ fontSize: 22, fontWeight: 700 }}>{centre}</text>
            {centreSub && <text x={size / 2} y={size / 2 + 18} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 10 }}>{centreSub}</text>}
          </g>
        )}
      </svg>
      <ul className="space-y-1.5 text-xs">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2 text-slate-700"><i className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />{p.label}<b className="ml-1 text-slate-900">{p.v}</b></li>
        ))}
      </ul>
    </div>
  );
};

export const LineChart: React.FC<{ points: { label: string; v: number }[]; height?: number; color?: string; max?: number }> = ({ points, height = 140, color = MAROON, max = 100 }) => {
  const w = 900; const pad = 26; const step = (w - pad * 2) / Math.max(1, points.length - 1);
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${pad + i * step},${y(p.v)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ maxHeight: height * 1.35 }}>
      {[0, 25, 50, 75, 100].map((g) => <line key={g} x1={pad} x2={w - pad} y1={y((g / 100) * max)} y2={y((g / 100) * max)} stroke="#f0ebe4" />)}
      <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
      {points.map((p, i) => <circle key={i} cx={pad + i * step} cy={y(p.v)} r={3.5} fill="#fff" stroke={color} strokeWidth={2}><title>{`${p.label}: ${p.v}`}</title></circle>)}
      {points.map((p, i) => (i % Math.ceil(points.length / 8) === 0 ? <text key={i} x={pad + i * step} y={height - 5} textAnchor="middle" fontSize="11" fill="#94a3b8">{p.label}</text> : null))}
    </svg>
  );
};

// ---------- icons ----------
const OL = '#2B2D42';
const Tile: React.FC<{ bg: string; children: React.ReactNode; className?: string }> = ({ bg, children, className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 64 64" className={className} fill="none" stroke={OL} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="56" height="56" rx="16" fill={bg} stroke="none" />
    {children}
  </svg>
);
const Glyph: React.FC<{ t: string; bg: string; fs?: number; className?: string }> = ({ t, bg, fs = 26, className }) => (
  <Tile bg={bg} className={className}><text x="32" y="43" textAnchor="middle" stroke="none" fill="#fff" fontSize={fs} fontWeight={700} fontFamily="Poppins, Inter, sans-serif">{t}</text></Tile>
);

export const SubjectIcon: React.FC<{ subject: SubjectName | string; className?: string }> = ({ subject, className = 'w-16 h-16' }) => {
  switch (subject) {
    case 'Physics':
      return (<Tile bg="#fbe3d6" className={className}><ellipse cx="32" cy="32" rx="20" ry="8" stroke="#a3161b" /><ellipse cx="32" cy="32" rx="20" ry="8" transform="rotate(60 32 32)" stroke="#c28535" /><ellipse cx="32" cy="32" rx="20" ry="8" transform="rotate(120 32 32)" stroke="#a3161b" /><circle cx="32" cy="32" r="4" fill="#c28535" /></Tile>);
    case 'Chemistry':
      return (<Tile bg="#f6e7c8" className={className}><path d="M26 12h12M28 12v14L16 48a4 4 0 0 0 3.5 6h25a4 4 0 0 0 3.5-6L36 26V12" fill="#fff" /><path d="M21 40h22l4 8a3 3 0 0 1-2.7 4.4H19.7A3 3 0 0 1 17 48z" fill="#c7222a" stroke="none" /><circle cx="30" cy="44" r="2" fill="#fff" stroke="none" /><circle cx="37" cy="47" r="1.6" fill="#fff" stroke="none" /></Tile>);
    case 'Mathematics':
      return (<Tile bg="#f8d9d6" className={className}><path d="M18 20h28M32 20 24 46" stroke="#a3161b" strokeWidth={3.2} /><path d="M42 36l10 10M52 36 42 46" stroke="#c28535" strokeWidth={3.2} /><path d="M16 44h12" stroke="#a3161b" strokeWidth={3.2} /></Tile>);
    case 'Biology':
      return (<Tile bg="#e4efd9" className={className}><path d="M14 50C14 28 28 14 50 14c0 22-14 36-36 36z" fill="#7fb069" /><path d="M14 50 40 24" stroke="#fff" /></Tile>);
    case 'Computer Science':
      return (<Tile bg="#e3e6f4" className={className}><rect x="12" y="15" width="40" height="27" rx="4" fill="#fff" /><path d="M26 50h12M32 42v8" /><path d="m24 24-5 5 5 5M40 24l5 5-5 5" stroke="#a3161b" /></Tile>);
    case 'English': return <Glyph t="Aa" bg="#a3161b" className={className} />;
    case 'Kannada': return <Glyph t="ಕ" bg="#c28535" fs={30} className={className} />;
    case 'Hindi': return <Glyph t="हि" bg="#8c1118" fs={26} className={className} />;
    case 'Sanskrit': return <Glyph t="सं" bg="#b4533a" fs={26} className={className} />;
    default:
      return (<Tile bg="#efe6dc" className={className}><rect x="12" y="24" width="40" height="26" rx="5" fill="#fff" /><path d="M24 24v-5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v5M12 36h40" /><rect x="29" y="33" width="6" height="6" rx="1.5" fill="#c28535" /></Tile>);
  }
};

export const StandardIcon: React.FC<{ id: string; className?: string }> = ({ id, className = 'w-20 h-20' }) => {
  const bg = id === '11' ? '#a3161b' : id === '12' ? '#8c1118' : '#c28535';
  const t = id === 'LT' ? 'LT' : id;
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke={OL} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round">
      <rect x="6" y="6" width="52" height="52" rx="16" fill={bg} stroke="none" />
      <path d="M14 22 32 13l18 9v3H14z" fill="#fbe9c8" />
      <rect x="18" y="27" width="28" height="22" rx="3" fill="#fff" />
      <text x="32" y="44" textAnchor="middle" stroke="none" fill={bg} fontSize={t.length > 1 ? 15 : 17} fontWeight={800} fontFamily="Poppins, Inter, sans-serif">{t}</text>
    </svg>
  );
};

export const GroupIcon: React.FC<{ kind: 'class' | 'batch' | 'section'; className?: string }> = ({ kind, className = 'w-16 h-16' }) => {
  const bg = kind === 'class' ? '#a3161b' : kind === 'batch' ? '#c28535' : '#8c1118';
  return (
    <Tile bg={bg} className={className}>
      <rect x="14" y="18" width="36" height="26" rx="4" fill="#fff" />
      <path d="M22 28h20M22 34h12" stroke={bg} />
      <path d="M24 50h16" />
      {kind === 'section' && <circle cx="46" cy="18" r="6" fill="#fbe9c8" />}
      {kind === 'batch' && <path d="M20 14h24" />}
    </Tile>
  );
};

// big clickable icon card used for every "pick one" step of the flow
export const PickCard: React.FC<{ icon: React.ReactNode; title: string; lines?: string[]; badge?: string; onClick: () => void }> = ({ icon, title, lines = [], badge, onClick }) => (
  <button onClick={onClick} className="mt-tile mt-tile-card text-left rounded-2xl bg-white p-4 flex flex-col items-start gap-3 relative">
    <span className="rounded-2xl overflow-hidden">{icon}</span>
    <div className="min-w-0 w-full">
      <p className="text-sm font-bold text-slate-900 font-heading truncate">{title}</p>
      {lines.map((l, i) => <p key={i} className="text-[11px] text-slate-500 mt-0.5 truncate">{l}</p>)}
    </div>
    {badge && <span className="absolute top-3 right-3"><Pill tone="gold">{badge}</Pill></span>}
  </button>
);

export const Empty: React.FC<{ text: string }> = ({ text }) => <div className="text-center text-sm text-slate-500 py-10">{text}</div>;

// photo box: shows the saved picture or an "Add photo" placeholder; picking a file saves it
export const PhotoBox: React.FC<{ pid: string; name: string; size?: number }> = ({ pid, name, size = 96 }) => {
  const [src, setSrc] = useState<string | undefined>(getPhoto(pid));
  const ref = useRef<HTMLInputElement>(null);
  const pick = async (f?: File) => { if (!f) return; try { const d = await compressImage(f); savePhoto(pid, d); setSrc(d); } catch { /* ignore bad file */ } };
  return (
    <button type="button" onClick={() => ref.current?.click()} title="Add or change photo" style={{ width: size, height: size }}
      className="relative shrink-0 rounded-2xl overflow-hidden bg-white/15 border-2 border-dashed border-white/50 hover:border-white transition group">
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : (
        <span className="w-full h-full flex flex-col items-center justify-center gap-1 text-white/80"><Camera className="w-6 h-6" /><span className="text-[10px] font-medium">Add photo</span></span>
      )}
      {src && <span className="absolute inset-x-0 bottom-0 bg-black/45 text-white text-[10px] py-1 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1"><Camera className="w-3 h-3" />Change</span>}
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
    </button>
  );
};

// editable details form: read-only until Edit is pressed, saved per record
export interface Field { key: string; label: string; value: string; locked?: boolean }
export const useEdits = (id: string, base: Record<string, string>) => {
  const [vals, setVals] = useState<Record<string, string>>({ ...base, ...getEdits(id) });
  const save = (v: Record<string, string>) => { saveEdits(id, v); setVals(v); };
  return [vals, save] as const;
};
export const EditableCard: React.FC<{ id: string; title: string; fields: Field[]; onSaved?: (v: Record<string, string>) => void }> = ({ id, title, fields, onSaved }) => {
  const base = Object.fromEntries(fields.map((f) => [f.key, f.value]));
  const [vals, save] = useEdits(id, base);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(vals);
  const [saved, setSaved] = useState(false);
  return (
    <Card title={title} right={
      editing ? (
        <div className="flex gap-2">
          <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-xl border border-[#ded9cf] text-xs font-semibold text-slate-600">Cancel</button>
          <button onClick={() => { save(draft); onSaved?.(draft); setEditing(false); setSaved(true); }} className="px-3 py-1.5 rounded-xl bg-[#a3161b] text-white text-xs font-semibold">Save changes</button>
        </div>
      ) : (
        <button onClick={() => { setDraft(vals); setEditing(true); setSaved(false); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#ded9cf] text-xs font-semibold text-slate-700 hover:text-[#a3161b]"><Pencil className="w-3.5 h-3.5" />Edit</button>
      )
    }>
      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
        {fields.map((f) => (
          <div key={f.key}>
            <p className="text-[11px] text-slate-500 mb-1">{f.label}</p>
            {editing && !f.locked ? (
              <input value={draft[f.key] ?? ''} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-[#d9a85a] bg-white text-sm text-slate-900 outline-none focus:border-[#c7222a]" />
            ) : (
              <div className="px-3.5 py-2.5 rounded-xl border border-[#ece4da] bg-[#fcfaf7] text-sm text-slate-900 min-h-[42px]">{vals[f.key]}</div>
            )}
          </div>
        ))}
      </div>
      {saved && <p className="text-[11px] text-emerald-700 mt-3">Saved on this device. It will sync to the database once it is connected.</p>}
    </Card>
  );
};

// ---------- chapter icons (line pictograms, one per chapter topic) ----------
const P = ({ d }: { d: string }) => <path d={d} />;
const CH: Record<string, React.ReactNode> = {
  chart: <><P d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></>,
  bolt: <P d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  gear: <><circle cx="12" cy="12" r="3.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
  planet: <><circle cx="12" cy="12" r="5" /><ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(-20 12 12)" /></>,
  flame: <P d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-3 2-4 5-4 7-1-1-2-2-2-4-3 2-4 5-4 7 0 4 3 7 7 7z" />,
  bulb: <><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10c1 1 1 3 1 3h6s0-2 1-3a6 6 0 0 0-4-10z" /></>,
  atom: <><ellipse cx="12" cy="12" rx="10" ry="4" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1" /></>,
  scale: <><path d="M12 3v18M5 21h14M4 7h16M4 7l-2 6a3 3 0 0 0 6 0zM20 7l-2 6a3 3 0 0 0 6 0z" /></>,
  hex: <><path d="M12 2 21 7v10l-9 5-9-5V7z" /><path d="M12 8l4 2.3v4.4L12 17l-4-2.3v-4.4z" /></>,
  battery: <><rect x="2" y="7" width="18" height="10" rx="2" /><path d="M22 10v4M7 10v4M11 10v4" /></>,
  venn: <><circle cx="9" cy="12" r="6" /><circle cx="15" cy="12" r="6" /></>,
  triangle: <><path d="M3 20 12 4l9 16zM3 20h18" /><path d="M8 20a4 4 0 0 1 1-2.5" /></>,
  dots: <><circle cx="5" cy="19" r="1.5" /><circle cx="10" cy="14" r="1.5" /><circle cx="15" cy="9" r="1.5" /><circle cx="20" cy="4" r="1.5" /></>,
  arrow: <P d="M3 12h16M13 6l6 6-6 6" />,
  curve: <><path d="M3 20 21 20M3 20V3" /><path d="M5 17c4 0 5-12 9-12s3 9 7 9" /></>,
  integral: <><path d="M14 3c-3 0-3 2-3 5v8c0 3 0 5-3 5" /><path d="M16 8h2M6 16h2" /></>,
  dice: <><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8.5" cy="8.5" r="1" /><circle cx="15.5" cy="15.5" r="1" /><circle cx="12" cy="12" r="1" /></>,
  cell: <><circle cx="12" cy="12" r="9" /><circle cx="10" cy="11" r="3" /><circle cx="16" cy="15" r="1.2" /></>,
  leaf: <><path d="M4 20C4 10 10 4 20 4c0 10-6 16-16 16z" /><path d="M4 20 14 10" /></>,
  fish: <><path d="M3 12c4-6 11-6 15 0-4 6-11 6-15 0zM18 12l4-4v8z" /><circle cx="8" cy="11" r=".8" /></>,
  dna: <><path d="M7 3c0 6 10 6 10 12s-10 6-10 6M17 3c0 6-10 6-10 12M8.5 8h7M8.5 16h7" /></>,
  heart: <P d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
  flask: <><path d="M9 3h6M10 3v6L4 19a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-6-10V3" /></>,
  steps: <P d="M3 20h5v-5h5v-5h5V5h3" />,
  bin: <><path d="M5 4h4v6H5zM11 4h2v6h-2zM15 14h4v6h-4zM5 14h6v6H5z" /></>,
  code: <P d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />,
  layers: <><path d="M12 3 2 8l10 5 10-5zM2 13l10 5 10-5M2 17.5l10 5 10-5" /></>,
  toggle: <><rect x="2" y="7" width="20" height="10" rx="5" /><circle cx="16" cy="12" r="3" /></>,
  nodes: <><circle cx="12" cy="5" r="2.5" /><circle cx="5" cy="19" r="2.5" /><circle cx="19" cy="19" r="2.5" /><path d="M11 7.5 6 16.5M13 7.5l5 9M7.5 19h9" /></>,
  db: <><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
  flow: <><rect x="9" y="2" width="6" height="5" rx="1" /><rect x="2" y="17" width="6" height="5" rx="1" /><rect x="16" y="17" width="6" height="5" rx="1" /><path d="M12 7v5M5 17v-5h14v5" /></>,
};
const CH_MAP: Record<string, string> = {
  'Kinematics': 'chart', 'Laws of Motion': 'target', 'Work Energy Power': 'bolt', 'Rotational Motion': 'gear', 'Gravitation': 'planet', 'Thermodynamics': 'flame', 'Electrostatics': 'bolt', 'Current Electricity': 'bulb',
  'Mole Concept': 'scale', 'Atomic Structure': 'atom', 'Chemical Bonding': 'link', 'Equilibrium': 'scale', 'Organic Basics': 'hex', 'Hydrocarbons': 'hex', 'Electrochemistry': 'battery',
  'Sets & Relations': 'venn', 'Trigonometry': 'triangle', 'Complex Numbers': 'dots', 'Sequences': 'steps', 'Limits': 'arrow', 'Derivatives': 'curve', 'Integrals': 'integral', 'Probability': 'dice',
  'Cell Biology': 'cell', 'Plant Kingdom': 'leaf', 'Animal Kingdom': 'fish', 'Genetics': 'dna', 'Human Physiology': 'heart', 'Ecology': 'globe', 'Biotechnology': 'flask', 'Evolution': 'steps',
  'Number Systems': 'bin', 'Python Basics': 'code', 'Data Structures': 'layers', 'Boolean Logic': 'toggle', 'Networking': 'nodes', 'Databases': 'db', 'Algorithms': 'flow', 'Web Basics': 'globe',
};
export const ChapterIcon: React.FC<{ chapter: string; className?: string }> = ({ chapter, className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none" stroke="#d6336c" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">{CH[CH_MAP[chapter] || 'target']}</svg>
);
