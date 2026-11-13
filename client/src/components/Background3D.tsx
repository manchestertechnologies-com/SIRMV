import React, { useEffect, useRef } from 'react';

// A depth backdrop, like a modern landing page: layered soft light at different distances, a perspective floor
// that runs off to a horizon, and a gentle vignette. Layers shift by different amounts with the pointer (parallax),
// so the page feels deep without any objects in it. Decoration only.
type Orb = { x: number; y: number; s: number; d: number; layer: 'far' | 'mid' | 'near'; tone: 'gold' | 'red' | 'cream'; delay: number };
const ORBS: Orb[] = [
  { x: -6, y: -8, s: 620, d: 38, layer: 'far', tone: 'gold', delay: 0 },
  { x: 62, y: -14, s: 700, d: 46, layer: 'far', tone: 'red', delay: -12 },
  { x: 30, y: 52, s: 560, d: 52, layer: 'far', tone: 'cream', delay: -20 },
  { x: 78, y: 48, s: 360, d: 30, layer: 'mid', tone: 'gold', delay: -6 },
  { x: 8, y: 58, s: 300, d: 34, layer: 'mid', tone: 'red', delay: -16 },
  { x: 44, y: 8, s: 220, d: 28, layer: 'mid', tone: 'gold', delay: -9 },
  { x: 90, y: 14, s: 90, d: 22, layer: 'near', tone: 'gold', delay: -3 },
  { x: 18, y: 30, s: 70, d: 26, layer: 'near', tone: 'red', delay: -11 },
  { x: 56, y: 74, s: 110, d: 24, layer: 'near', tone: 'gold', delay: -7 },
  { x: 74, y: 86, s: 64, d: 20, layer: 'near', tone: 'red', delay: -15 },
];

export const Background3D: React.FC = () => {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0; let px = 0, py = 0;
    const move = (e: PointerEvent) => {
      px = (e.clientX / window.innerWidth) * 2 - 1; py = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; root.current?.style.setProperty('--px', px.toFixed(3)); root.current?.style.setProperty('--py', py.toFixed(3)); });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return (
    <div ref={root} aria-hidden className="mt-bg3d">
      <div className="mt-bg3d-sky" />
      {(['far', 'mid'] as const).map((l) => (
        <div key={l} className={`mt-bg3d-layer ${l}`}>
          {ORBS.filter((o) => o.layer === l).map((o, i) => <span key={i} className={`mt-bg3d-orb ${o.tone}`} style={{ left: `${o.x}%`, top: `${o.y}%`, width: o.s, height: o.s, animationDuration: `${o.d}s`, animationDelay: `${o.delay}s` }} />)}
        </div>
      ))}
      <div className="mt-bg3d-horizon" />
      <div className="mt-bg3d-scene"><div className="mt-bg3d-floor" /></div>
      <div className="mt-bg3d-layer near">
        {ORBS.filter((o) => o.layer === 'near').map((o, i) => <span key={i} className={`mt-bg3d-orb ${o.tone}`} style={{ left: `${o.x}%`, top: `${o.y}%`, width: o.s, height: o.s, animationDuration: `${o.d}s`, animationDelay: `${o.delay}s` }} />)}
      </div>
      <div className="mt-bg3d-vignette" />
    </div>
  );
};
