import React, { useEffect, useRef, useState } from 'react';

// A small CSS 3D model of a building: every floor is a slab, every room a box.
// Used by the Blueprint, Hostel and Exam Management screens so they all show the same plan.
export interface Box3D { id: string; label: string; sub?: string; fill?: number; color?: string }
export interface Floor3D { name: string; boxes: Box3D[] }

const W = 58, D = 46, H = 16, GAP = 10;

const colorOf = (b: Box3D) => {
  if (b.color) return b.color;
  if (b.fill === undefined) return '#c28535';
  if (b.fill <= 0) return '#cfc8bc';
  if (b.fill >= 1) return '#8c1118';
  return '#d9a85a';
};
const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16); const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
};

const Room: React.FC<{ b: Box3D; x: number; y: number; active: boolean; onClick?: () => void }> = ({ b, x, y, active, onClick }) => {
  const c = colorOf(b); const h = active ? H + 10 : H;
  return (
    <div onClick={onClick} style={{ position: 'absolute', left: x, top: y, width: W, height: D, transformStyle: 'preserve-3d', cursor: onClick ? 'pointer' : 'default', transition: 'transform .25s' }}>
      <div style={{ position: 'absolute', inset: 0, background: shade(c, 1.12), border: `1.5px solid ${active ? '#4a0709' : shade(c, 0.7)}`, transform: `translateZ(${h}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', lineHeight: 1.1, borderRadius: 3 }}>
        <b style={{ fontSize: 10, textShadow: '0 1px 1px rgba(0,0,0,.35)' }}>{b.label}</b>
        {b.sub && <span style={{ fontSize: 8.5, opacity: 0.95 }}>{b.sub}</span>}
      </div>
      <div style={{ position: 'absolute', left: 0, top: D, width: W, height: h, background: shade(c, 0.78), transformOrigin: 'top', transform: 'rotateX(90deg)' }} />
      <div style={{ position: 'absolute', left: W, top: 0, width: h, height: D, background: shade(c, 0.6), transformOrigin: 'left', transform: 'rotateY(-90deg)' }} />
    </div>
  );
};

export const Blueprint3D: React.FC<{ floors: Floor3D[]; selected?: string | null; onSelect?: (id: string) => void; height?: number }> = ({ floors, selected, onSelect, height = 0 }) => {
  const [only, setOnly] = useState<number | 'all'>('all');
  const [spin, setSpin] = useState(-32);
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  useEffect(() => {
    const fit = () => setWidth(wrap.current?.clientWidth || 900);
    fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit);
  }, []);

  const shown = floors.map((f, i) => ({ f, i })).filter((x) => only === 'all' || x.i === only);
  const maxRooms = Math.max(1, ...shown.map((x) => x.f.boxes.length));
  const cols = Math.min(10, Math.max(3, Math.ceil(Math.sqrt(maxRooms * 1.8))));
  const rows = Math.ceil(maxRooms / cols);
  const fw = cols * (W + GAP) + GAP, fd = rows * (D + GAP) + GAP;
  const zStep = shown.length > 1 ? Math.round(fd * 0.78 + 34) : 0;
  const diag = Math.hypot(fw, fd);
  const scale = Math.min(1.25, (width * 0.92) / diag);
  const half = diag * 0.27 * scale;                     // half of a floor's height on screen
  const rise = zStep * 0.85 * (shown.length - 1) * scale; // how far the top floor lifts
  const originY = rise + half + 36;
  const stageH = originY + half + 40;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setOnly('all')} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${only === 'all' ? 'bg-[#a3161b] text-white border-[#a3161b]' : 'bg-white text-slate-600 border-[#ded9cf]'}`}>All floors</button>
        {floors.map((f, i) => <button key={f.name} onClick={() => setOnly(i)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${only === i ? 'bg-[#a3161b] text-white border-[#a3161b]' : 'bg-white text-slate-600 border-[#ded9cf]'}`}>{f.name}</button>)}
        <label className="ml-auto inline-flex items-center gap-2 text-[11px] text-slate-500">Turn<input type="range" min={-80} max={20} value={spin} onChange={(e) => setSpin(+e.target.value)} className="accent-[#a3161b]" /></label>
      </div>
      <div ref={wrap} className="relative rounded-2xl border border-[#ece4da] bg-[#fbf6ee]" style={{ height: stageH, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: '50%', top: originY, perspective: 1800, width: 0, height: 0 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, transformStyle: 'preserve-3d', transform: `scale(${scale}) rotateX(58deg) rotateZ(${spin}deg)`, transition: 'transform .35s' }}>
            {shown.map(({ f, i }, k) => {
              const z = (shown.length - 1 - k) * zStep;
              return (
                <div key={f.name} style={{ position: 'absolute', left: -fw / 2, top: -fd / 2, width: fw, height: fd, transformStyle: 'preserve-3d', transform: `translateZ(${z}px)` }}>
                  <div style={{ position: 'absolute', inset: 0, background: '#fff', border: '2px solid #8c1118', borderRadius: 8, boxShadow: '0 0 0 4px rgba(194,133,53,.18)' }} />
                  <div style={{ position: 'absolute', left: 6, top: -22, fontSize: 12, fontWeight: 700, color: '#8c1118', whiteSpace: 'nowrap', transform: 'translateZ(1px)' }}>{f.name}</div>
                  {f.boxes.map((b, n) => <Room key={b.id} b={b} x={GAP + (n % cols) * (W + GAP)} y={GAP + Math.floor(n / cols) * (D + GAP)} active={selected === b.id} onClick={onSelect ? () => onSelect(b.id) : undefined} />)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
