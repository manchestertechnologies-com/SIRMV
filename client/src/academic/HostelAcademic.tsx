import { Blueprint3D, Floor3D } from './Blueprint3D';
import React, { useMemo, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { HostelDashboard } from '../pages/HostelDashboard';
import {
  BLOCKS, BlockDef, RoomDef, Student, bedName, blockCapacity, blockRooms, hostelOccupants, sectionById, studentAvg,
} from './sampleData';
import { Avatar, Bar, Card, Chip, GREEN, AMBER, RED, PageHead, StatCard, TabBar } from './ui';
import { OutpassFlow } from './OutpassFlow';

const TABS = ['Blueprint', 'Room Shuffle', 'Outpass', 'Records'];

export const HostelAcademic: React.FC<{ onExit: () => void; initialTab?: string }> = ({ onExit, initialTab = 'Blueprint' }) => {
  const [tab, setTab] = useState(initialTab);
  const [ver, setVer] = useState(0); // bump after a shuffle is applied
  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHead title="Hostel" sub="SIR MV PU College · blocks, rooms, shuffle and outpass" onBack={onExit} />
      <TabBar items={TABS} value={tab} onChange={setTab} />
      {tab === 'Blueprint' && <Blueprint key={ver} />}
      {tab === 'Room Shuffle' && <ShuffleView onApplied={() => setVer((v) => v + 1)} />}
      {tab === 'Outpass' && <OutpassFlow />}
      {tab === 'Records' && <HostelDashboard />}
    </div>
  );
};

// ---------- blueprint ----------
const tone = (n: number, cap: number) => (n === 0 ? { b: '#d8d2c8', bg: '#faf8f5' } : n >= cap ? { b: '#8c1118', bg: '#fbe9e7' } : { b: '#c28535', bg: '#fdf4e4' });

const RoomBox: React.FC<{ room: RoomDef; occ: Student[]; active: boolean; onClick: () => void }> = ({ room, occ, active, onClick }) => {
  const t = tone(occ.length, room.share);
  return (
    <button onClick={onClick} title={`${room.label}: ${occ.length}/${room.share} beds`} style={{ borderColor: active ? '#a3161b' : t.b, background: t.bg, boxShadow: active ? '0 0 0 2px #a3161b' : undefined }}
      className="min-w-[58px] flex-1 max-w-[84px] h-[62px] border-2 rounded-md px-1 py-1 flex flex-col items-center justify-between transition hover:-translate-y-0.5">
      <span className="text-[10px] font-bold text-[#4a0709] leading-none">{room.no}</span>
      <span className="flex gap-0.5 flex-wrap justify-center">{Array.from({ length: room.share }).map((_, i) => <i key={i} className="w-2.5 h-2.5 rounded-[2px]" style={{ background: i < occ.length ? '#8c1118' : 'transparent', border: '1.5px solid #8c1118' }} />)}</span>
      <span className="text-[9px] text-slate-500 leading-none">{occ.length}/{room.share}</span>
    </button>
  );
};

