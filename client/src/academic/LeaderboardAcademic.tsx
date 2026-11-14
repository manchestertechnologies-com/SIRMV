import React, { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { allSections, getStandards, getStudents, sectionResults } from './sampleData';
import { Avatar, Card, Chip, PageHead } from './ui';
import { usePS } from './persist';

// College-wide leaderboard built from the same test results every other screen uses.
const STREAMS = ['PCMB', 'PCMC'];

export const LeaderboardAcademic: React.FC<{ onExit: () => void; only?: string[] }> = ({ onExit, only }) => {
  const [std, setStd] = usePS<string>('leaderboard', 'std', 'All');
  const [stream, setStream] = usePS<string>('leaderboard', 'stream', 'PCMB');
  const standards = getStandards();

  const rows = useMemo(() => {
    const secs = allSections().filter((s) => (!only || only.includes(s.id)) && s.stream === stream && (std === 'All' || s.std === std));
    const list = secs.flatMap((sec) => {
      const res = sectionResults(sec.id);
      return getStudents(sec.id).filter((s) => s.active).map((st) => {
        const t = res.get(st.id) || [];
        const n = t.length || 1;
        const marks = t.reduce((a, x) => a + x.marks, 0);
        const max = t.reduce((a, x) => a + x.max, 0) || 1;
        const qs = t.reduce((a, x) => a + x.correct + x.wrong + x.skipped, 0);
        const mins = t.reduce((a, x) => a + x.mins, 0) || 1;
        return {
          st, sec, marks, tests: t.length,
          percent: (marks / max) * 100,
          accuracy: t.reduce((a, x) => a + x.accuracy, 0) / n,
          percentile: t.reduce((a, x) => a + x.percentile, 0) / n,
          speed: Math.round((qs / mins) * 60),
        };
      });
    });
    return list.sort((a, b) => b.percent - a.percent);
  }, [std, stream, only]);

  const f = (v: number, d = 2) => v.toFixed(d);
  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHead title="Leaderboard" sub={`SIR MV PU College · ${rows.length} students · all tests so far`} onBack={onExit} right={<Trophy className="w-6 h-6 text-[#c28535]" />} />
      <div className="flex flex-wrap items-center gap-2">
        {['All', ...standards.map((s) => s.id)].map((id) => <Chip key={id} active={std === id} onClick={() => setStd(id)}>{id === 'All' ? 'All classes' : standards.find((s) => s.id === id)!.label}</Chip>)}
        <select value={stream} onChange={(e) => setStream(e.target.value)} className="ml-auto bg-[#a3161b] text-white text-xs font-bold rounded-lg px-3 py-2 outline-none" aria-label="Stream">
          {STREAMS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-center">
            <thead>
              <tr className="bg-[#f3e4e0] text-[#5a1d1d] text-xs font-bold">
                {['Rank', 'Student', 'Roll', 'Marks', 'Tests', 'Percentage', 'Accuracy', 'Percentile', 'Speed'].map((h, i) => <th key={h} className={`py-3 px-3 ${i === 1 ? 'text-left' : ''}`}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.st.id} className={`border-t border-[#f0ebe4] ${i % 2 ? 'bg-[#fcf6f3]' : 'bg-white'}`}>
                  <td className="py-2.5 px-3 font-semibold text-slate-700">{i + 1}</td>
                  <td className="px-3 text-left"><span className="inline-flex items-center gap-2.5"><Avatar name={r.st.name} pid={r.st.id} size={34} /><span><b className="block text-[13px] text-slate-900">{r.st.name}</b><span className="text-[10px] text-slate-500">{r.sec.title}</span></span></span></td>
                  <td className="px-3 text-slate-600">{r.st.roll}</td>
                  <td className="px-3">{Math.round(r.marks)}</td>
                  <td className="px-3">{r.tests}</td>
                  <td className="px-3 font-semibold">{f(r.percent)}%</td>
                  <td className="px-3">{f(r.accuracy)}%</td>
                  <td className="px-3">{f(r.percentile, 1)}%</td>
                  <td className="px-3 whitespace-nowrap">{r.speed} Q/H</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9} className="py-10 text-slate-400">No students in this selection.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
