import React from 'react';
import { allSections, staffById } from './sampleData';
import { Avatar } from './ui';

// "Your classes" (you are the class teacher) come first, then the other classes you teach.
export const MyClassGroups: React.FC<{ only: string[]; staffId?: string; onPick: (id: string) => void }> = ({ only, staffId, onPick }) => {
  const mine = allSections().filter((s) => only.includes(s.id));
  const own = mine.filter((s) => s.classTeacherId === staffId);
  const other = mine.filter((s) => s.classTeacherId !== staffId);
  const Grid = ({ list, badge }: { list: typeof mine; badge?: string }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map((s) => { const ct = staffById(s.classTeacherId)!; return (
        <button key={s.id} onClick={() => onPick(s.id)} className="mt-tile mt-tile-card text-left rounded-2xl bg-white p-4">
          <div className="flex items-start justify-between gap-2"><p className="text-sm font-bold text-slate-900 font-heading">{s.title}</p>{badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#a3161b] text-white">{badge}</span>}</div>
          <p className="text-[11px] text-slate-500">{s.batch}</p>
          <div className="flex items-center gap-3 mt-4"><Avatar name={ct.name} pid={ct.id} size={42} /><div className="min-w-0"><p className="text-xs font-semibold text-slate-800 truncate">{ct.name}</p><p className="text-[11px] text-slate-500">Class teacher</p></div></div>
          <p className="mt-4 text-xs text-slate-600">Total students: <b className="text-slate-900">{s.count}</b></p>
        </button>); })}
    </div>
  );
  return (
    <div className="space-y-6">
      {own.length > 0 && <div><h3 className="text-sm font-bold font-heading text-slate-900 mb-2">Class you are class teacher of <span className="text-slate-400 font-medium">({own.length})</span></h3><Grid list={own} badge="Class teacher" /></div>}
      {other.length > 0 && <div><h3 className="text-sm font-bold font-heading text-slate-900 mb-2">Other classes you teach <span className="text-slate-400 font-medium">({other.length})</span></h3><Grid list={other} /></div>}
    </div>
  );
};