const FloorPlan: React.FC<{ block: BlockDef; fi: number; rooms: RoomDef[]; occ: Map<string, Student[]>; sel: string | null; onSel: (l: string) => void }> = ({ block, fi, rooms, occ, sel, onSel }) => {
  const f = block.floors[fi]; const mine = rooms.filter((r) => r.floorIdx === fi);
  const box = (r: RoomDef) => <RoomBox key={r.label} room={r} occ={occ.get(r.label) || []} active={sel === r.label} onClick={() => onSel(r.label)} />;
  const half = Math.ceil(mine.length / 2);
  const corridor = <div className="h-5 rounded-sm bg-[repeating-linear-gradient(90deg,#efe6d6_0_10px,#f7f0e3_10px_20px)] border border-dashed border-[#d9c9a8] text-[9px] text-[#8a7a58] flex items-center justify-center">corridor</div>;
  return (
    <div className="flex gap-3 items-stretch">
      <div className="w-20 shrink-0 text-[11px] font-bold text-[#8c1118] flex items-center">{f.name}<br />{f.rooms} rooms · {f.share} share</div>
      <div className="flex-1 overflow-x-auto"><div className="min-w-[560px] space-y-1.5 p-2 rounded-xl border-2 border-[#8c1118]/70 bg-[#fffdf9]">
        {block.shape === 'bar' && (<><div className="flex gap-1.5">{mine.slice(0, half).map(box)}</div>{corridor}<div className="flex gap-1.5">{mine.slice(half).map(box)}</div></>)}
        {block.shape === 'L' && (<><div className="flex gap-1.5">{mine.slice(0, half + 1).map(box)}</div><div className="flex gap-1.5 w-[45%]">{mine.slice(half + 1).map(box)}</div></>)}
        {block.shape === 'U' && (() => { const q = Math.ceil(mine.length / 4); return (<>
          <div className="flex gap-1.5 items-start"><div className="flex gap-1.5 flex-1">{mine.slice(0, q).map(box)}</div><div className="w-24 h-[62px] rounded-md border border-dashed border-[#c9d8b8] bg-[#f3f8ec] text-[9px] text-[#6f8a55] flex items-center justify-center shrink-0">courtyard</div><div className="flex gap-1.5 flex-1 justify-end">{mine.slice(q, q * 2).map(box)}</div></div>
          {corridor}<div className="flex gap-1.5">{mine.slice(q * 2).map(box)}</div></>); })()}
      </div></div>
    </div>
  );
};

