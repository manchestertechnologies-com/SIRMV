import React, { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, FileText, Filter, LayoutGrid, Network, Plus, Settings, User, Pencil, FileSpreadsheet } from 'lucide-react';
import { SectionDef, Student, allSections, getStaff, getStudents } from './sampleData';
import { Avatar, PageHead, SubjectIcon } from './ui';

interface Report { id: string; name: string; sectionIds: string[]; tests: number; theories: number; staff: string; date: string }
const KEY = 'mt-reports-custom';
const fmtD = (d: Date) => `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

const seedReports = (): Report[] => {
  const s = allSections(); const staff = getStaff().filter((x) => x.role !== 'Non-Teaching');
  const by = (i: number) => staff[(i * 5 + 2) % staff.length].name.replace(/^(Mr|Mrs)\.\s/, '');
  const ids = (std: string) => s.filter((x) => x.std === std && x.stream === 'PCMB').map((x) => x.id);
  return [
    { id: 'r1', name: 'Grand Test 3 - Consolidated', sectionIds: ids('12').slice(0, 2), tests: 1, theories: 1, staff: by(1), date: '31-10-2026 01:40 PM' },
    { id: 'r2', name: '12th NEET Achievers - Part Test Averages', sectionIds: ids('12'), tests: 5, theories: 0, staff: by(2), date: '24-10-2026 05:44 PM' },
    { id: 'r3', name: 'LT NEET Repeaters - Averages (6 tests)', sectionIds: ids('LT'), tests: 6, theories: 2, staff: by(3), date: '17-10-2026 12:38 PM' },
    { id: 'r4', name: '11th NEET Foundation - Weekly Test 8', sectionIds: ids('11').slice(0, 1), tests: 2, theories: 2, staff: by(4), date: '10-10-2026 01:46 PM' },
    { id: 'r5', name: '11th KCET Regular - Unit Test 2', sectionIds: ids('11').slice(2, 3), tests: 1, theories: 1, staff: by(5), date: '25-07-2026 10:12 AM' },
  ];
};
const loadCustom = (): Report[] => { try { const v = localStorage.getItem(KEY); return v ? (JSON.parse(v) as Report[]) : []; } catch { return []; } };

export const ReportsAcademic: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [custom, setCustom] = useState<Report[]>(loadCustom());
  const [openId, setOpenId] = useState<string | null>(null);
  const [modal, setModal] = useState<{ edit?: Report } | null>(null);
  const reports = [...custom, ...seedReports()];
  const save = (r: Report) => { const next = custom.some((c) => c.id === r.id) ? custom.map((c) => (c.id === r.id ? r : c)) : [r, ...custom]; setCustom(next); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ } };
  const open = reports.find((r) => r.id === openId);

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto">
      <PageHead title="Reports" sub="Test and theory marks by class" onBack={open ? () => setOpenId(null) : onExit}
        crumbs={[{ label: 'Dashboard', onClick: onExit }, open ? { label: 'Reports', onClick: () => setOpenId(null) } : { label: 'Reports' }, ...(open ? [{ label: open.name }] : [])]}
        right={!open ? <button onClick={() => setModal({})} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#a3161b] text-white text-xs font-semibold"><Plus className="w-3.5 h-3.5" />New</button> : undefined} />
      {open ? <ReportTable report={open} onEdit={() => setModal({ edit: open })} /> : (
        <div className="space-y-3">
          {reports.map((r, i) => (
            <button key={r.id} onClick={() => setOpenId(r.id)} className="mt-tile-card w-full text-left rounded-2xl bg-white p-4 sm:p-5 hover:shadow-md transition">
              <p className="text-base font-semibold text-slate-800">{i + 1}. {r.name}</p>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5"><Network className="w-3.5 h-3.5 text-slate-500" />Sections: {r.sectionIds.length}</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />Tests: {r.tests}</span>
                {r.theories > 0 && <span className="inline-flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-slate-500" />Theories: {r.theories}</span>}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-8 gap-y-1.5 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-500" /><b className="font-semibold">Staff Created:</b> {r.staff}</span>
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-slate-500" /><b className="font-semibold">Date:</b> {r.date}</span>
              </div>
            </button>
          ))}
        </div>
      )}
      {modal && <ReportModal initial={modal.edit} onClose={() => setModal(null)} onSave={(r) => { save(r); setModal(null); }} />}
    </div>
  );
};

const ReportModal: React.FC<{ initial?: Report; onClose: () => void; onSave: (r: Report) => void }> = ({ initial, onClose, onSave }) => {
  const secs = allSections();
  const [name, setName] = useState(initial?.name || '');
  const [ids, setIds] = useState<string[]>(initial?.sectionIds || []);
  const [tests, setTests] = useState(initial?.tests ?? 1); const [theories, setTheories] = useState(initial?.theories ?? 1);
  const toggle = (id: string) => setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold font-heading text-slate-900">{initial ? 'Edit report' : 'New report'}</h3>
        <label className="block mt-4 text-xs text-slate-500">Report name<input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-[#ded9cf] text-sm text-slate-900 outline-none focus:border-[#c7222a]" /></label>
        <p className="mt-4 text-xs text-slate-500">Sections</p>
        <div className="mt-1 flex flex-wrap gap-2">{secs.map((s) => <button key={s.id} onClick={() => toggle(s.id)} data-active={ids.includes(s.id) ? 'true' : undefined} className="mt-chip px-3 py-1.5 rounded-full border border-[#ded9cf] bg-white text-xs font-semibold text-slate-700"><span>{s.title}</span></button>)}</div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-500">Tests<input type="number" min={0} max={20} value={tests} onChange={(e) => setTests(+e.target.value || 0)} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-[#ded9cf] text-sm text-slate-900" /></label>
          <label className="text-xs text-slate-500">Theories<input type="number" min={0} max={20} value={theories} onChange={(e) => setTheories(+e.target.value || 0)} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-[#ded9cf] text-sm text-slate-900" /></label>
        </div>
        <div className="mt-5 flex justify-end gap-3"><button onClick={onClose} className="px-4 py-2 rounded-xl border border-[#ded9cf] text-xs font-semibold text-slate-600">Cancel</button>
          <button disabled={!name.trim() || ids.length === 0} onClick={() => onSave({ id: initial?.id || 'c' + Date.now(), name: name.trim(), sectionIds: ids, tests, theories, staff: initial?.staff || 'You', date: initial?.date || fmtD(new Date()) })} className="px-5 py-2 rounded-xl bg-[#a3161b] text-white text-xs font-semibold disabled:opacity-40">Save</button></div>
      </div>
    </div>
  );
};

// ---------- report table ----------
const TEST_SUBJ = [{ n: 'Physics', c: '#e0457b' }, { n: 'Chemistry', c: '#3b82f6' }, { n: 'Botany', c: '#22a559' }, { n: 'Zoology', c: '#2d6cdf' }];
const THEORY_SUBJ = [{ n: 'Physics', c: '#e0457b' }, { n: 'Chemistry', c: '#3b82f6' }, { n: 'Mathematics', c: '#22a559' }, { n: 'Biology', c: '#2d6cdf' }];
const hashN = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };

interface Row { st: Student; sec: SectionDef; tests: number[]; theory: number[]; tTotal: number; thTotal: number }
const buildRows = (r: Report, only: string | null): Row[] => {
  const rows: Row[] = [];
  r.sectionIds.filter((id) => !only || id === only).forEach((id) => {
    const sec = allSections().find((s) => s.id === id)!;
    getStudents(id).filter((s) => s.active).forEach((st) => {
      const tests = TEST_SUBJ.map((t) => Math.round(180 * Math.min(0.97, Math.max(0.08, st.ability * 0.85 + (hashN(r.id + st.id + t.n) - 0.5) * 0.4))));
      const theory = THEORY_SUBJ.map((t) => Math.round(35 * Math.min(1, Math.max(0.3, st.ability * 0.9 + (hashN(r.id + st.id + 'th' + t.n) - 0.4) * 0.35))));
      rows.push({ st, sec, tests, theory, tTotal: tests.reduce((a, b) => a + b, 0), thTotal: theory.reduce((a, b) => a + b, 0) });
    });
  });
  return rows.sort((a, b) => b.tTotal - a.tTotal);
};

const Menu: React.FC<{ icon: React.ReactNode; title: string; children: (close: () => void) => React.ReactNode }> = ({ icon, title, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} title={title} className={`w-10 h-9 rounded-lg inline-flex items-center justify-center text-white transition ${open ? 'bg-[#6e0d12]' : 'bg-[#a3161b] hover:bg-[#8c1118]'}`}>{icon}</button>
      {open && (<><div className="fixed inset-0 z-30" onClick={() => setOpen(false)} /><div className="absolute right-0 mt-2 z-40 w-60 rounded-xl bg-white border border-[#ece4da] shadow-xl py-2">{children(() => setOpen(false))}</div></>)}
    </div>
  );
};
const MenuHead: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="px-4 pt-2 pb-1 text-[10px] font-bold tracking-wide text-slate-400 uppercase">{children}</p>;
const subjIcon = (n: string) => (n === 'Botany' || n === 'Zoology' ? 'Biology' : n);
const MenuItem: React.FC<{ active?: boolean; color?: string; subject?: string; onClick: () => void; children: React.ReactNode }> = ({ active, color = '#a3161b', subject, onClick, children }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-1.5 text-sm text-left hover:bg-[#fff6f4] ${active ? 'bg-[#fff1ee] font-semibold text-[#8c1118]' : 'text-slate-700'}`}>
    {subject ? <SubjectIcon subject={subjIcon(subject)} className="w-6 h-6 shrink-0" /> : <i className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: color }} />}{children}
  </button>
);

