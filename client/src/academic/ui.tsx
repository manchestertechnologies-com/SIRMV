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
