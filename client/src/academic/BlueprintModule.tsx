import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { BLOCKS, BlockDef, FloorDef, floorLabel, hasSavedBlocks, setBlocks } from './sampleData';
import { Classroom, ClassroomSetup, generateClassrooms, hasSavedClassrooms, saveClassrooms, loadClassrooms } from './classrooms';
import { ClassroomBlueprint } from './ClassroomBlueprint';
import { HallModel } from './ClassModel';
import { loadPlan } from './examPlan';
import { allSections } from './sampleData';
import { Blueprint as HostelBlueprint } from './HostelAcademic';
import { Card, PageHead, TabBar } from './ui';

const field = 'mt-1 w-full px-3 py-2.5 rounded-xl border border-[#ded9cf] bg-white text-sm text-slate-900 outline-none focus:border-[#c7222a]';
const Num: React.FC<{ label: string; value: number; min?: number; max?: number; onChange: (n: number) => void }> = ({ label, value, min = 1, max = 99, onChange }) => (
  <label className="text-xs text-slate-500">{label}<input type="number" min={min} max={max} value={value} onChange={(e) => onChange(Math.max(min, Math.min(max, +e.target.value || min)))} className={field} /></label>
);

export const BlueprintModule: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [tab, setTab] = useState('Classroom blueprint');
  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHead title="Blueprint" sub="Enter your floors, rooms and capacity once. Classes, exams and hostel use it." onBack={onExit} />
      <TabBar items={['Classroom blueprint', 'Hostel room blueprint']} value={tab} onChange={setTab} />
      {tab === 'Classroom blueprint' ? <ClassSide /> : <HostelSide />}
    </div>
  );
};