const ReportTable: React.FC<{ report: Report; onEdit: () => void }> = ({ report, onEdit }) => {
  const [tSub, setTSub] = useState('All'); const [thSub, setThSub] = useState('All');
  const [showAvg, setShowAvg] = useState(true); const [showTests, setShowTests] = useState(true); const [showSubj, setShowSubj] = useState(true); const [showTotal, setShowTotal] = useState(true);
  const [only, setOnly] = useState<string | null>(null);
  const rows = useMemo(() => buildRows(report, only), [report, only]);
  const tCols = TEST_SUBJ.map((s, i) => ({ ...s, i })).filter((s) => tSub === 'All' || s.n === tSub);
  const thCols = report.theories > 0 ? THEORY_SUBJ.map((s, i) => ({ ...s, i })).filter((s) => thSub === 'All' || s.n === thSub) : [];
  const stat = (get: (r: Row) => number) => ({ hi: Math.max(...rows.map(get)), avg: Math.round(rows.reduce((a, r) => a + get(r), 0) / Math.max(1, rows.length)) });
  const secsInReport = report.sectionIds.map((id) => allSections().find((s) => s.id === id)!);

  const download = () => {
    const head = ['SlNo', 'Student', 'Roll No', 'Section', ...tCols.map((c) => c.n), 'Tests Total', ...thCols.map((c) => c.n), 'Theory Total'];
    const body = rows.map((r, i) => [i + 1, r.st.name, r.st.roll, r.sec.code, ...tCols.map((c) => r.tests[c.i]), r.tTotal, ...thCols.map((c) => r.theory[c.i]), r.thTotal]);
    const html = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>${body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'application/vnd.ms-excel' })); a.download = `${report.name.replace(/[^a-z0-9]+/gi, '-')}.xls`; a.click(); URL.revokeObjectURL(a.href);
  };

  const th = 'px-2 py-2 text-[11px] font-semibold text-[#4a0709] bg-[#f3e3c4] border-b border-[#e6cf9f] text-center';
  const sub = (v: string) => <span className="block text-[9px] font-normal text-slate-500">({v})</span>;
  const cell = 'px-2 py-2.5 text-center text-xs text-slate-700';
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-base font-bold font-heading text-slate-900">{report.name}</h2>
        <div className="flex gap-2">
          <Menu icon={<LayoutGrid className="w-4 h-4" />} title="Subjects">{(close) => (<>
            <MenuHead>Tests subjects</MenuHead>
            <MenuItem active={tSub === 'All'} onClick={() => { setTSub('All'); close(); }}>All</MenuItem>
            {TEST_SUBJ.map((s) => <MenuItem key={s.n} active={tSub === s.n} color={s.c} subject={s.n} onClick={() => { setTSub(s.n); close(); }}>{s.n}</MenuItem>)}
            {report.theories > 0 && (<><MenuHead>Theory subjects</MenuHead>
              <MenuItem active={thSub === 'All'} onClick={() => { setThSub('All'); close(); }}>All</MenuItem>
              {THEORY_SUBJ.map((s) => <MenuItem key={s.n} active={thSub === s.n} color={s.c} subject={s.n} onClick={() => { setThSub(s.n); close(); }}>{s.n}</MenuItem>)}</>)}
          </>)}</Menu>
          <Menu icon={<Filter className="w-4 h-4" />} title="Filters">{() => (<>
            <MenuHead>Filters</MenuHead>
            <MenuItem active={showAvg} color="#f59e0b" onClick={() => setShowAvg(!showAvg)}>Average</MenuItem>
            <MenuItem active={showTests} color="#3b82f6" onClick={() => setShowTests(!showTests)}>Tests wise</MenuItem>
            <MenuItem active={showSubj} color="#e0457b" onClick={() => setShowSubj(!showSubj)}>Test Subjects wise</MenuItem>
            <MenuItem active={showTotal} color="#22a559" onClick={() => setShowTotal(!showTotal)}>Total Marks (Sum) wise</MenuItem>
            <MenuHead>Other filters</MenuHead>
            <MenuItem active={!only} color="#6b7280" onClick={() => setOnly(null)}>All sections</MenuItem>
            {secsInReport.map((s) => <MenuItem key={s.id} active={only === s.id} color="#6b7280" onClick={() => setOnly(s.id)}>{s.title}</MenuItem>)}
          </>)}</Menu>
          <Menu icon={<Settings className="w-4 h-4" />} title="Settings">{(close) => (<>
            <MenuItem color="#3b82f6" onClick={() => { onEdit(); close(); }}><span className="inline-flex items-center gap-2"><Pencil className="w-3.5 h-3.5" />Edit</span></MenuItem>
            <MenuItem color="#22a559" onClick={() => { download(); close(); }}><span className="inline-flex items-center gap-2"><FileSpreadsheet className="w-3.5 h-3.5" />Download Excel</span></MenuItem>
          </>)}</Menu>
        </div>
      </div>
      <div className="rounded-2xl border border-[#ece4da] bg-white overflow-x-auto">
        <table className="min-w-[1000px] w-full border-collapse">
          <thead>
            <tr>
              <th rowSpan={2} className={th}>SlNo</th><th rowSpan={2} className={`${th} text-left min-w-[220px]`}>Student{sub(String(rows.length))}</th><th rowSpan={2} className={th}>Reservations</th>
              <th rowSpan={2} className={th}>Section{sub(String(secsInReport.length))}</th><th rowSpan={2} className={th}>Tests{sub(String(report.tests))}</th><th rowSpan={2} className={th}>Theories{sub(String(report.theories))}</th>
              {showTests && <th colSpan={(showSubj ? tCols.length : 0) + (showTotal ? 1 : 0)} className={`${th} !bg-[#ecd3a2]`}>Tests</th>}
              {showTests && thCols.length > 0 && <th colSpan={(showSubj ? thCols.length : 0) + (showTotal ? 1 : 0)} className={`${th} !bg-[#ecd3a2]`}>Theories</th>}
            </tr>
            <tr>
              {showTests && showSubj && tCols.map((c) => <th key={c.n} className={th}><span className="inline-flex flex-col items-center gap-0.5"><SubjectIcon subject={subjIcon(c.n)} className="w-5 h-5" />{c.n}</span>{sub('180')}</th>)}{showTests && showTotal && <th className={th}>Total{sub(String(tCols.length * 180))}</th>}
              {showTests && showSubj && thCols.map((c) => <th key={c.n} className={th}>{c.n}{sub('35')}</th>)}{showTests && showTotal && thCols.length > 0 && <th className={th}>Total{sub(String(thCols.length * 35))}</th>}
            </tr>
          </thead>
          <tbody>
            {showAvg && [['Highest', true], ['Average', false]].map(([label, hi]) => (
              <tr key={label as string} className="border-b border-[#f3ede6]">
                <td colSpan={6} className="px-3 py-1.5 text-right text-[10px] text-slate-400">{label as string}</td>
                {showTests && showSubj && tCols.map((c) => { const s = stat((r) => r.tests[c.i]); return <td key={c.n} className={`${cell} font-semibold`}>{hi ? s.hi : s.avg}</td>; })}
                {showTests && showTotal && <td className={`${cell} font-bold`}>{(() => { const s = stat((r) => tCols.reduce((a, c) => a + r.tests[c.i], 0)); return hi ? s.hi : s.avg; })()}</td>}
                {showTests && showSubj && thCols.map((c) => { const s = stat((r) => r.theory[c.i]); return <td key={c.n} className={`${cell} font-semibold`}>{hi ? s.hi : s.avg}</td>; })}
                {showTests && showTotal && thCols.length > 0 && <td className={`${cell} font-bold`}>{(() => { const s = stat((r) => thCols.reduce((a, c) => a + r.theory[c.i], 0)); return hi ? s.hi : s.avg; })()}</td>}
              </tr>))}
            {rows.map((r, i) => (
              <tr key={r.st.id} className={i % 2 ? 'bg-[#fffaf2]' : 'bg-white'}>
                <td className={cell}>{i + 1}</td>
                <td className="px-2 py-2"><span className="inline-flex items-center gap-2.5"><Avatar name={r.st.name} pid={r.st.id} size={34} /><span><b className="block text-xs text-slate-800 font-semibold">{r.st.name}</b><span className="text-[10px] text-slate-500">Roll No: {r.st.roll}</span></span></span></td>
                <td className={cell}></td><td className={cell}>{r.sec.code}</td><td className={cell}>{report.tests}</td><td className={cell}>{report.theories}</td>
                {showTests && showSubj && tCols.map((c) => <td key={c.n} className={cell}>{r.tests[c.i]}</td>)}
                {showTests && showTotal && <td className={`${cell} font-bold`}>{tCols.reduce((a, c) => a + r.tests[c.i], 0)}</td>}
                {showTests && showSubj && thCols.map((c) => <td key={c.n} className={cell}>{r.theory[c.i]}</td>)}
                {showTests && showTotal && thCols.length > 0 && <td className={`${cell} font-bold`}>{thCols.reduce((a, c) => a + r.theory[c.i], 0)}</td>}
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
