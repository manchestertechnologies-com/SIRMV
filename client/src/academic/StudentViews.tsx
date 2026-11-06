import React, { useMemo, useState } from 'react';
import { Download, FileText, Phone } from 'lucide-react';
import {
  Student, SubjectName, TestResult, chapterReport, leaderboard, ordinal, pct, sectionById, sectionResults, studentTests, getStudents, staffById,
} from './sampleData';
import { Avatar, Bar, BarChart, Card, Chip, Donut, GREEN, GREY, AMBER, RED, Legend, LineChart, Pill, StatCard, Stacked, TabBar } from './ui';

// ---------- student grid (photo + roll number) ----------
export const StudentGrid: React.FC<{ sectionId: string; onOpen: (id: string) => void }> = ({ sectionId, onOpen }) => {
  const [tab, setTab] = useState<'All' | 'Deactivated Students'>('All');
  const [q, setQ] = useState('');
  const all = getStudents(sectionId);
  const list = all.filter((s) => (tab === 'All' ? s.active : !s.active)).filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.roll.includes(q));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Chip active={tab === 'All'} onClick={() => setTab('All')}>All ({all.filter((s) => s.active).length})</Chip>
          <Chip active={tab !== 'All'} onClick={() => setTab('Deactivated Students')}>Deactivated Students ({all.filter((s) => !s.active).length})</Chip>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or roll number" className="w-full sm:w-64 px-3.5 py-2 text-sm rounded-xl border border-[#ded9cf] bg-white outline-none focus:border-[#c7222a]" />
      </div>
      {list.length === 0 ? (
        <Card><p className="text-center text-sm text-slate-500 py-8">No students match.</p></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {list.map((s) => (
            <button key={s.id} onClick={() => onOpen(s.id)} className="mt-tile-card text-left rounded-2xl border border-[#ece4da] bg-white p-3 flex items-center gap-3 hover:border-[#d9a85a] transition">
              <span className="w-7 text-xs font-semibold text-slate-400 text-right shrink-0">{s.no}.</span>
              <Avatar name={s.name} size={52} square />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900 truncate">{s.name}</span>
                <span className="block text-xs text-slate-500">Roll Number: {s.roll}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------- profile ----------
type AView = { kind: 'overview' } | { kind: 'subject'; subject: SubjectName } | { kind: 'test'; testId: string };

export const StudentProfile: React.FC<{ student: Student }> = ({ student }) => {
  const sec = sectionById(student.sectionId)!;
  const [tab, setTab] = useState('Test Analysis');
  const [view, setView] = useState<AView>({ kind: 'overview' });
  const warden = student.warden;
  return (
    <div className="space-y-5">
      {/* header card */}
      <div className="rounded-3xl bg-[#8f1218] text-white p-5 sm:p-6 flex flex-col sm:flex-row gap-5">
        <Avatar name={student.name} size={92} square />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold font-heading">{student.name}</h2>
          <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-[13px] text-white/85">
            <div><dt className="inline text-white/60">Section: </dt><dd className="inline font-medium">{sec.title}</dd></div>
            <div><dt className="inline text-white/60">Roll No: </dt><dd className="inline font-medium">{student.roll}</dd></div>
            <div><dt className="inline text-white/60">SSLC: </dt><dd className="inline font-medium">{student.sslc}</dd></div>
            <div><dt className="inline text-white/60">Father Occupation: </dt><dd className="inline font-medium">{student.fatherOccupation}</dd></div>
            <div className="sm:col-span-2">
              <dt className="inline text-white/60">Hostel: </dt>
              <dd className="inline font-medium">{student.hostel ? `${student.hostel.block} (${student.hostel.floor} → ${student.hostel.room} → ${student.hostel.bed})` : 'Day Scholar'}</dd>
            </div>
            {warden && (
              <div className="sm:col-span-2">
                <dt className="inline text-white/60">Hostel Warden: </dt>
                <dd className="inline font-medium">{warden.name} - {warden.phone}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <TabBar items={['Test Analysis', 'Documents', 'Personal Details']} value={tab} onChange={(t) => { setTab(t); setView({ kind: 'overview' }); }} />

      {tab === 'Test Analysis' && (
        view.kind === 'overview' ? <Overview student={student} onSubject={(s) => setView({ kind: 'subject', subject: s })} onTest={(t) => setView({ kind: 'test', testId: t })} />
        : view.kind === 'subject' ? <SubjectAnalysis student={student} subject={view.subject} onBack={() => setView({ kind: 'overview' })} onTest={(t) => setView({ kind: 'test', testId: t })} />
        : <TestAnalysis student={student} testId={view.testId} onBack={() => setView({ kind: 'overview' })} />
      )}
      {tab === 'Documents' && <Documents student={student} />}
      {tab === 'Personal Details' && (
        <Card title="Personal details">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2.5 text-sm">
            {([['Full name', student.name], ['Gender', student.gender], ['Date of birth', student.dob], ['Blood group', student.blood], ["Father's name", student.fatherName], ['Father occupation', student.fatherOccupation], ['Parent mobile', student.phone], ['SSLC board', student.sslc], ['Class teacher', staffById(sec.classTeacherId)?.name || '-'], ['Batch', sec.batch]] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-[#f3ede6] py-1.5"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900 text-right">{v}</dd></div>
            ))}
          </dl>
          {warden && <p className="text-xs text-slate-500 mt-4 inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Warden {warden.name}: {warden.phone}</p>}
        </Card>
      )}
    </div>
  );
};

// ---------- documents ----------
const Documents: React.FC<{ student: Student }> = ({ student }) => (
  <Card title="Documents" right={<Pill tone="gold">{student.docs.filter((d) => d.status === 'Verified').length}/{student.docs.length} verified</Pill>}>
    <ul className="divide-y divide-[#f3ede6]">
      {student.docs.map((d) => (
        <li key={d.name} className="flex items-center gap-3 py-3">
          <span className="w-10 h-10 rounded-xl bg-[#fff1ee] text-[#a3161b] inline-flex items-center justify-center shrink-0"><FileText className="w-5 h-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 truncate">{d.name}</p>
            <p className="text-[11px] text-slate-500">{d.status === 'Missing' ? 'Not uploaded yet' : `${d.size} · updated ${d.updated}`}</p>
          </div>
          <Pill tone={d.status === 'Verified' ? 'green' : d.status === 'Pending' ? 'amber' : 'red'}>{d.status}</Pill>
          <button disabled={d.status === 'Missing'} className="p-2 rounded-lg border border-[#ded9cf] text-slate-600 hover:text-[#a3161b] disabled:opacity-40" title="Download"><Download className="w-4 h-4" /></button>
        </li>
      ))}
    </ul>
    <p className="text-[11px] text-slate-400 mt-3">Sample documents. Uploaded files will be saved with the student record.</p>
  </Card>
);

// ---------- overview analysis ----------
const Overview: React.FC<{ student: Student; onSubject: (s: SubjectName) => void; onTest: (id: string) => void }> = ({ student, onSubject, onTest }) => {
  const sec = sectionById(student.sectionId)!;
  const tests = studentTests(student);
  const board = leaderboard(student.sectionId);
  const me = board.find((b) => b.st.id === student.id)!;
  const [filter, setFilter] = useState<'All' | SubjectName>('All');
  const subs = filter === 'All' ? sec.subjects : [filter];

  const totals = useMemo(() => {
    let c = 0, w = 0, s = 0, mins = 0, marks = 0, max = 0;
    tests.forEach((t) => t.subjects.filter((x) => subs.includes(x.subject)).forEach((x) => { c += x.correct; w += x.wrong; s += x.skipped; mins += x.mins; marks += x.marks; max += x.max; }));
    return { c, w, s, mins, percent: Math.max(0, pct(marks, max)) };
  }, [tests, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const last10 = tests.slice(-10);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Chip active={filter === 'All'} onClick={() => setFilter('All')}>All</Chip>
        {sec.subjects.map((s) => <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>{s}</Chip>)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard label="Class rank" value={me.rank} suffix={`of ${board.length}`} />
        <StatCard label="Total tests" value={tests.length} tone="slate" />
        <StatCard label="Total absents" value={me.absents} tone="gold" />
        <StatCard label="Total percentage" value={totals.percent} suffix="% overall" tone="green" />
        <StatCard label="Questions attempted" value={totals.c + totals.w} suffix={`${totals.s} left blank`} tone="slate" />
        <StatCard label="Time spent" value={Math.round(totals.mins / 60)} suffix="hours on tests" tone="gold" />
      </div>

      <Card title="Subjects report" right={<Legend items={[{ label: 'Correct', color: GREEN }, { label: 'Wrong', color: RED }, { label: 'Unattempted', color: AMBER }]} />}>
        <div className="space-y-3">
          {subs.map((sub) => {
            let c = 0, w = 0, s = 0;
            tests.forEach((t) => t.subjects.filter((x) => x.subject === sub).forEach((x) => { c += x.correct; w += x.wrong; s += x.skipped; }));
            return (
              <button key={sub} onClick={() => onSubject(sub)} className="w-full text-left group">
                <div className="flex justify-between text-xs mb-1"><span className="font-semibold text-slate-800 group-hover:text-[#a3161b]">{sub}</span><span className="text-slate-500">{pct(c, c + w + s)}% correct · view analysis</span></div>
                <Stacked parts={[{ v: c, color: GREEN }, { v: w, color: RED }, { v: s, color: AMBER }]} />
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Last 10 tests" right={<span className="text-[11px] text-slate-400">tap a bar for test analysis</span>}>
          <BarChart max={100} data={last10.map((t) => ({
            label: t.name.replace(/(Unit|Weekly|Part|Grand) Test /, '$1 ').replace('Weekly', 'W').replace('Unit', 'U').replace('Part', 'P').replace('Grand', 'G'),
            title: `${t.name}: ${t.percent}%`, onClick: () => onTest(t.id),
            parts: [{ v: t.percent, color: t.percent >= 70 ? GREEN : t.percent >= 45 ? AMBER : RED }],
          }))} showValues />
          <div className="mt-3"><Legend items={[{ label: '70%+', color: GREEN }, { label: '45-69%', color: AMBER }, { label: 'Below 45%', color: RED }]} /></div>
        </Card>
        <Card title="Statistics">
          <Donut size={160} centre={`${totals.percent}%`} centreSub="score" parts={[
            { label: 'Correct', v: totals.c, color: GREEN }, { label: 'Wrong', v: totals.w, color: RED }, { label: 'Unattempted', v: totals.s, color: AMBER },
          ]} />
        </Card>
      </div>

      <Card title="Chapters report">
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
          {subs.flatMap((sub) => chapterReport(student, sub).map((c) => ({ ...c, sub }))).sort((a, b) => a.accuracy - b.accuracy).slice(0, 12).map((c) => (
            <div key={c.sub + c.chapter}>
              <div className="flex justify-between text-xs mb-1"><span className="text-slate-700">{c.chapter} <span className="text-slate-400">· {c.sub}</span></span><b className="text-slate-900">{c.accuracy}%</b></div>
              <Bar value={c.accuracy} color={c.accuracy >= 70 ? GREEN : c.accuracy >= 45 ? AMBER : RED} />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-3">Showing the weakest chapters first.</p>
      </Card>
    </div>
  );
};

// ---------- subject level ----------
const SubjectAnalysis: React.FC<{ student: Student; subject: SubjectName; onBack: () => void; onTest: (id: string) => void }> = ({ student, subject, onBack, onTest }) => {
  const tests = studentTests(student);
  const rows = tests.map((t) => ({ t, s: t.subjects.find((x) => x.subject === subject)! }));
  const chapters = chapterReport(student, subject);
  const sum = rows.reduce((a, r) => ({ c: a.c + r.s.correct, w: a.w + r.s.wrong, k: a.k + r.s.skipped, m: a.m + r.s.marks, x: a.x + r.s.max, mins: a.mins + r.s.mins }), { c: 0, w: 0, k: 0, m: 0, x: 0, mins: 0 });
  const strong = [...chapters].sort((a, b) => b.accuracy - a.accuracy).slice(0, 3);
  const weak = [...chapters].sort((a, b) => a.accuracy - b.accuracy).slice(0, 3);
  // subject rank within section
  const rank = useMemo(() => {
    const res = sectionResults(student.sectionId);
    const totals = getStudents(student.sectionId).map((st) => ({ id: st.id, m: res.get(st.id)!.reduce((a, t) => a + t.subjects.find((x) => x.subject === subject)!.marks, 0) })).sort((a, b) => b.m - a.m);
    return totals.findIndex((x) => x.id === student.id) + 1;
  }, [student, subject]);
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-xs font-semibold text-[#a3161b] hover:underline">← Back to overall analysis</button>
      <h3 className="text-base font-bold font-heading text-slate-900">{subject} analysis</h3>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Subject rank" value={rank} suffix="in section" />
        <StatCard label="Average score" value={Math.max(0, pct(sum.m, sum.x))} suffix="% across tests" tone="green" />
        <StatCard label="Correct" value={sum.c} tone="green" />
        <StatCard label="Wrong" value={sum.w} tone="slate" />
        <StatCard label="Time spent" value={Math.round(sum.mins / 60)} suffix="hours" tone="gold" />
      </div>
      <Card title={`${subject} score by test`}>
        <LineChart points={rows.map((r) => ({ label: r.t.name[0] + r.t.name.split(' ').pop(), v: Math.max(0, pct(r.s.marks, r.s.max)) }))} />
      </Card>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Chapter accuracy">
          <div className="space-y-3">
            {chapters.map((c) => (
              <div key={c.chapter}>
                <div className="flex justify-between text-xs mb-1"><span className="text-slate-700">{c.chapter}</span><span className="text-slate-500">{c.correct}/{c.total} · <b className="text-slate-900">{c.accuracy}%</b></span></div>
                <Bar value={c.accuracy} color={c.accuracy >= 70 ? GREEN : c.accuracy >= 45 ? AMBER : RED} />
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-5">
          <Card title="Strong chapters">{strong.map((c) => <p key={c.chapter} className="flex justify-between text-sm py-1"><span>{c.chapter}</span><Pill tone="green">{c.accuracy}%</Pill></p>)}</Card>
          <Card title="Needs practice">{weak.map((c) => <p key={c.chapter} className="flex justify-between text-sm py-1"><span>{c.chapter}</span><Pill tone="red">{c.accuracy}%</Pill></p>)}</Card>
        </div>
      </div>
      <Card title={`${subject} in each test`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-500 border-b border-[#f0ebe4]"><th className="py-2 pr-3">Test</th><th className="pr-3">Date</th><th className="pr-3">Correct</th><th className="pr-3">Wrong</th><th className="pr-3">Blank</th><th>Marks</th></tr></thead>
            <tbody>
              {rows.map(({ t, s }) => (
                <tr key={t.id} onClick={() => onTest(t.id)} className="border-b border-[#f7f2ec] hover:bg-[#fff6f4] cursor-pointer">
                  <td className="py-2 pr-3 font-semibold text-slate-800">{t.name}</td><td className="pr-3 text-slate-500">{t.date}</td>
                  <td className="pr-3 text-emerald-700">{s.correct}</td><td className="pr-3 text-red-600">{s.wrong}</td><td className="pr-3 text-amber-600">{s.skipped}</td><td className="font-semibold">{s.marks}/{s.max}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ---------- test level (NEET-prep style) ----------
const TestAnalysis: React.FC<{ student: Student; testId: string; onBack: () => void }> = ({ student, testId, onBack }) => {
  const test = studentTests(student).find((t) => t.id === testId) as TestResult;
  const [pickQ, setPickQ] = useState<number | null>(null);
  const [subj, setSubj] = useState<'All' | SubjectName>('All');
  const res = sectionResults(student.sectionId);
  const idx = studentTests(student).findIndex((t) => t.id === testId);
  const classAvg = Math.round(Array.from(res.values()).reduce((a, v) => a + v[idx].percent, 0) / res.size);
  const topper = Math.max(...Array.from(res.values()).map((v) => v[idx].percent));
  const qs = test.questions.filter((q) => subj === 'All' || q.subject === subj);
  const q = pickQ != null ? test.questions[pickQ] : null;
  const topicRows = useMemo(() => {
    const m = new Map<string, { c: number; t: number; sub: string }>();
    test.questions.forEach((x) => { const k = x.subject + '|' + x.chapter; const v = m.get(k) || { c: 0, t: 0, sub: x.subject }; v.t++; if (x.status === 'correct') v.c++; m.set(k, v); });
    return Array.from(m.entries()).map(([k, v]) => ({ chapter: k.split('|')[1], ...v })).sort((a, b) => a.c / a.t - b.c / b.t);
  }, [test]);
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-xs font-semibold text-[#a3161b] hover:underline">← Back to overall analysis</button>
      <div className="flex flex-wrap items-baseline gap-3"><h3 className="text-base font-bold font-heading text-slate-900">{test.name}</h3><span className="text-xs text-slate-500">{test.date} · {test.kind} test</span></div>

      <div className="rounded-3xl bg-white border border-[#ece4da] p-5 grid sm:grid-cols-[auto_1fr] gap-6 items-center">
        <div className="text-center sm:text-left">
          <p className="text-xs text-slate-500">Your score</p>
          <p className="text-4xl font-semibold font-heading text-[#a3161b]">{test.marks}<span className="text-lg text-slate-400">/{test.max}</span></p>
          <p className="text-xs text-slate-500 mt-1">{test.percent}% · +4 correct, -1 wrong</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Rank" value={test.rank} suffix={`of ${test.classSize}`} />
          <StatCard label="Percentile" value={test.percentile} tone="green" />
          <StatCard label="Accuracy" value={test.accuracy} suffix="% of attempted" tone="gold" />
          <StatCard label="Time taken" value={test.mins} suffix="minutes" tone="slate" />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="You vs class">
          {[['You', test.percent, '#a3161b'], ['Class average', classAvg, '#c28535'], ['Topper', topper, GREEN]].map(([l, v, c]) => (
            <div key={l as string} className="mb-3"><div className="flex justify-between text-xs mb-1"><span className="text-slate-700">{l}</span><b>{v}%</b></div><Bar value={v as number} color={c as string} h="h-2.5" /></div>
          ))}
        </Card>
        <Card title="Question summary">
          <Donut size={140} centre={`${test.correct}`} centreSub="correct" parts={[{ label: 'Correct', v: test.correct, color: GREEN }, { label: 'Wrong', v: test.wrong, color: RED }, { label: 'Unattempted', v: test.skipped, color: GREY }]} />
        </Card>
      </div>

      <Card title="Subject-wise performance">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-500 border-b border-[#f0ebe4]"><th className="py-2 pr-3">Subject</th><th className="pr-3">Marks</th><th className="pr-3">Correct</th><th className="pr-3">Wrong</th><th className="pr-3">Blank</th><th className="pr-3">Accuracy</th><th>Time</th></tr></thead>
            <tbody>
              {test.subjects.map((s) => (
                <tr key={s.subject} className="border-b border-[#f7f2ec]">
                  <td className="py-2 pr-3 font-semibold text-slate-800">{s.subject}</td><td className="pr-3 font-semibold">{s.marks}/{s.max}</td>
                  <td className="pr-3 text-emerald-700">{s.correct}</td><td className="pr-3 text-red-600">{s.wrong}</td><td className="pr-3 text-amber-600">{s.skipped}</td>
                  <td className="pr-3">{pct(s.correct, s.correct + s.wrong)}%</td><td>{s.mins} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Question palette" right={<div className="flex gap-1.5 flex-wrap"><Chip active={subj === 'All'} onClick={() => setSubj('All')}>All</Chip>{test.subjects.map((s) => <Chip key={s.subject} active={subj === s.subject} onClick={() => setSubj(s.subject)}>{s.subject}</Chip>)}</div>}>
        <div className="flex flex-wrap gap-1.5">
          {qs.map((x) => {
            const i = test.questions.indexOf(x);
            const bg = x.status === 'correct' ? 'bg-emerald-500' : x.status === 'wrong' ? 'bg-red-500' : 'bg-slate-300';
            return <button key={i} onClick={() => setPickQ(i)} className={`w-8 h-8 rounded-lg text-[11px] font-bold text-white ${bg} ${pickQ === i ? 'ring-2 ring-offset-2 ring-[#a3161b]' : ''}`}>{i + 1}</button>;
          })}
        </div>
        <div className="mt-3"><Legend items={[{ label: 'Correct', color: GREEN }, { label: 'Wrong', color: RED }, { label: 'Unattempted', color: GREY }]} /></div>
        {q && (
          <div className="mt-4 rounded-2xl bg-[#fff8f4] border border-[#f0dcd0] p-4 text-sm grid sm:grid-cols-4 gap-3">
            <div><p className="text-[11px] text-slate-500">Question {q.n === 0 ? '' : pickQ! + 1}</p><p className="font-semibold">{q.subject}</p><p className="text-xs text-slate-500">{q.chapter}</p></div>
            <div><p className="text-[11px] text-slate-500">Your answer</p><p className="font-semibold">{q.marked}</p></div>
            <div><p className="text-[11px] text-slate-500">Correct answer</p><p className="font-semibold text-emerald-700">{q.key}</p></div>
            <div><p className="text-[11px] text-slate-500">Time spent</p><p className="font-semibold">{q.secs} sec</p></div>
          </div>
        )}
      </Card>

      <Card title="Topic strengths">
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
          {topicRows.map((r) => (
            <div key={r.sub + r.chapter}>
              <div className="flex justify-between text-xs mb-1"><span className="text-slate-700">{r.chapter} <span className="text-slate-400">· {r.sub}</span></span><b>{r.c}/{r.t}</b></div>
              <Bar value={(r.c / r.t) * 100} color={r.c / r.t >= 0.7 ? GREEN : r.c / r.t >= 0.45 ? AMBER : RED} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
