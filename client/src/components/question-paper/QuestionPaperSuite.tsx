import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import {
  FileText, Sparkles, Printer, CheckCircle2, AlertCircle, Search,
  RefreshCw, Layers, Sliders, BookOpen, Check, Eye, Download,
  HelpCircle, Shuffle, ChevronRight, Hash, Award, CheckSquare,
  FileCheck, ShieldCheck, Cpu, ArrowRight, X, ArrowLeft
} from 'lucide-react';
import {
  PrintableQuestionPaper,
  PrintableMasterAnswerKey,
  PrintableSolutionBooklet,
  ExamPaperSet,
  MasterAnswerKeyRow
} from './PrintableQuestionPaper';
import { PrintableOMRSheet } from './PrintableOMRSheet';
import { MathRenderer } from './MathRenderer';

export interface GeneratedExamSuite {
  examId: string;
  title: string;
  pattern: string;
  institutionName: string;
  academicYear: string;
  durationMinutes: number;
  totalMarks: number;
  totalQuestions: number;
  instructions: string[];
  createdAt: string;
  sets: {
    P: ExamPaperSet;
    Q: ExamPaperSet;
    R: ExamPaperSet;
    S: ExamPaperSet;
  };
  masterAnswerKeyMatrix: MasterAnswerKeyRow[];
}

interface ChapterMeta {
  chapter: string;
  totalQuestions: number;
  mcqCount: number;
  numericCount: number;
  matchCount: number;
  assertionCount: number;
  topics: string[];
}

