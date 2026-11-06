import React, { useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Classroom, FLOOR_NAMES, loadClassrooms, roomCapacity, saveClassrooms, totalCapacity } from './classrooms';
import { Card, StatCard } from './ui';

export const ClassroomBlueprint: React.FC = () => {
  const [rooms, setRooms] = useState<Classroom[]>(loadClassrooms());
  const [names, setNames] = useState<Record<number, string>>({});
  const update = (l: Classroom[]) => { setRooms(l); saveClassrooms(l); };
  const patch = (id: string, p: Partial<Classroom>) => update(rooms.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const add = (floor: number) => { const nm = (names[floor] || '').trim() || `Room ${(floor + 1) * 100 + rooms.filter((r) => r.floor === floor).length + 1}`; update([...rooms, { id: `r${Date.now()}`, floor, name: nm, benches: 12, perBench: 2 }]); setNames({ ...names, [floor]: '' }); };
  const total = totalCapacity(rooms);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Whole college capacity" value={total} suffix="students seated" />
        <StatCard label="Classrooms" value={rooms.length} tone="slate" />
        <StatCard label="Benches" value={rooms.reduce((a, r) => a + r.benches, 0)} tone="gold" />
        <StatCard label="Floors" value={FLOOR_NAMES.length} tone="slate" />
      </div>
      <p className="text-xs text-slate-500">Name each classroom, then add or remove benches. Capacity = benches × seats per bench. Changes are saved on this device and used by Exam Management.</p>
      {[...FLOOR_NAMES.keys()].reverse().map((f) => {
        const list = rooms.filter((r) => r.floor === f);
        return (
          <Card key={f} title={`${FLOOR_NAMES[f]} · ${list.length} rooms · capacity ${totalCapacity(list)}`}
            right={<div className="flex gap-2"><input value={names[f] || ''} onChange={(e) => setNames({ ...names, [f]: e.target.value })} placeholder="New room name" className="w-36 px-3 py-1.5 rounded-xl border border-[#ded9cf] text-xs outline-none focus:border-[#c7222a]" /><button onClick={() => add(f)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#a3161b] text-white text-xs font-semibold"><Plus className="w-3.5 h-3.5" />Add room</button></div>}>
            <div className="rounded-xl border-2 border-[#8c1118]/60 bg-[#fffdf9] p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map((r) => (
                  <div key={r.id} className="rounded-lg border-2 border-[#c28535]/70 bg-white p-2.5">
                    <div className="flex items-center gap-2">
                      <input value={r.name} onChange={(e) => patch(r.id, { name: e.target.value })} className="flex-1 min-w-0 text-sm font-bold text-[#4a0709] bg-transparent outline-none border-b border-transparent focus:border-[#c7222a]" />
                      <button onClick={() => update(rooms.filter((x) => x.id !== r.id))} title="Delete room" className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-[3px] min-h-[26px]">
                      {Array.from({ length: Math.min(r.benches, 30) }).map((_, i) => <i key={i} className="w-4 h-2.5 rounded-[2px] bg-[#c28535]/80" />)}
                      {r.benches > 30 && <span className="text-[10px] text-slate-500">+{r.benches - 30}</span>}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <button onClick={() => patch(r.id, { benches: Math.max(0, r.benches - 1) })} className="w-6 h-6 rounded-lg border border-[#ded9cf] inline-flex items-center justify-center hover:text-[#a3161b]" title="Remove bench"><Minus className="w-3.5 h-3.5" /></button>
                        <b className="w-7 text-center text-slate-900">{r.benches}</b>
                        <button onClick={() => patch(r.id, { benches: r.benches + 1 })} className="w-6 h-6 rounded-lg border border-[#ded9cf] inline-flex items-center justify-center hover:text-[#a3161b]" title="Add bench"><Plus className="w-3.5 h-3.5" /></button>
                        <span className="text-slate-500">benches</span>
                      </span>
                      <select value={r.perBench} onChange={(e) => patch(r.id, { perBench: +e.target.value })} className="px-1.5 py-1 rounded-lg border border-[#ded9cf] bg-white text-[11px]"><option value={1}>1 / bench</option><option value={2}>2 / bench</option><option value={3}>3 / bench</option></select>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500">Capacity <b className="text-slate-900">{roomCapacity(r)}</b> students</p>
                  </div>
                ))}
                {list.length === 0 && <p className="text-xs text-slate-500 py-4">No classrooms on this floor yet.</p>}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
