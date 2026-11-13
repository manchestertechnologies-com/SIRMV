import React, { useEffect, useRef } from 'react';

// A quiet 3D backdrop behind the pages: a perspective floor grid, slowly turning glass cubes and soft glows.
// It leans a little towards the pointer so the page feels like it has depth. Decoration only.
const CUBES: { x: number; y: number; s: number; d: number; t: number; z: number; tone: 'red' | 'gold' }[] = [
  { x: 8, y: 14, s: 74, d: 34, t: 0, z: 60, tone: 'gold' },
  { x: 84, y: 10, s: 110, d: 46, t: -8, z: 20, tone: 'red' },
  { x: 70, y: 52, s: 54, d: 28, t: -4, z: 120, tone: 'gold' },
  { x: 20, y: 60, s: 96, d: 52, t: -14, z: 10, tone: 'red' },
  { x: 48, y: 22, s: 44, d: 30, t: -2, z: 150, tone: 'gold' },
  { x: 92, y: 70, s: 66, d: 40, t: -20, z: 80, tone: 'gold' },
  { x: 38, y: 82, s: 58, d: 36, t: -10, z: 100, tone: 'red' },
];
const FACES = ['rotateY(0deg)', 'rotateY(90deg)', 'rotateY(180deg)', 'rotateY(270deg)', 'rotateX(90deg)', 'rotateX(-90deg)'];

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
      <div className="mt-bg3d-glow" style={{ left: '6%', top: '8%', width: 420, height: 420, background: 'radial-gradient(circle, rgba(217,168,90,.28), transparent 65%)' }} />
      <div className="mt-bg3d-glow" style={{ right: '4%', bottom: '10%', width: 520, height: 520, background: 'radial-gradient(circle, rgba(163,22,27,.16), transparent 65%)' }} />
      <div className="mt-bg3d-scene">
        <div className="mt-bg3d-floor" />
        {CUBES.map((c, i) => (
          <div key={i} className="mt-bg3d-cube" style={{ left: `${c.x}%`, top: `${c.y}%`, ['--s' as string]: `${c.s}px`, ['--z' as string]: c.z, animationDuration: `${c.d}s`, animationDelay: `${c.t}s` }}>
            {FACES.map((f) => <i key={f} className={`mt-bg3d-face ${c.tone}`} style={{ transform: `${f} translateZ(calc(var(--s) / 2))` }} />)}
          </div>
        ))}
      </div>
    </div>
  );
};