export const QuestionPaperSuite: React.FC = () => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'blueprint' | 'search' | 'sets' | 'matrix' | 'print' | 'omr-eval' | 'saved'>('blueprint');
  const [activeSetCode, setActiveSetCode] = useState<'P' | 'Q' | 'R' | 'S'>('P');

  // Blueprint form state
  const [examTitle, setExamTitle] = useState('PUC MID-TERM EXAMINATION 2026');
  const [examPattern, setExamPattern] = useState<'KCET' | 'NEET' | 'JEE_MAIN' | 'PU_BOARD_MIDTERM' | 'PU_BOARD_ANNUAL' | 'CUSTOM'>('KCET');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [durationMinutes, setDurationMinutes] = useState(80);
  const [selectedClass, setSelectedClass] = useState<'11' | '12' | 'BOTH'>('11');
  const [shuffleOptions, setShuffleOptions] = useState(true);

  // Subject Configurations
  const [subjectsConfig, setSubjectsConfig] = useState<Array<{
    subject: string;
    klass: '11' | '12';
    selected: boolean;
    questionCount: number;
    marksPerQuestion: number;
    negativeMarks: number;
    selectedChapters: string[];
  }>>([
    { subject: 'PHYSICS', klass: '11', selected: true, questionCount: 15, marksPerQuestion: 1, negativeMarks: 0, selectedChapters: [] },
    { subject: 'CHEMISTRY', klass: '11', selected: true, questionCount: 15, marksPerQuestion: 1, negativeMarks: 0, selectedChapters: [] },
    { subject: 'MATHEMATICS', klass: '11', selected: true, questionCount: 15, marksPerQuestion: 1, negativeMarks: 0, selectedChapters: [] },
    { subject: 'BIOLOGY', klass: '11', selected: false, questionCount: 15, marksPerQuestion: 1, negativeMarks: 0, selectedChapters: [] }
  ]);

  // Available chapters map: "SUBJECT_CLASS" -> ChapterMeta[]
  const [chaptersMap, setChaptersMap] = useState<Record<string, ChapterMeta[]>>({});
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);

  // Pool Health
  const [poolHealth, setPoolHealth] = useState<Record<string, { status: string; count?: number }>>({});

  // Generated Suite state
  const [currentSuite, setCurrentSuite] = useState<GeneratedExamSuite | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search Bank state
  const [searchSubject, setSearchSubject] = useState('PHYSICS');
  const [searchClass, setSearchClass] = useState<'11' | '12'>('11');
  const [searchChapter, setSearchChapter] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // Saved Papers
  const [savedPapers, setSavedPapers] = useState<any[]>([]);

  // Print Mode State
  const [printTarget, setPrintTarget] = useState<'paper-p' | 'paper-q' | 'paper-r' | 'paper-s' | 'all-papers' | 'matrix' | 'solutions' | 'omr'>('paper-p');
  const [printColumns, setPrintColumns] = useState<1 | 2>(2);

  // OMR Grader State
  const [evalRollNo, setEvalRollNo] = useState('26SMV001');
  const [evalStudentName, setEvalStudentName] = useState('Aditi Rao');
  const [evalSetCode, setEvalSetCode] = useState<'P' | 'Q' | 'R' | 'S'>('P');
  const [evalAnswers, setEvalAnswers] = useState<Record<number, string>>({});
  const [evalQuickString, setEvalQuickString] = useState('');
  const [evalResult, setEvalResult] = useState<any | null>(null);

  const flash = (type: 'success' | 'error', message: string) => {
    setStatusNotice({ type, message });
    setTimeout(() => setStatusNotice(null), 5000);
  };

  // Load pool health & initial chapters
  const loadPoolsAndChapters = async () => {
    try {
      const healthRes = await apiFetch<{ pools: any }>('/question-papers/pools-health');
      if (healthRes.pools) setPoolHealth(healthRes.pools);

      // Pre-load chapters for active subjects
      setIsLoadingChapters(true);
      const newMap: Record<string, ChapterMeta[]> = {};

      for (const subj of ['PHYSICS', 'CHEMISTRY', 'MATHEMATICS', 'BIOLOGY']) {
        for (const k of ['11', '12']) {
          try {
            const metaRes = await apiFetch<{ meta: { chapters: ChapterMeta[] } }>(`/question-papers/meta?subject=${subj}&klass=${k}`);
            if (metaRes.meta?.chapters) {
              newMap[`${subj}_${k}`] = metaRes.meta.chapters;
            }
          } catch (e) {
            // Pool skip
          }
        }
      }
      setChaptersMap(newMap);
    } catch (err: any) {
      console.error('Error loading metadata:', err);
    } finally {
      setIsLoadingChapters(false);
    }
  };

  // Load saved papers
  const loadSavedPapers = async () => {
    try {
      const res = await apiFetch<{ papers: any[] }>('/question-papers/saved');
      if (res.papers) setSavedPapers(res.papers);
    } catch (e) {
      // Ignore
    }
  };

  useEffect(() => {
    loadPoolsAndChapters();
    loadSavedPapers();
  }, []);

  // Preset Pattern Handler
  const handleApplyPreset = (pattern: 'KCET' | 'NEET' | 'JEE_MAIN' | 'PU_BOARD_MIDTERM' | 'PU_BOARD_ANNUAL') => {
    setExamPattern(pattern);
    if (pattern === 'KCET') {
      setExamTitle('KCET GRAND MOCK EXAMINATION 2026');
      setDurationMinutes(80);
      setSubjectsConfig([
        { subject: 'PHYSICS', klass: selectedClass === '12' ? '12' : '11', selected: true, questionCount: 20, marksPerQuestion: 1, negativeMarks: 0, selectedChapters: [] },
        { subject: 'CHEMISTRY', klass: selectedClass === '12' ? '12' : '11', selected: true, questionCount: 20, marksPerQuestion: 1, negativeMarks: 0, selectedChapters: [] },
        { subject: 'MATHEMATICS', klass: selectedClass === '12' ? '12' : '11', selected: true, questionCount: 20, marksPerQuestion: 1, negativeMarks: 0, selectedChapters: [] },
        { subject: 'BIOLOGY', klass: selectedClass === '12' ? '12' : '11', selected: false, questionCount: 20, marksPerQuestion: 1, negativeMarks: 0, selectedChapters: [] }
      ]);
    } else if (pattern === 'NEET') {
      setExamTitle('NEET (UG) FULL SYLLABUS GRAND TEST');
      setDurationMinutes(200);
      setSubjectsConfig([
        { subject: 'PHYSICS', klass: selectedClass === '12' ? '12' : '11', selected: true, questionCount: 45, marksPerQuestion: 4, negativeMarks: 1, selectedChapters: [] },
        { subject: 'CHEMISTRY', klass: selectedClass === '12' ? '12' : '11', selected: true, questionCount: 45, marksPerQuestion: 4, negativeMarks: 1, selectedChapters: [] },
        { subject: 'BIOLOGY', klass: selectedClass === '12' ? '12' : '11', selected: true, questionCount: 90, marksPerQuestion: 4, negativeMarks: 1, selectedChapters: [] },
        { subject: 'MATHEMATICS', klass: selectedClass === '12' ? '12' : '11', selected: false, questionCount: 0, marksPerQuestion: 4, negativeMarks: 1, selectedChapters: [] }
      ]);
    } else if (pattern === 'JEE_MAIN') {
      setExamTitle('JEE MAIN MOCK EXAMINATION 2026');
      setDurationMinutes(180);
      setSubjectsConfig([
        { subject: 'PHYSICS', klass: selectedClass === '12' ? '12' : '11', selected: true, questionCount: 25, marksPerQuestion: 4, negativeMarks: 1, selectedChapters: [] },
        { subject: 'CHEMISTRY', klass: selectedClass === '12' ? '12' : '11', selected: true, questionCount: 25, marksPerQuestion: 4, negativeMarks: 1, selectedChapters: [] },
        { subject: 'MATHEMATICS', klass: selectedClass === '12' ? '12' : '11', selected: true, questionCount: 25, marksPerQuestion: 4, negativeMarks: 1, selectedChapters: [] },
        { subject: 'BIOLOGY', klass: selectedClass === '12' ? '12' : '11', selected: false, questionCount: 0, marksPerQuestion: 4, negativeMarks: 1, selectedChapters: [] }
      ]);
    } else {
      setExamTitle('PU BOARD MID-TERM TEST');
      setDurationMinutes(120);
      setSubjectsConfig([
        { subject: 'PHYSICS', klass: selectedClass === '12' ? '12' : '11', selected: true, questionCount: 20, marksPerQuestion: 1, negativeMarks: 0, selectedChapters: [] },
        { subject: 'CHEMISTRY', klass: selectedClass === '12' ? '12' : '11', selected: true, questionCount: 20, marksPerQuestion: 1, negativeMarks: 0, selectedChapters: [] },
        { subject: 'MATHEMATICS', klass: selectedClass === '12' ? '12' : '11', selected: false, questionCount: 20, marksPerQuestion: 1, negativeMarks: 0, selectedChapters: [] },
        { subject: 'BIOLOGY', klass: selectedClass === '12' ? '12' : '11', selected: false, questionCount: 20, marksPerQuestion: 1, negativeMarks: 0, selectedChapters: [] }
      ]);
    }
  };

  // Generate 4-Set Examination Suite
  const handleGenerateExam = async () => {
    const activeSubjs = subjectsConfig.filter(s => s.selected && s.questionCount > 0);
    if (activeSubjs.length === 0) {
      flash('error', 'Please select at least one subject with question count > 0.');
      return;
    }

    setIsGenerating(true);
    try {
      const payload = {
        title: examTitle,
        pattern: examPattern,
        academicYear,
        durationMinutes,
        shuffleOptions,
        subjects: activeSubjs.map(s => ({
          subject: s.subject,
          klass: s.klass,
          chapters: s.selectedChapters,
          questionCount: s.questionCount,
          marksPerQuestion: s.marksPerQuestion,
          negativeMarks: s.negativeMarks
        }))
      };

      const res = await apiFetch<{ success: boolean; examSuite: GeneratedExamSuite }>('/question-papers/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.examSuite) {
        setCurrentSuite(res.examSuite);
        setActiveTab('sets');
        flash('success', `Exam Suite Generated Successfully! 4 Sets (P, Q, R, S) with ${res.examSuite.totalQuestions} questions ready.`);
        loadSavedPapers();
      }
    } catch (err: any) {
      flash('error', `Generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Search Question Bank
  const handleSearchQuestions = async () => {
    setIsSearching(true);
    try {
      const res = await apiFetch<{ questions: any[]; total: number }>('/question-papers/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: searchSubject,
          klass: searchClass,
          chapter: searchChapter || undefined,
          keyword: searchKeyword || undefined,
          limit: 30
        })
      });
      setSearchResults(res.questions || []);
      setSearchTotal(res.total || 0);
    } catch (err: any) {
      flash('error', err.message);
    } finally {
      setIsSearching(false);
    }
  };

  // Trigger Print
  const handlePrint = () => {
    window.print();
  };

  // Quick OMR Evaluator calculation
  const handleEvaluateOMR = async () => {
    if (!currentSuite) {
      flash('error', 'Please generate or load an exam suite first to evaluate against.');
      return;
    }

    const currentKey = currentSuite.sets[evalSetCode].answerKey;

    // If quick string provided e.g. "ABCDAB..."
    let finalAnswers = { ...evalAnswers };
    if (evalQuickString.trim()) {
      const chars = evalQuickString.toUpperCase().replace(/[^ABCD]/g, '').split('');
      chars.forEach((c, idx) => {
        finalAnswers[idx + 1] = c;
      });
    }

    try {
      const res = await apiFetch<{ result: any }>('/question-papers/evaluate-omr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: currentSuite.examId,
          studentRollNumber: evalRollNo,
          studentName: evalStudentName,
          setCode: evalSetCode,
          studentAnswers: finalAnswers,
          masterAnswerKey: currentKey,
          marksPerQuestion: currentSuite.sets[evalSetCode].sections[0]?.questions[0]?.marks || 1,
          negativeMarks: currentSuite.sets[evalSetCode].sections[0]?.questions[0]?.negativeMarks || 0
        })
      });

      setEvalResult(res.result);
      flash('success', `Evaluation Complete! Net Score: ${res.result.netScore} / ${res.result.maxScore} (${res.result.percentage}%)`);
    } catch (err: any) {
      flash('error', err.message);
    }
  };

  const totalPoolQuestions = Object.values(poolHealth).reduce((acc, p) => acc + (p.count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      {statusNotice && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
          statusNotice.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {statusNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {statusNotice.message}
        </div>
      )}

      {/* Main Suite Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
                Question Paper Generator & 4-Set Examination Suite
                <span className="text-[11px] font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                  SETS P, Q, R, S
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Institutional A4 Print Engine • Multi-Subject Shuffling • Master Answer Key Matrix • OMR Evaluation
              </p>
            </div>
          </div>
        </div>

        {/* Database Health Pill */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl self-start md:self-auto text-xs">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="font-semibold text-slate-700">8 Live Subject Pools:</span>
          <span className="font-bold text-emerald-700">{totalPoolQuestions > 0 ? totalPoolQuestions.toLocaleString() : '75,000+'} Qs</span>
        </div>
      </div>

      {/* Navigation Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('blueprint')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition ${
            activeTab === 'blueprint' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          1. Blueprint & Generator
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition ${
            activeTab === 'search' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          2. Live Question Bank
        </button>

        <button
          onClick={() => {
            if (!currentSuite) {
              flash('error', 'Please generate or load an exam first.');
              return;
            }
            setActiveTab('sets');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition ${
            activeTab === 'sets' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Shuffle className="w-3.5 h-3.5" />
          3. 4-Set Examination Suite ({currentSuite ? 'Ready' : 'Draft'})
        </button>

        <button
          onClick={() => {
            if (!currentSuite) {
              flash('error', 'Please generate or load an exam first.');
              return;
            }
            setActiveTab('matrix');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition ${
            activeTab === 'matrix' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          4. Cross-Set Key Matrix
        </button>

        <button
          onClick={() => {
            if (!currentSuite) {
              flash('error', 'Please generate or load an exam first.');
              return;
            }
            setActiveTab('print');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition ${
            activeTab === 'print' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          5. A4 Print & Export Hub
        </button>

        <button
          onClick={() => setActiveTab('omr-eval')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition ${
            activeTab === 'omr-eval' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          6. OMR Evaluation Grader
        </button>

        <button
          onClick={() => setActiveTab('saved')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition ${
            activeTab === 'saved' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Saved Archive ({savedPapers.length})
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: BLUEPRINT & PATTERN BUILDER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'blueprint' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Form Config */}
          <div className="lg:col-span-2 space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            {/* Presets Bar */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Fast Institutional Exam Templates
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'KCET', label: 'KCET Mock (60 Qs)', desc: 'Phy/Chem/Math 60 Marks' },
                  { id: 'NEET', label: 'NEET Full (180 Qs)', desc: 'PCB 720 Marks (+4/-1)' },
                  { id: 'JEE_MAIN', label: 'JEE Main (75 Qs)', desc: 'PCM 300 Marks (+4/-1)' },
                  { id: 'PU_BOARD_MIDTERM', label: 'PU Board Mid-Term', desc: 'Subjective + MCQs' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p.id as any)}
                    className={`p-2.5 text-left rounded-xl border transition ${
                      examPattern === p.id
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{p.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Exam Title / Header</label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. PU-II PHYSICS PRE-BOARD TEST 2026"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Mins)</label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 60)}
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Target Class & Shuffling Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PUC Level</label>
                <div className="flex gap-2">
                  {(['11', '12'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setSelectedClass(k);
                        setSubjectsConfig(prev => prev.map(s => ({ ...s, klass: k })));
                      }}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition ${
                        selectedClass === k
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Class {k} (PUC {k === '11' ? 'I' : 'II'})
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Anti-Cheating Shuffling</label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 mt-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>Shuffle MCQ Options (A, B, C, D) across Sets</span>
                </label>
              </div>
            </div>

            {/* Subject-Wise Blueprint Configuration */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Subject Sections & Chapter Selection
                </label>
                <span className="text-[11px] text-slate-500">Select chapters or leave empty for all chapters</span>
              </div>

              <div className="space-y-3">
                {subjectsConfig.map((subj, idx) => {
                  const poolKey = `${subj.subject}_${subj.klass}`;
                  const availableChapters = chaptersMap[poolKey] || [];

                  return (
                    <div
                      key={subj.subject}
                      className={`border rounded-xl p-3.5 transition ${
                        subj.selected ? 'border-indigo-200 bg-indigo-50/20' : 'border-slate-200 opacity-60 bg-slate-50'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-900">
                          <input
                            type="checkbox"
                            checked={subj.selected}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSubjectsConfig(prev => prev.map((s, i) => i === idx ? { ...s, selected: checked } : s));
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                          <span>{subj.subject} (Class {subj.klass})</span>
                          <span className="text-[10px] font-normal text-slate-500">
                            ({availableChapters.length} chapters available)
                          </span>
                        </label>

                        {subj.selected && (
                          <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500 text-[11px]">Questions:</span>
                              <input
                                type="number"
                                value={subj.questionCount}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10) || 0;
                                  setSubjectsConfig(prev => prev.map((s, i) => i === idx ? { ...s, questionCount: val } : s));
                                }}
                                className="w-14 px-2 py-1 border border-slate-300 rounded text-center font-bold bg-white"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500 text-[11px]">Marks/Q:</span>
                              <input
                                type="number"
                                value={subj.marksPerQuestion}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10) || 1;
                                  setSubjectsConfig(prev => prev.map((s, i) => i === idx ? { ...s, marksPerQuestion: val } : s));
                                }}
                                className="w-12 px-1.5 py-1 border border-slate-300 rounded text-center font-bold bg-white"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500 text-[11px]">Negative:</span>
                              <input
                                type="number"
                                step="0.25"
                                value={subj.negativeMarks}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setSubjectsConfig(prev => prev.map((s, i) => i === idx ? { ...s, negativeMarks: val } : s));
                                }}
                                className="w-14 px-1.5 py-1 border border-slate-300 rounded text-center font-bold bg-white"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Chapter Dropdown / Multi-select if expanded */}
                      {subj.selected && availableChapters.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-200">
                          <div className="text-[11px] font-semibold text-slate-600 mb-1">
                            Included Chapters ({subj.selectedChapters.length > 0 ? `${subj.selectedChapters.length} selected` : 'All Chapters Included'}):
                          </div>
                          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-white border border-slate-200 rounded-lg">
                            {availableChapters.map((ch) => {
                              const isChSelected = subj.selectedChapters.includes(ch.chapter);
                              return (
                                <button
                                  key={ch.chapter}
                                  type="button"
                                  onClick={() => {
                                    setSubjectsConfig(prev => prev.map((s, i) => {
                                      if (i !== idx) return s;
                                      const newChs = isChSelected
                                        ? s.selectedChapters.filter(c => c !== ch.chapter)
                                        : [...s.selectedChapters, ch.chapter];
                                      return { ...s, selectedChapters: newChs };
                                    }));
                                  }}
                                  className={`text-[10px] px-2 py-0.5 rounded-md border transition ${
                                    isChSelected
                                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {ch.chapter} ({ch.totalQuestions})
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateExam}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm transition disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating 4 Sets & Answer Keys...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate 4-Set Examination Suite (P, Q, R, S)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Col: Blueprint Summary Card */}
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2">
                Blueprint Specifications
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Pattern:</span>
                  <span className="font-bold text-slate-900">{examPattern}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Total Sets:</span>
                  <span className="font-bold text-indigo-700 font-mono">4 Sets (P, Q, R, S)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Total Questions:</span>
                  <span className="font-bold text-slate-900">
                    {subjectsConfig.filter(s => s.selected).reduce((acc, s) => acc + s.questionCount, 0)} Qs
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Total Marks:</span>
                  <span className="font-bold text-slate-900">
                    {subjectsConfig.filter(s => s.selected).reduce((acc, s) => acc + (s.questionCount * s.marksPerQuestion), 0)} Marks
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Duration:</span>
                  <span className="font-bold text-slate-900">{durationMinutes} Minutes</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Option Shuffling:</span>
                  <span className="font-bold text-emerald-700">{shuffleOptions ? 'Enabled (A,B,C,D)' : 'Disabled'}</span>
                </div>
              </div>

              <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 leading-relaxed">
                <div className="font-bold mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Institutional Integrity
                </div>
                Each examination set (P, Q, R, S) will receive uniquely permuted question orders and shuffled option letters while automatically compiling a cross-set lookup key for grading.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: LIVE QUESTION BANK BROWSER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900">Search Live 75,000+ Question Bank</h2>
              <span className="text-xs text-slate-500">Found {searchTotal} matching questions</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Subject</label>
                <select
                  value={searchSubject}
                  onChange={(e) => setSearchSubject(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2 bg-white"
                >
                  <option value="PHYSICS">Physics</option>
                  <option value="CHEMISTRY">Chemistry</option>
                  <option value="MATHEMATICS">Mathematics</option>
                  <option value="BIOLOGY">Biology</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Class</label>
                <select
                  value={searchClass}
                  onChange={(e) => setSearchClass(e.target.value as any)}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2 bg-white"
                >
                  <option value="11">Class 11 (PUC I)</option>
                  <option value="12">Class 12 (PUC II)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Chapter</label>
                <select
                  value={searchChapter}
                  onChange={(e) => setSearchChapter(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2 bg-white"
                >
                  <option value="">-- All Chapters --</option>
                  {(chaptersMap[`${searchSubject}_${searchClass}`] || []).map((c) => (
                    <option key={c.chapter} value={c.chapter}>
                      {c.chapter} ({c.totalQuestions})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Keyword Search</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="Search formula, topic..."
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={handleSearchQuestions}
                    disabled={isSearching}
                    className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Search Results List */}
          <div className="space-y-3">
            {searchResults.map((q, idx) => (
              <div key={q.id || idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-700 font-mono">#{idx + 1}</span>
                    <span className="px-2 py-0.5 bg-slate-100 font-bold rounded text-[10px] text-slate-700">
                      {q.chapter}
                    </span>
                    {q.topic && (
                      <span className="px-2 py-0.5 bg-slate-50 rounded text-[10px] text-slate-500">
                        {q.topic}
                      </span>
                    )}
                  </div>
                  <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded">
                    Correct: ({q.correct_option})
                  </span>
                </div>

                <div className="text-xs font-serif leading-relaxed text-slate-900 pt-1">
                  <MathRenderer text={q.question} />
                </div>

                {/* Options Grid */}
                {(q.opt_a || q.opt_b) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 font-serif">
                    {q.opt_a && <div><b>(A)</b> <MathRenderer text={q.opt_a} /></div>}
                    {q.opt_b && <div><b>(B)</b> <MathRenderer text={q.opt_b} /></div>}
                    {q.opt_c && <div><b>(C)</b> <MathRenderer text={q.opt_c} /></div>}
                    {q.opt_d && <div><b>(D)</b> <MathRenderer text={q.opt_d} /></div>}
                  </div>
                )}

                {q.solution_text && (
                  <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="font-bold text-slate-800">Solution: </span>
                    <MathRenderer text={q.solution_text} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: 4-SET SUITE PREVIEW (P, Q, R, S) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'sets' && currentSuite && (
        <div className="space-y-4">
          {/* Set Selector Tabs */}
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 pl-2">Viewing Booklet:</span>
              {(['P', 'Q', 'R', 'S'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveSetCode(s)}
                  className={`px-4 py-1.5 rounded-xl font-bold text-xs transition ${
                    activeSetCode === s
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  SET {s}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Total Questions: <b className="text-slate-900">{currentSuite.totalQuestions}</b></span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">Max Marks: <b className="text-slate-900">{currentSuite.totalMarks}</b></span>
            </div>
          </div>

          {/* Paper Preview */}
          <div className="bg-slate-100/60 p-4 rounded-2xl border border-slate-300 overflow-x-auto">
            <PrintableQuestionPaper
              paperSet={currentSuite.sets[activeSetCode]}
              columns={2}
              watermark={true}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: CROSS-SET ANSWER KEY MATRIX */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'matrix' && currentSuite && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <PrintableMasterAnswerKey
              title={currentSuite.title}
              matrix={currentSuite.masterAnswerKeyMatrix}
              totalQuestions={currentSuite.totalQuestions}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: A4 PRINT & EXPORT HUB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'print' && currentSuite && (
        <div className="space-y-4">
          {/* Print Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Select Document to Print:</span>
              <select
                value={printTarget}
                onChange={(e) => setPrintTarget(e.target.value as any)}
                className="text-xs font-bold border border-slate-300 rounded-xl px-3 py-1.5 bg-white text-slate-900"
              >
                <option value="paper-p">Question Paper: SET P</option>
                <option value="paper-q">Question Paper: SET Q</option>
                <option value="paper-r">Question Paper: SET R</option>
                <option value="paper-s">Question Paper: SET S</option>
                <option value="matrix">Master Cross-Set Answer Key Matrix</option>
                <option value="solutions">Detailed Step-by-Step Solutions</option>
                <option value="omr">A4 Standard OMR Assessment Sheets</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs shadow-sm transition"
              >
                <Printer className="w-4 h-4" />
                Print Document (A4)
              </button>
            </div>
          </div>

          {/* Render Active Print View */}
          <div className="bg-slate-100/60 p-4 rounded-2xl border border-slate-300 overflow-x-auto">
            {printTarget === 'paper-p' && <PrintableQuestionPaper paperSet={currentSuite.sets.P} columns={printColumns} />}
            {printTarget === 'paper-q' && <PrintableQuestionPaper paperSet={currentSuite.sets.Q} columns={printColumns} />}
            {printTarget === 'paper-r' && <PrintableQuestionPaper paperSet={currentSuite.sets.R} columns={printColumns} />}
            {printTarget === 'paper-s' && <PrintableQuestionPaper paperSet={currentSuite.sets.S} columns={printColumns} />}
            {printTarget === 'matrix' && (
              <PrintableMasterAnswerKey
                title={currentSuite.title}
                matrix={currentSuite.masterAnswerKeyMatrix}
                totalQuestions={currentSuite.totalQuestions}
              />
            )}
            {printTarget === 'solutions' && <PrintableSolutionBooklet paperSet={currentSuite.sets.P} />}
            {printTarget === 'omr' && (
              <PrintableOMRSheet
                examTitle={currentSuite.title}
                setCode={activeSetCode}
                totalQuestions={currentSuite.totalQuestions}
                academicYear={currentSuite.academicYear}
              />
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: OMR EVALUATION GRADER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'omr-eval' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Evaluator Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-indigo-600" />
              Candidate OMR Grader
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Student Roll Number</label>
              <input
                type="text"
                value={evalRollNo}
                onChange={(e) => setEvalRollNo(e.target.value)}
                className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Student Name</label>
              <input
                type="text"
                value={evalStudentName}
                onChange={(e) => setEvalStudentName(e.target.value)}
                className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Booklet Set Evaluated</label>
              <div className="flex gap-2">
                {(['P', 'Q', 'R', 'S'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setEvalSetCode(s)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${
                      evalSetCode === s
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    SET {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Quick Response String (e.g. ABCDAB...)
              </label>
              <textarea
                rows={3}
                value={evalQuickString}
                onChange={(e) => setEvalQuickString(e.target.value)}
                placeholder="Paste optical scanner string e.g. ABCDADBCBA..."
                className="w-full text-xs font-mono border border-slate-300 rounded-xl p-2.5 uppercase"
              />
            </div>

            <button
              type="button"
              onClick={handleEvaluateOMR}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              Grade OMR Submission
            </button>
          </div>

          {/* Evaluator Scorecard */}
          <div className="lg:col-span-2 space-y-4">
            {evalResult ? (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{evalResult.studentName} ({evalResult.studentRollNumber})</h3>
                    <p className="text-xs text-slate-500">Evaluated against SET {evalResult.setCode} Answer Key</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-indigo-700 font-mono">
                      {evalResult.netScore} <span className="text-xs font-bold text-slate-400">/ {evalResult.maxScore}</span>
                    </div>
                    <div className="text-[11px] font-bold text-emerald-600">{evalResult.percentage}% Net Score</div>
                  </div>
                </div>

                {/* Score breakdown metrics */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="text-[10px] text-slate-500 font-semibold">Total</div>
                    <div className="font-bold text-slate-900 mt-0.5">{evalResult.totalQuestions}</div>
                  </div>
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="text-[10px] text-emerald-700 font-semibold">Correct</div>
                    <div className="font-bold text-emerald-800 mt-0.5">{evalResult.correctCount} (+{evalResult.positiveMarks})</div>
                  </div>
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
                    <div className="text-[10px] text-rose-700 font-semibold">Wrong</div>
                    <div className="font-bold text-rose-800 mt-0.5">{evalResult.wrongCount} (-{evalResult.negativeMarks})</div>
                  </div>
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="text-[10px] text-amber-700 font-semibold">Left</div>
                    <div className="font-bold text-amber-800 mt-0.5">{evalResult.unattemptedCount}</div>
                  </div>
                </div>

                {/* Question item details table */}
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-2">Q#</th>
                        <th className="p-2">Candidate</th>
                        <th className="p-2">Correct Key</th>
                        <th className="p-2">Marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evalResult.questionDetails.map((q: any) => (
                        <tr key={q.qNumber} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-2 font-bold font-mono">Q{q.qNumber}</td>
                          <td className="p-2">
                            {q.studentAnswer ? (
                              <span className={`px-2 py-0.5 rounded font-bold ${
                                q.status === 'CORRECT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {q.studentAnswer}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Unattempted</span>
                            )}
                          </td>
                          <td className="p-2 font-bold text-slate-800">({q.correctAnswer})</td>
                          <td className={`p-2 font-bold ${q.marksAwarded > 0 ? 'text-emerald-700' : q.marksAwarded < 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                            {q.marksAwarded > 0 ? `+${q.marksAwarded}` : q.marksAwarded}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                Enter student responses or quick optical string on the left to compute net scores.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 7: SAVED ARCHIVE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'saved' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Previously Generated Exam Papers</h2>
          {savedPapers.length === 0 ? (
            <p className="text-xs text-slate-500">No saved papers found yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {savedPapers.map((p) => (
                <div key={p.examId} className="border border-slate-200 rounded-xl p-4 hover:border-indigo-400 transition space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-700">{p.examId}</span>
                    <span className="text-[10px] text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">{p.title}</h4>
                  <div className="flex items-center gap-3 text-[11px] text-slate-600">
                    <span>Pattern: <b>{p.pattern}</b></span>
                    <span>•</span>
                    <span>{p.totalQuestions} Questions</span>
                    <span>•</span>
                    <span>{p.totalMarks} Marks</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await apiFetch<{ examSuite: GeneratedExamSuite }>(`/question-papers/saved/${p.examId}`);
                        if (res.examSuite) {
                          setCurrentSuite(res.examSuite);
                          setActiveTab('sets');
                          flash('success', `Loaded ${res.examSuite.title} successfully.`);
                        }
                      } catch (err: any) {
                        flash('error', err.message);
                      }
                    }}
                    className="w-full mt-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition"
                  >
                    Load & View 4 Sets
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
