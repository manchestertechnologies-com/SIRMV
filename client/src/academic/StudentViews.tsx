import React, { useMemo, useState } from 'react';
import { Award, ClipboardCheck, Crosshair, Download, FileText, Pencil, Phone, XCircle } from 'lucide-react';
import {
  Student, SubjectName, TestResult, QResult, chapterReport, chapterRanks, chapterTests, leaderboard, ordinal, pct, sectionById, sectionResults, studentTests, getStudents, staffById,
} from './sampleData';
import { Avatar, ChapterIcon, SubjectIcon, EditableCard, PhotoBox, Bar, BarChart, Card, Chip, Donut, GREEN, GREY, AMBER, RED, Legend, LineChart, Pill, StatCard, Stacked, TabBar } from './ui';

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
          <Chip active={tab === 'All'} onClick={() => setTab('All')}>All ({all.length - all.filter((s) => !s.active).length})</Chip>
          <Chip active={tab !== 'All'} onClick={() => setTab('Deactivated Students')}>Deactivated Students ({all.filter((s) => !s.active).length})</Chip>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or roll number" className="w-full sm:w-64 px-3.5 py-2 text-sm rounded-xl border border-[#ded9cf] bg-white outline-none focus:border-[#c7222a]" />
      </div>
      {list.length === 0 ? (
        <Card><p className="text-center text-sm text-slate-500 py-8">No students match.</p></Card>
      ) : tab !== 'All' ? (
        <div className="space-y-3">
          {list.map((s) => (
            <button key={s.id} onClick={() => onOpen(s.id)} className="mt-tile-card w-full text-left rounded-2xl border border-[#ece4da] bg-white p-3.5 flex items-start gap-3 hover:border-[#d9a85a] transition">
              <Avatar name={s.name} pid={s.id} size={46} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">{s.no}. {s.name}</span>
                <span className="block text-xs text-slate-500">Roll Number: {s.roll}</span>
                <span className="block text-xs text-slate-600 mt-1"><span className="inline-flex items-center gap-1 text-[#a3161b]"><Pencil className="w-3 h-3" /></span> Reason: {s.deact?.reason}</span>
                <span className="mt-1 flex flex-wrap gap-x-5 gap-y-0.5 text-[11px] text-slate-500">
                  <span><b className="text-slate-600">Deactivated Staff:</b> {s.deact?.staff}</span>
                  <span><b className="text-slate-600">Date:</b> {s.deact?.date}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {list.map((s) => (
            <button key={s.id} onClick={() => onOpen(s.id)} className="mt-tile-card text-left rounded-2xl border border-[#ece4da] bg-white p-3 flex items-center gap-3 hover:border-[#d9a85a] transition">
              <span className="w-7 text-xs font-semibold text-slate-400 text-right shrink-0">{s.no}.</span>
              <Avatar name={s.name} pid={s.id} size={52} square />
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
type AView = { kind: 'overview' } | { kind: 'subject'; subject: SubjectName } | { kind: 'test'; testId: string } | { kind: 'chapter'; subject: SubjectName; chapter: string };

export const StudentProfile: React.FC<{ student: Student }> = ({ student }) => {
  const sec = sectionById(student.sectionId)!;
  const [tab, setTab] = useState('Test Analysis');
  const [view, setView] = useState<AView>({ kind: 'overview' });
  const [hist, setHist] = useState<AView[]>([]);
  const go = (n: AView) => { setHist((h) => [...h, view]); setView(n); };
  const back = () => { const h = [...hist]; const p = h.pop() || { kind: 'overview' as const }; setHist(h); setView(p); };
  const warden = student.warden;
  return (
    <div className="space-y-5">
      {/* header card */}
      <div className="rounded-3xl bg-[#8f1218] text-white p-5 sm:p-6 flex flex-col sm:flex-row gap-5">
        <PhotoBox pid={student.id} name={student.name} size={96} />
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

      <TabBar items={['Test Analysis', 'Documents', 'Personal Details']} value={tab} onChange={(t) => { setTab(t); setView({ kind: 'overview' }); setHist([]); }} />

      {tab === 'Test Analysis' && (
        view.kind === 'overview' ? <Overview student={student} onSubject={(s) => go({ kind: 'subject', subject: s })} onTest={(t) => go({ kind: 'test', testId: t })} onChapter={(s, c) => go({ kind: 'chapter', subject: s, chapter: c })} />
        : view.kind === 'subject' ? <SubjectAnalysis student={student} subject={view.subject} onBack={back} onTest={(t) => go({ kind: 'test', testId: t })} onChapter={(c) => go({ kind: 'chapter', subject: view.subject, chapter: c })} />
        : view.kind === 'chapter' ? <ChapterAnalysis student={student} subject={view.subject} chapter={view.chapter} onBack={back} onTest={(t) => go({ kind: 'test', testId: t })} />
        : <TestAnalysis student={student} testId={view.testId} onBack={back} />
      )}
      {tab === 'Documents' && <Documents student={student} />}
      {tab === 'Personal Details' && (
        <EditableCard id={student.id} title="Personal details" fields={([['name', 'Full name', student.name], ['gender', 'Gender', student.gender], ['dob', 'Date of birth', student.dob], ['blood', 'Blood group', student.blood], ['father', "Father's name", student.fatherName], ['occ', 'Father occupation', student.fatherOccupation], ['phone', 'Parent mobile', student.phone], ['sslc', 'SSLC board', student.sslc], ['ct', 'Class teacher', staffById(sec.classTeacherId)?.name || '-'], ['batch', 'Batch', sec.batch]] as [string, string, string][]).map(([key, label, value]) => ({ key, label, value, locked: key === 'ct' || key === 'batch' }))} />
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
const Overview: React.FC<{ student: Student; onSubject: (s: SubjectName) => void; onTest: (id: string) => void; onChapter: (s: SubjectName, c: string) => void }> = ({ student, onSubject, onTest, onChapter }) => {
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
        {sec.subjects.map((s) => <Chip key={s} active={filter === s} onClick={() => setFilter(s)}><span className="inline-flex items-center gap-1.5"><SubjectIcon subject={s} className="w-5 h-5" />{s}</span></Chip>)}
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
                <div className="flex justify-between text-xs mb-1"><span className="inline-flex items-center gap-2 font-semibold text-slate-800 group-hover:text-[#a3161b]"><SubjectIcon subject={sub} className="w-7 h-7" />{sub}</span><span className="text-slate-500">{pct(c, c + w + s)}% correct · view analysis</span></div>
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
            <button key={c.sub + c.chapter} onClick={() => onChapter(c.sub, c.chapter)} className="text-left group">
              <div className="flex justify-between items-center text-xs mb-1"><span className="inline-flex items-center gap-2 text-slate-700 group-hover:text-[#a3161b]"><ChapterIcon chapter={c.chapter} className="w-5 h-5" />{c.chapter} <span className="text-slate-400">· {c.sub}</span></span><b className="text-slate-900">{c.accuracy}%</b></div>
              <Bar value={c.accuracy} color={c.accuracy >= 70 ? GREEN : c.accuracy >= 45 ? AMBER : RED} />
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-3">Showing the weakest chapters first.</p>
      </Card>
    </div>
  );
};

// ---------- subject level ----------
const SubjectAnalysis: React.FC<{ student: Student; subject: SubjectName; onBack: () => void; onTest: (id: string) => void; onChapter: (c: string) => void }> = ({ student, subject, onBack, onTest, onChapter }) => {
  const tests = studentTests(student);
  const rows = tests.map((t) => ({ t, s: t.subjects.find((x) => x.subject === subject)! }));
  const chapters = chapterReport(student, subject);
  const ranks = useMemo(() => chapterRanks(student, subject), [student, subject]);
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
      <button onClick={onBack} className="block text-xs font-semibold text-[#a3161b] hover:underline">← Back</button>
      <h3 className="text-base font-bold font-heading text-slate-900 inline-flex items-center gap-3"><SubjectIcon subject={subject} className="w-10 h-10" />{subject} analysis</h3>
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
        <Card className="lg:col-span-2 !p-0 overflow-hidden">
          <h3 className="text-sm font-bold text-slate-900 font-heading px-4 sm:px-5 pt-4 pb-2">Chapters Report</h3>
          <ul className="divide-y divide-[#f3ede6]">
            {chapters.map((c, i) => (
              <li key={c.chapter}>
                <button onClick={() => onChapter(c.chapter)} className="w-full text-left flex items-start gap-3 px-4 sm:px-5 py-3.5 hover:bg-[#fff8f4] transition">
                  <ChapterIcon chapter={c.chapter} className="w-9 h-9 mt-0.5" />
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-3 text-sm"><span className="font-semibold text-slate-800 truncate">{i + 1}. {c.chapter}</span><b className="text-emerald-600 shrink-0">{c.percent}%</b></span>
                    <span className="block mt-1.5"><Bar value={c.percent} color={c.percent >= 70 ? GREEN : c.percent >= 45 ? AMBER : RED} h="h-2" /></span>
                    <span className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1"><Award className="w-3.5 h-3.5 text-amber-500" /><b className="text-slate-700">{ranks[c.chapter]}</b> Chapter rank</span>
                      <span className="inline-flex items-center gap-1"><ClipboardCheck className="w-3.5 h-3.5 text-blue-600" />{c.tests} tests</span>
                      <span className="inline-flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-red-500" />{(c.chapter.length + student.no) % 7 === 0 ? 1 : 0} absents</span>
                      <span className="inline-flex items-center gap-1"><Crosshair className="w-3.5 h-3.5 text-rose-500" />{c.accuracy}% accuracy</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
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

// ---------- chapter level: every test this chapter appeared in, question by question ----------
const ChapterAnalysis: React.FC<{ student: Student; subject: SubjectName; chapter: string; onBack: () => void; onTest: (id: string) => void }> = ({ student, subject, chapter, onBack, onTest }) => {
  const rows = useMemo(() => chapterTests(student, subject, chapter), [student, subject, chapter]);
  const row = chapterReport(student, subject).find((c) => c.chapter === chapter)!;
  const rank = chapterRanks(student, subject)[chapter];
  const mins = Math.round(rows.reduce((a, r) => a + r.secs, 0) / 60);
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="block text-xs font-semibold text-[#a3161b] hover:underline">← Back</button>
      <h3 className="text-base font-bold font-heading text-slate-900 inline-flex items-center gap-3"><ChapterIcon chapter={chapter} className="w-9 h-9" />{chapter}<span className="text-xs font-medium text-slate-400">· {subject}</span></h3>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Chapter score" value={row.percent} suffix="%" tone="green" />
        <StatCard label="Chapter rank" value={rank} suffix="in section" />
        <StatCard label="Tests attended" value={rows.length} tone="slate" />
        <StatCard label="Accuracy" value={row.accuracy} suffix="% of attempted" tone="gold" />
        <StatCard label="Time on chapter" value={mins} suffix="minutes" tone="slate" />
      </div>
      {rows.map(({ test, questions, correct, wrong, skipped, marks, max, secs }) => (
        <Card key={test.id} title={`${test.name} · ${test.date}`} right={<button onClick={() => onTest(test.id)} className="px-3 py-1.5 rounded-xl bg-[#a3161b] text-white text-xs font-semibold">View full test report</button>}>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600 mb-3">
            <span>Chapter marks <b className="text-slate-900">{marks}/{max}</b></span>
            <span className="text-emerald-700">{correct} correct</span><span className="text-red-600">{wrong} wrong</span><span className="text-amber-600">{skipped} blank</span>
            <span>Time on chapter <b className="text-slate-900">{Math.round(secs / 60)} min {secs % 60} sec</b></span>
            <span>Whole test: <b className="text-slate-900">{test.marks}/{test.max}</b> · {test.mins} min · rank {test.rank}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-500 border-b border-[#f0ebe4]"><th className="py-2 pr-3">Q.No</th><th className="pr-3">Result</th><th className="pr-3">Your answer</th><th className="pr-3">Correct answer</th><th className="pr-3 w-44">Time taken</th></tr></thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.n} className="border-b border-[#f7f2ec]">
                    <td className="py-2 pr-3 font-semibold text-slate-800">{q.n}</td>
                    <td className="pr-3"><Pill tone={q.status === 'correct' ? 'green' : q.status === 'wrong' ? 'red' : 'amber'}>{q.status === 'correct' ? 'Correct' : q.status === 'wrong' ? 'Wrong' : 'Not attempted'}</Pill></td>
                    <td className="pr-3">{q.marked}</td><td className="pr-3 font-semibold text-emerald-700">{q.key}</td>
                    <td className="pr-3"><div className="flex items-center gap-2"><div className="flex-1"><Bar value={Math.min(100, (q.secs / 150) * 100)} color={q.secs > 100 ? RED : q.secs > 60 ? AMBER : GREEN} h="h-1.5" /></div><span className="w-12 text-right text-slate-600">{q.secs}s</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
};


// ---------- question paper content (sample): one question, four options, key and a worked solution ----------
const optionsFor = (q: { n: number; chapter: string; key: string }) => {
  const base = (q.n * 7 + q.chapter.length * 3) % 9 + 2;
  return 'ABCD'.split('').map((l, i) => ({ l, text: `${base * (i + 1) + (i === 2 ? 1 : 0)} ${['units', 'units', 'units', 'units'][i]}` }));
};
const paperQ = (q: QResult) => {
  const opts = optionsFor(q);
  return {
    text: `A problem on ${q.chapter} (${q.subject}): find the required quantity using the standard result and the data given in the question.`,
    opts,
    solution: `Step 1: Identify the concept from ${q.chapter}. Step 2: Write the relevant formula and substitute the data. Step 3: Simplify to get option ${q.key} (${opts.find((o) => o.l === q.key)?.text}). Options that miss a factor or use the wrong sign are the common traps here.`,
  };
};
const QCard: React.FC<{ q: QResult; show: { opts?: boolean; key?: boolean; yours?: boolean; solution?: boolean } }> = ({ q, show }) => {
  const p = paperQ(q);
  const tone = q.status === 'correct' ? 'green' : q.status === 'wrong' ? 'red' : 'amber';
  return (
    <div className="rounded-2xl border border-[#ece4da] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-800"><b className="mr-1">Q{q.n}.</b>{p.text}</p>
        {show.yours && <Pill tone={tone}>{q.status === 'correct' ? 'Correct' : q.status === 'wrong' ? 'Incorrect' : 'Skipped'}</Pill>}
      </div>
      <p className="text-[11px] text-slate-400 mt-1">{q.subject} · {q.chapter}</p>
      {show.opts && (
        <div className="grid sm:grid-cols-2 gap-2 mt-3">
          {p.opts.map((o) => {
            const isKey = show.key && o.l === q.key; const isMine = show.yours && o.l === q.marked && q.status === 'wrong';
            return <div key={o.l} className={`rounded-xl border px-3 py-2 text-xs ${isKey ? 'border-emerald-400 bg-emerald-50 text-emerald-800 font-semibold' : isMine ? 'border-red-300 bg-red-50 text-red-700' : 'border-[#ece4da] text-slate-700'}`}>({o.l}) {o.text}{isKey ? '  ✓' : isMine ? '  ✗ your answer' : ''}</div>;
          })}
        </div>
      )}
      {(show.yours || show.key) && !show.opts && (
        <p className="text-xs text-slate-600 mt-2">{show.yours && <>Your answer <b className={q.status === 'correct' ? 'text-emerald-700' : q.status === 'wrong' ? 'text-red-600' : 'text-amber-600'}>{q.marked === '-' ? 'not attempted' : q.marked}</b> · </>}{show.key && <>Correct answer <b className="text-emerald-700">{q.key}</b></>}</p>
      )}
      {show.solution && <p className="mt-3 rounded-xl bg-[#fff8f4] border border-[#f0dcd0] p-3 text-xs text-slate-700"><b>Solution.</b> {p.solution}</p>}
    </div>
  );
};

// ---------- test level (NEET-prep style) ----------
const TestAnalysis: React.FC<{ student: Student; testId: string; onBack: () => void }> = ({ student, testId, onBack }) => {
  const test = studentTests(student).find((t) => t.id === testId) as TestResult;
  const [pickQ, setPickQ] = useState<number | null>(null);
  const [ttab, setTtab] = useState('Overview');
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
      <button onClick={onBack} className="block text-xs font-semibold text-[#a3161b] hover:underline">← Back</button>
      <div className="flex flex-wrap items-baseline gap-3"><h3 className="text-base font-bold font-heading text-slate-900">{test.name}</h3><span className="text-xs text-slate-500">{test.date} · {test.kind} test</span></div>

      <TabBar items={['Overview', 'Question paper', 'Key answer', 'Solution', `Correct (${test.correct})`, `Incorrect (${test.wrong})`, `Skipped (${test.skipped})`]} value={ttab} onChange={setTtab} />
      {ttab !== 'Overview' && (() => {
        const list = ttab === 'Question paper' || ttab === 'Key answer' || ttab === 'Solution' ? test.questions : test.questions.filter((x) => (ttab.startsWith('Correct') ? x.status === 'correct' : ttab.startsWith('Incorrect') ? x.status === 'wrong' : x.status === 'skipped'));
        const show = ttab === 'Question paper' ? { opts: true } : ttab === 'Key answer' ? { opts: true, key: true } : ttab === 'Solution' ? { opts: true, key: true, solution: true } : { opts: true, key: true, yours: true, solution: ttab.startsWith('Incorrect') };
        return (
          <div className="space-y-3">
            {ttab === 'Key answer' && <Card title="Answer key"><div className="flex flex-wrap gap-2">{test.questions.map((x) => <span key={x.n} className="px-2.5 py-1 rounded-lg bg-[#faf6ee] border border-[#ece4da] text-xs"><b>{x.n}</b> · <b className="text-emerald-700">{x.key}</b></span>)}</div></Card>}
            {list.length === 0 ? <Card><p className="text-center text-sm text-slate-500 py-6">No questions here.</p></Card> : list.map((x) => <QCard key={x.n} q={x} show={show} />)}
          </div>
        );
      })()}
      {ttab === 'Overview' && <>
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
                  <td className="py-2 pr-3 font-semibold text-slate-800"><span className="inline-flex items-center gap-2"><SubjectIcon subject={s.subject} className="w-6 h-6" />{s.subject}</span></td><td className="pr-3 font-semibold">{s.marks}/{s.max}</td>
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
      </>}
    </div>
  );
};
