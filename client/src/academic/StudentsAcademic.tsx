import React, { useEffect } from 'react';
import { doneOpen, hasReturn, peekOpen, returnBack, usePS } from './persist';
import { Settings2 } from 'lucide-react';
import { allSections, findStudent, getStandards, sectionById, staffById, standardTotals } from './sampleData';
import { Avatar, Card, PageHead, PickCard, StandardIcon } from './ui';
import { MyClassGroups } from './ClassPicker';
import { StudentGrid, StudentProfile } from './StudentViews';

type Nav = { v: 'home' } | { v: 'std'; std: string } | { v: 'sec'; sec: string } | { v: 'stu'; id: string };

export const StudentsAcademic: React.FC<{ onExit: () => void; onManage?: () => void; only?: string[]; staffId?: string }> = ({ onExit, onManage, only, staffId }) => {
  const open = peekOpen('student');
  const [nav, setNav] = usePS<Nav>('students', 'nav', { v: 'home' }, open ? { v: 'stu', id: open } : undefined);
  const [via, setVia] = usePS<boolean>('students', 'via', false, open ? true : undefined);
  useEffect(() => { if (open) doneOpen('student'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const backFromStudent = (id: string) => { if (via && hasReturn()) { setVia(false); returnBack(); } else setNav({ v: 'sec', sec: findStudent(id)!.sectionId }); };
  const standards = getStandards();
  const manage = onManage ? (
    <button onClick={onManage} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#ded9cf] bg-white text-xs font-semibold text-slate-700 hover:text-[#a3161b]"><Settings2 className="w-3.5 h-3.5" /> Manage records</button>
  ) : null;

  if (only && (nav.v === 'home' || nav.v === 'std')) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHead title="My class students" sub={`${only.length} classes you teach`} onBack={onExit} />
        <MyClassGroups only={only} staffId={staffId} onPick={(id) => setNav({ v: 'sec', sec: id })} />
      </div>
    );
  }

  if (nav.v === 'home') {
    const total = standards.reduce((a, s) => a + standardTotals(s).students, 0);
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHead title="Students" sub={`SIR MV PU College · ${total} students across ${allSections().length} sections`} onBack={onExit} right={manage} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {standards.map((s) => {
            const t = standardTotals(s);
            return <PickCard key={s.id} icon={<StandardIcon id={s.id} />} title={s.full} lines={[`${t.classes} Classes`, `${t.students} Students`]} onClick={() => setNav({ v: 'std', std: s.id })} />;
          })}
        </div>
      </div>
    );
  }

  if (nav.v === 'std') {
    const std = standards.find((s) => s.id === nav.std)!; const t = standardTotals(std);
    const secs = std.streams.flatMap((st) => st.batches.flatMap((b) => b.sections));
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHead title={std.full} sub={`${t.classes} Classes · ${t.students} Students`} onBack={() => setNav({ v: 'home' })}
          crumbs={[{ label: 'Students', onClick: () => setNav({ v: 'home' }) }, { label: std.label }]} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {secs.map((s) => {
            const ct = staffById(s.classTeacherId)!;
            return (
              <button key={s.id} onClick={() => setNav({ v: 'sec', sec: s.id })} className="mt-tile mt-tile-card text-left rounded-2xl bg-white p-4">
                <p className="text-sm font-bold text-slate-900 font-heading">{s.title}</p>
                <p className="text-[11px] text-slate-500">{s.batch}</p>
                <div className="flex items-center gap-3 mt-4">
                  <Avatar name={ct.name} size={42} />
                  <div className="min-w-0"><p className="text-xs font-semibold text-slate-800 truncate">{ct.name}</p><p className="text-[11px] text-slate-500">Class teacher</p></div>
                </div>
                <p className="mt-4 text-xs text-slate-600">Total students: <b className="text-slate-900">{s.count}</b></p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (nav.v === 'sec') {
    const sec = sectionById(nav.sec)!;
    const std = standards.find((s) => s.id === sec.std)!;
    const siblings = allSections().filter((s) => s.std === sec.std);
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHead title={sec.title} sub={`${sec.count} students · ${sec.batch}`} onBack={() => setNav({ v: 'std', std: sec.std })}
          crumbs={[{ label: 'Students', onClick: () => setNav({ v: 'home' }) }, { label: std.label, onClick: () => setNav({ v: 'std', std: sec.std }) }, { label: sec.title }]}
          right={
            <select value={sec.id} onChange={(e) => setNav({ v: 'sec', sec: e.target.value })} className="px-3 py-2 rounded-xl border border-[#ded9cf] bg-white text-xs font-semibold">
              {siblings.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          } />
        <StudentGrid sectionId={sec.id} onOpen={(id) => setNav({ v: 'stu', id })} />
      </div>
    );
  }

  const student = findStudent(nav.id)!;
  const sec = sectionById(student.sectionId)!;
  const std = standards.find((s) => s.id === sec.std)!;
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHead title={student.name} sub={`${sec.title} · Roll ${student.roll}`} onBack={() => backFromStudent(student.id)}
        crumbs={[{ label: 'Students', onClick: () => setNav({ v: 'home' }) }, { label: std.label, onClick: () => setNav({ v: 'std', std: sec.std }) }, { label: sec.title, onClick: () => setNav({ v: 'sec', sec: sec.id }) }, { label: student.name }]} />
      <StudentProfile student={student} />
      <Card><p className="text-[11px] text-slate-400">Screens use sample data until the database is connected.</p></Card>
    </div>
  );
};