// ---------- classrooms ----------
const ClassSide: React.FC = () => {
  const [saved, setSaved] = useState(hasSavedClassrooms());
  const [rooms, setRooms] = useState<Classroom[]>(loadClassrooms());
  const [cfg, setCfg] = useState<ClassroomSetup>({ floors: 4, roomsPerFloor: 6, benches: 15, perBench: 2, prefix: 'Room' });
  const [editing, setEditing] = useState(!hasSavedClassrooms());
  const build = () => { const l = generateClassrooms(cfg); saveClassrooms(l); setRooms(l); setSaved(true); setEditing(false); };
  if (editing) {
    return (
      <Card title={saved ? 'Rebuild classrooms' : 'Set up your classrooms'}>
        <p className="text-xs text-slate-500 mb-4">Tell us the building details. We create every classroom with benches, and you can rename rooms and change benches afterwards.</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Num label="Floors" value={cfg.floors} max={10} onChange={(n) => setCfg({ ...cfg, floors: n })} />
          <Num label="Classrooms per floor" value={cfg.roomsPerFloor} max={40} onChange={(n) => setCfg({ ...cfg, roomsPerFloor: n })} />
          <Num label="Benches per room" value={cfg.benches} max={80} onChange={(n) => setCfg({ ...cfg, benches: n })} />
          <Num label="Students per bench" value={cfg.perBench} max={4} onChange={(n) => setCfg({ ...cfg, perBench: n })} />
          <label className="text-xs text-slate-500">Room name prefix<input value={cfg.prefix} onChange={(e) => setCfg({ ...cfg, prefix: e.target.value })} className={field} /></label>
        </div>
        <p className="mt-4 text-sm text-slate-700">This creates <b>{cfg.floors * cfg.roomsPerFloor}</b> classrooms and seats <b>{cfg.floors * cfg.roomsPerFloor * cfg.benches * cfg.perBench}</b> students.</p>
        <div className="mt-4 flex gap-3">
          <button onClick={build} className="px-5 py-2.5 rounded-xl bg-[#a3161b] text-white text-xs font-semibold">{saved ? 'Rebuild classrooms' : 'Create classroom blueprint'}</button>
          {saved && <button onClick={() => setEditing(false)} className="px-5 py-2.5 rounded-xl border border-[#ded9cf] text-xs font-semibold text-slate-600">Cancel</button>}
        </div>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={() => setEditing(true)} className="px-4 py-2 rounded-xl border border-[#ded9cf] bg-white text-xs font-semibold text-slate-700 hover:text-[#a3161b]">Start again with new details</button></div>
      <HallModel rooms={rooms} sections={allSections()} halls={loadPlan()?.halls || {}} title="3D model · updates as you change rooms (green = hall used by the saved exam)" />
      <ClassroomBlueprint key={rooms.length} initial={rooms} onChange={setRooms} />
    </div>
  );
};

// ---------- hostel blocks ----------
const blank = (): BlockDef => ({ id: '', name: '', gender: 'Male', shape: 'bar', warden: { name: '', phone: '' }, floors: [] });
const HostelSide: React.FC = () => {
  const [ver, setVer] = useState(0);
  const [form, setForm] = useState<{ block: BlockDef; floors: number; rooms: number; sharing: string; editIdx: number } | null>(hasSavedBlocks() ? null : null);
  const open = (idx: number) => {
    const b = idx >= 0 ? BLOCKS[idx] : blank();
    setForm({ block: { ...b, warden: { ...b.warden } }, floors: b.floors.length || 3, rooms: b.floors[0]?.rooms || 10, sharing: b.floors.length ? b.floors.map((f) => f.share).join(',') : '3', editIdx: idx });
  };
  const save = () => {
    if (!form) return;
    const share = form.sharing.split(',').map((x) => Math.max(1, Math.min(8, parseInt(x.trim(), 10) || 1)));
    const floors: FloorDef[] = Array.from({ length: form.floors }, (_, i) => ({ name: floorLabel(i), rooms: form.rooms, share: share[i] ?? share[share.length - 1] }));
    const b: BlockDef = { ...form.block, id: form.block.id || `B${Date.now() % 10000}`, floors };
    const list = [...BLOCKS]; if (form.editIdx >= 0) list[form.editIdx] = b; else list.push(b);
    setBlocks(list); setForm(null); setVer((v) => v + 1);
  };
  const remove = (i: number) => { setBlocks(BLOCKS.filter((_, k) => k !== i)); setVer((v) => v + 1); };
  const ok = form && form.block.name.trim() && form.block.warden.name.trim();
  return (
    <div className="space-y-5" key={ver}>
      <Card title="Hostel blocks" right={<button onClick={() => open(-1)} className="px-4 py-2 rounded-xl bg-[#a3161b] text-white text-xs font-semibold">Add block</button>}>
        {!hasSavedBlocks() && <p className="text-xs rounded-xl bg-[#fff8e8] border border-[#f0dcae] text-[#7a5410] px-3 py-2 mb-3">These are sample blocks. Add your own blocks or edit these and save to use your real hostel layout.</p>}
        <ul className="divide-y divide-[#f3ede6]">
          {BLOCKS.map((b, i) => (
            <li key={b.id + i} className="py-3 flex flex-wrap items-center gap-3">
              <span className="min-w-0 flex-1"><b className="block text-sm text-slate-900">{b.name}</b><span className="text-[11px] text-slate-500">{b.gender === 'Male' ? 'Boys' : 'Girls'} · {b.floors.length} floors · {b.floors.reduce((a, f) => a + f.rooms, 0)} rooms · {b.floors.reduce((a, f) => a + f.rooms * f.share, 0)} beds · Warden {b.warden.name}</span></span>
              <button onClick={() => open(i)} className="px-3 py-1.5 rounded-xl border border-[#ded9cf] text-xs font-semibold text-slate-700 hover:text-[#a3161b]">Edit</button>
              <button onClick={() => remove(i)} className="p-2 text-slate-400 hover:text-red-600" title="Remove block"><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
          {BLOCKS.length === 0 && <li className="py-6 text-sm text-slate-500 text-center">No hostel blocks yet. Press Add block.</li>}
        </ul>
      </Card>

      {form && (
        <Card title={form.editIdx >= 0 ? 'Edit block' : 'New block'}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="text-xs text-slate-500 lg:col-span-2">Block name<input value={form.block.name} onChange={(e) => setForm({ ...form, block: { ...form.block, name: e.target.value } })} placeholder="e.g. NEW CAMPUS - D-BLOCK - 2026-27" className={field} /></label>
            <label className="text-xs text-slate-500">For<select value={form.block.gender} onChange={(e) => setForm({ ...form, block: { ...form.block, gender: e.target.value as 'Male' | 'Female' } })} className={field}><option value="Male">Boys</option><option value="Female">Girls</option></select></label>
            <label className="text-xs text-slate-500">Building shape<select value={form.block.shape} onChange={(e) => setForm({ ...form, block: { ...form.block, shape: e.target.value as BlockDef['shape'] } })} className={field}><option value="bar">Straight</option><option value="L">L-shaped</option><option value="U">U-shaped with courtyard</option></select></label>
            <label className="text-xs text-slate-500">Warden name<input value={form.block.warden.name} onChange={(e) => setForm({ ...form, block: { ...form.block, warden: { ...form.block.warden, name: e.target.value } } })} className={field} /></label>
            <label className="text-xs text-slate-500">Warden mobile<input value={form.block.warden.phone} onChange={(e) => setForm({ ...form, block: { ...form.block, warden: { ...form.block.warden, phone: e.target.value.replace(/\D/g, '').slice(0, 10) } } })} className={field} /></label>
            <Num label="Number of floors" value={form.floors} max={10} onChange={(n) => setForm({ ...form, floors: n })} />
            <Num label="Rooms on each floor" value={form.rooms} max={60} onChange={(n) => setForm({ ...form, rooms: n })} />
            <label className="text-xs text-slate-500">Beds per room (one number, or one per floor like 2,3,4,4)<input value={form.sharing} onChange={(e) => setForm({ ...form, sharing: e.target.value.replace(/[^0-9,]/g, '') })} className={field} /></label>
          </div>
          <div className="mt-4 flex gap-3">
            <button disabled={!ok} onClick={save} className="px-5 py-2.5 rounded-xl bg-[#a3161b] text-white text-xs font-semibold disabled:opacity-40">Save block</button>
            <button onClick={() => setForm(null)} className="px-5 py-2.5 rounded-xl border border-[#ded9cf] text-xs font-semibold text-slate-600">Cancel</button>
          </div>
        </Card>
      )}
      {BLOCKS.length > 0 && <HostelBlueprint key={`bp${ver}`} />}
    </div>
  );
};
