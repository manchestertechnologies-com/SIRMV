import React, { useEffect, useRef, useState } from 'react';
import { RoomPlan, Seat } from './seating';

// 3D classroom: benches as boxes, every seat shows the student's roll number. Tap a seat to open the student.
const SW = 40, SH = 30, BH = 12, GAP = 18;
const shade = (hex: string, f: number) => { const n = parseInt(hex.slice(1), 16); const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`; };

export const Room3D: React.FC<{ plan: RoomPlan; color: (s: Seat) => string; onSeat?: (s: Seat) => void }> = ({ plan, color, onSeat }) => {
  const { room, cols, seats } = plan;
  const spin = -12;
  const wrap = useRef<HTMLDivElement>(null); const [width, setWidth] = useState(900);
  useEffect(() => { const fit = () => setWidth(wrap.current?.clientWidth || 900); fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit); }, []);
  const bw = room.perBench * SW + 8, bd = SH + 10;
  const rows = Math.ceil(room.benches / cols);
  const fw = cols * (bw + GAP) + GAP, fd = rows * (bd + GAP) + 50;
  const scale = Math.min(1.3, (width * 0.94) / Math.hypot(fw, fd * 0.9));
  const half = Math.hypot(fw, fd) * 0.27 * scale; const stageH = half * 2 + 90;
  const benches = [...Array(room.benches).keys()];
  return (
    <div className="space-y-2">
      <div ref={wrap} className="relative rounded-2xl border border-[#ece4da] bg-[#fbf6ee] overflow-hidden" style={{ height: stageH }}>
        <div style={{ position: 'absolute', left: '50%', top: half + 40, perspective: 1600, width: 0, height: 0 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, transformStyle: 'preserve-3d', transform: `scale(${scale}) rotateX(52deg) rotateZ(${spin}deg)` }}>
            <div style={{ position: 'absolute', left: -fw / 2, top: -fd / 2, width: fw, height: fd, transformStyle: 'preserve-3d' }}>
              <div style={{ position: 'absolute', inset: 0, background: '#fff', border: '2px solid #8c1118', borderRadius: 8 }} />
              <div style={{ position: 'absolute', left: fw * 0.2, right: fw * 0.2, top: 8, height: 18, background: '#8c1118', color: '#fff', fontSize: 10, fontWeight: 700, textAlign: 'center', lineHeight: '18px', borderRadius: 3, transform: 'translateZ(2px)' }}>BOARD · {room.name}</div>
              {benches.map((b) => {
                const row = Math.floor(b / cols), col = b % cols; const x = GAP + col * (bw + GAP), y = 44 + row * (bd + GAP);
                return (
                  <div key={b} style={{ position: 'absolute', left: x, top: y, width: bw, height: bd, transformStyle: 'preserve-3d' }}>
                    <div style={{ position: 'absolute', inset: 0, background: '#e9d7b5', border: '1px solid #b8955a', borderRadius: 3, transform: `translateZ(${BH}px)`, display: 'flex', gap: 0, padding: 4, boxSizing: 'border-box' }}>
                      {seats.filter((s) => s.bench === b).map((s) => {
                        const c = color(s);
                        return (
                          <button key={s.side} type="button" title={s.student ? `${s.student.name} · ${s.label}` : `${s.label} · empty`} onClick={() => s.student && onSeat?.(s)}
                            style={{ width: SW, height: SH, background: c, color: '#fff', fontSize: 9, fontWeight: 700, border: `1px solid ${shade(c.startsWith('#') ? c : '#999999', 0.7)}`, borderRadius: 3, cursor: s.student ? 'pointer' : 'default', padding: 0, lineHeight: 1 }}>
                            {s.student ? s.student.roll : ''}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ position: 'absolute', left: 0, top: bd, width: bw, height: BH, background: '#b8955a', transformOrigin: 'top', transform: 'rotateX(90deg)' }} />
                    <div style={{ position: 'absolute', left: bw, top: 0, width: BH, height: bd, background: '#9c7b45', transformOrigin: 'left', transform: 'rotateY(-90deg)' }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