export const Blueprint: React.FC = () => {
  const [bid, setBid] = useState(BLOCKS[0].id);
  const [sel, setSel] = useState<string | null>(null);
  const block = BLOCKS.find((b) => b.id === bid)!;
  const rooms = useMemo(() => blockRooms(block), [block]);
  const occ = useMemo(() => { const m = new Map<string, Student[]>(); hostelOccupants(block.name).forEach((s) => { const a = m.get(s.hostel!.room) || []; a.push(s); m.set(s.hostel!.room, a); }); return m; }, [block]);
  const cap = blockCapacity(block); const used = Array.from(occ.values()).reduce((a, v) => a + v.length, 0);
  const floors3d: Floor3D[] = useMemo(() => block.floors.map((f, fi) => ({ name: f.name, boxes: rooms.filter((r) => r.floorIdx === fi).map((r) => { const n = (occ.get(r.label) || []).length; return { id: r.label, label: String(r.no), sub: `${n}/${r.share}`, fill: n / r.share }; }) })), [block, rooms, occ]);
  const selRoom = rooms.find((r) => r.label === sel) || null; const people = sel ? occ.get(sel) || [] : [];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">{BLOCKS.map((b) => <Chip key={b.id} active={bid === b.id} onClick={() => { setBid(b.id); setSel(null); }}>{b.name.split(' - ').slice(0, 2).join(' · ')} ({b.gender === 'Male' ? 'Boys' : 'Girls'})</Chip>)}</div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard label="Floors" value={block.floors.length} tone="slate" />
        <StatCard label="Rooms" value={rooms.length} tone="slate" />
        <StatCard label="Bed capacity" value={cap} />
        <StatCard label="Occupied" value={used} tone="green" />
        <StatCard label="Vacant" value={cap - used} tone="gold" />
        <div className="rounded-2xl border border-[#ece4da] bg-white p-4"><p className="text-[11px] text-slate-500">Warden</p><p className="mt-1 text-sm font-semibold text-slate-900">{block.warden.name}</p><p className="text-[11px] text-slate-500">{block.warden.phone}</p></div>
      </div>
      <div className="grid lg:grid-cols-[1fr_300px] gap-5 items-start">
        <Card title={`${block.name} · ${block.gender === 'Male' ? 'Boys' : 'Girls'} hostel`} right={<span className="text-[11px] text-slate-400">{block.shape === 'bar' ? 'Straight block' : block.shape === 'L' ? 'L-shaped block' : 'U-shaped block with courtyard'}</span>}>
          <div className="space-y-4">{[...block.floors.keys()].reverse().map((fi) => <FloorPlan key={fi} block={block} fi={fi} rooms={rooms} occ={occ} sel={sel} onSel={setSel} />)}</div>
          <div className="mt-5 pt-4 border-t border-[#f0ebe4]"><p className="text-xs font-semibold text-slate-700 mb-2">3D model · tap a room</p><Blueprint3D floors={floors3d} selected={sel} onSelect={setSel} height={400} /></div>
          <div className="flex flex-wrap gap-4 mt-4 text-[11px] text-slate-600">
            {[['Full', '#8c1118'], ['Partly filled', '#c28535'], ['Empty', '#d8d2c8']].map(([l, c]) => <span key={l} className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm border-2" style={{ borderColor: c }} />{l}</span>)}
            <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[2px] bg-[#8c1118]" />Bed in use</span>
          </div>
        </Card>
        <Card title={selRoom ? `${selRoom.label} · ${selRoom.floor}` : 'Room details'}>
          {!selRoom ? <p className="text-sm text-slate-500">Select a room on the plan to see who sleeps there.</p> : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">{selRoom.share} sharing · {people.length} occupied · {selRoom.share - people.length} vacant</p>
              {Array.from({ length: selRoom.share }).map((_, i) => { const p = people[i]; return (
                <div key={i} className="flex items-center gap-3 p-2 rounded-xl border border-[#ece4da]">
                  {p ? <Avatar name={p.name} pid={p.id} size={38} /> : <span className="w-[38px] h-[38px] rounded-full border-2 border-dashed border-slate-300" />}
                  <span className="min-w-0 flex-1 text-xs"><b className="block text-slate-900 truncate">{p ? p.name : 'Vacant'}</b><span className="text-slate-500">{bedName(selRoom.share, i)}{p ? ` · ${sectionById(p.sectionId)!.title}` : ''}</span></span>
                  {p && <b className="text-xs text-slate-700">{studentAvg(p.id)}%</b>}
                </div>); })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

// ---------- shuffle by test performance ----------
type Mode = 'mix' | 'level';
const seeded = (seed: number) => { let a = seed || 1; return () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; }; };

const ShuffleView: React.FC<{ onApplied: () => void }> = ({ onApplied }) => {
  const [bid, setBid] = useState(BLOCKS[0].id); const [mode, setMode] = useState<Mode>('mix'); const [seed, setSeed] = useState(1); const [done, setDone] = useState(false);
  const block = BLOCKS.find((b) => b.id === bid)!;
  const students = useMemo(() => hostelOccupants(block.name), [block, done]); // eslint-disable-line react-hooks/exhaustive-deps
  const plan = useMemo(() => {
    const rooms = blockRooms(block); const rnd = seeded(seed * 7919);
    const ranked = [...students].map((s) => ({ s, score: studentAvg(s.id) + (mode === 'mix' ? rnd() * 6 : 0) })).sort((a, b) => b.score - a.score);
    const order = [...rooms]; if (mode === 'mix') order.sort(() => rnd() - 0.5);
    const slots: Student[][] = order.map(() => []);
    if (mode === 'level') { let ri = 0; ranked.forEach(({ s }) => { while (ri < order.length && slots[ri].length >= order[ri].share) ri++; if (ri < order.length) slots[ri].push(s); }); }
    else { let pass = 0, placed = 0; while (placed < ranked.length && pass < 10) { const idx = [...order.keys()]; if (pass % 2) idx.reverse(); for (const i of idx) { if (placed >= ranked.length) break; if (slots[i].length < order[i].share) { slots[i].push(ranked[placed++].s); } } pass++; } }
    return order.map((r, i) => ({ room: r, people: slots[i] })).filter((x) => x.people.length).sort((a, b) => a.room.no - b.room.no);
  }, [students, mode, seed, block]);
  const moves = plan.flatMap((p) => p.people.map((s, i) => ({ s, to: p.room, bed: bedName(p.room.share, i) }))).filter((m) => m.s.hostel!.room !== m.to.label);
  const slowN = students.filter((s) => studentAvg(s.id) < 45).length; const strongN = students.filter((s) => studentAvg(s.id) >= 65).length;
  const mixedRooms = plan.filter((p) => p.people.some((s) => studentAvg(s.id) < 45) && p.people.some((s) => studentAvg(s.id) >= 65)).length;
  const roomAvg = (p: Student[]) => Math.round(p.reduce((a, s) => a + studentAvg(s.id), 0) / Math.max(1, p.length));
  const apply = () => { plan.forEach((p) => p.people.forEach((s, i) => { s.hostel = { block: block.name, floor: p.room.floor, room: p.room.label, bed: bedName(p.room.share, i) }; })); setDone(true); onApplied(); };
  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap gap-2">{BLOCKS.map((b) => <Chip key={b.id} active={bid === b.id} onClick={() => { setBid(b.id); setDone(false); }}>{b.name.split(' - ').slice(0, 2).join(' · ')}</Chip>)}</div>
          <div className="flex flex-wrap gap-2 items-center">
            <Chip active={mode === 'mix'} onClick={() => { setMode('mix'); setDone(false); }}>Mix slow and strong learners</Chip><Chip active={mode === 'level'} onClick={() => { setMode('level'); setDone(false); }}>Same level together</Chip>
            <button onClick={() => { setMode('mix'); setSeed((x) => x + 1); setDone(false); }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#c28535] text-white text-xs font-semibold hover:bg-[#a9702a]"><Shuffle className="w-3.5 h-3.5" />Shuffle based on performance</button>
            <button onClick={apply} disabled={done || moves.length === 0} className="px-4 py-2 rounded-xl bg-[#a3161b] text-white text-xs font-semibold disabled:opacity-40">{done ? 'Applied' : `Apply (${moves.length} moves)`}</button>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">{mode === 'mix' ? 'Uses each student\'s average test score so slow learners share a room with higher performers and can learn from them.' : 'Students with similar average test scores share a room.'} Based on every test result this term.</p>
      </Card>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Students in block" value={students.length} tone="slate" />
        <StatCard label="Slow learners (below 45%)" value={slowN} />
        <StatCard label="Strong performers (65%+)" value={strongN} tone="green" />
        <StatCard label="Rooms mixing both" value={mixedRooms} suffix={`of ${plan.length} rooms`} tone="gold" />
      </div>
      <div className="grid xl:grid-cols-[1fr_380px] gap-5 items-start">
        <Card title="Proposed rooms" right={<span className="text-[11px] text-slate-400">average test % per room</span>}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {plan.map((p) => { const a = roomAvg(p.people); return (
              <div key={p.room.label} className="rounded-xl border border-[#ece4da] p-2.5">
                <div className="flex justify-between text-xs"><b className="text-slate-900">{p.room.label}</b><span className="text-slate-400">{p.room.floor.replace(' Floor', '')}</span></div>
                <div className="mt-1.5 mb-2"><Bar value={a} color={a >= 60 ? GREEN : a >= 45 ? AMBER : RED} h="h-1.5" /></div>
                {p.people.map((s) => <p key={s.id} className="flex justify-between items-center text-[11px] text-slate-600 leading-5"><span className="truncate inline-flex items-center gap-1.5"><i className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: studentAvg(s.id) >= 65 ? GREEN : studentAvg(s.id) < 45 ? RED : AMBER }} />{s.name}</span><b className="text-slate-800 ml-2">{studentAvg(s.id)}%</b></p>)}
              </div>); })}
          </div>
        </Card>
        <Card title={`Changes (${moves.length})`}>
          {moves.length === 0 ? <p className="text-sm text-slate-500">Rooms already match this plan.</p> : (
            <ul className="divide-y divide-[#f3ede6]">
              {moves.map((m) => <li key={m.s.id} className="py-2 flex items-center gap-2.5 text-xs"><Avatar name={m.s.name} pid={m.s.id} size={30} /><span className="min-w-0 flex-1"><b className="block text-slate-900 truncate">{m.s.name} <span className="text-slate-400 font-normal">· {studentAvg(m.s.id)}%</span></b><span className="text-slate-500">{m.s.hostel!.room} → <b className="text-[#a3161b]">{m.to.label}</b> · {m.bed}</span></span></li>)}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};
