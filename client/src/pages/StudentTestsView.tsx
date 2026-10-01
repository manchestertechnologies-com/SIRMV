import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../utils/toast';
import { Monitor, FileText, Download, X, ListChecks, Award } from 'lucide-react';

interface TestRow {
  id: string;
  branch_id: string;
  title: string;
  mode: 'ONLINE' | 'OFFLINE';
  class_id: string;
  class_name: string;
  batch_id: string;
  batch_name: string;
  subject_id: string | null;
  subject_name: string | null;
  scheduled_date: string;
  start_time: string | null;
  duration_minutes: number;
  total_marks: number;
  question_paper_url: string | null;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  questionCount: number;
  submissionCount: number;
}

interface TestQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  marks: number;
  sort_order: number;
}

interface Submission {
  id: string;
  test_id: string;
  student_id: string;
  marks_obtained: number;
  answers_json: string;
  submitted_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: 'bg-slate-100 text-slate-700',
  LIVE: 'bg-emerald-50 text-emerald-700',
  COMPLETED: 'bg-indigo-50 text-indigo-700',
  CANCELLED: 'bg-rose-50 text-rose-700'
};

export const StudentTestsView: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission | null>>({});
  const [attemptTestId, setAttemptTestId] = useState<string | null>(null);
  const [resultsTestId, setResultsTestId] = useState<string | null>(null);

  const studentId = user?.student_id;

  const load = async () => {
    setIsLoading(true);
    try {
      const profileRes = await apiFetch<any>('/students/me/profile');
      const profile = profileRes?.profile;
      if (!profile) {
        setTests([]);
        return;
      }

      const qs = new URLSearchParams({
        class_id: profile.class_id || '',
        batch_id: profile.batch_id || ''
      });
      const res = await apiFetch<{ tests: TestRow[] }>(`/tests?${qs.toString()}`);
      const myTests = (res.tests || []).filter(
        (t) => t.class_id === profile.class_id && t.batch_id === profile.batch_id
      );
      setTests(myTests);

      if (studentId) {
        const onlineTests = myTests.filter((t) => t.mode === 'ONLINE');
        const subEntries = await Promise.all(
          onlineTests.map(async (t) => {
            try {
              const subRes = await apiFetch<{ submission: Submission | null }>(
                `/tests/${t.id}/my-submission?student_id=${studentId}`
              );
              return [t.id, subRes.submission] as const;
            } catch (err) {
              return [t.id, null] as const;
            }
          })
        );
        setSubmissions(Object.fromEntries(subEntries));
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load tests.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const sortedTests = [...tests].sort((a, b) => (a.scheduled_date < b.scheduled_date ? 1 : -1));

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : sortedTests.length === 0 ? (
        <div className="p-12 text-center bg-[#fdfcfb] rounded-3xl border border-[#ded9cf] text-slate-400 text-sm">
          No tests have been assigned to your class yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTests.map((t) => {
            const submission = submissions[t.id];
            const canAttempt =
              t.mode === 'ONLINE' &&
              !submission &&
              (t.status === 'LIVE' || t.status === 'SCHEDULED');

            return (
              <div
                key={t.id}
                className="bg-[#fdfcfb] rounded-3xl p-5 border border-[#ded9cf] shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.mode === 'ONLINE' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {t.mode === 'ONLINE' ? <Monitor className="w-3 h-3" /> : <FileText className="w-3 h-3" />}{' '}
                    {t.mode}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[t.status] || 'bg-slate-100 text-slate-700'}`}>
                    {t.status}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-900">{t.title}</p>
                  <p className="text-[11px] text-slate-500">
                    {t.subject_name ? `${t.subject_name} • ` : ''}
                    {t.scheduled_date}
                    {t.start_time ? ` • ${t.start_time}` : ''}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-[#f2eee6]">
                  <span>{t.total_marks} marks</span>
                  {t.mode === 'ONLINE' && <span>{t.questionCount} questions</span>}
                </div>

                {t.mode === 'ONLINE' && submission && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold">
                      <Award className="w-3.5 h-3.5" /> Marks: {submission.marks_obtained} / {t.total_marks}
                    </span>
                    <button
                      onClick={() => setResultsTestId(t.id)}
                      className="text-[11px] font-bold text-indigo-700 hover:underline"
                    >
                      View your answers
                    </button>
                  </div>
                )}

                {canAttempt && (
                  <button
                    onClick={() => setAttemptTestId(t.id)}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition"
                  >
                    Attempt Test
                  </button>
                )}

                {t.mode === 'OFFLINE' && t.question_paper_url && (
                  <a
                    href={t.question_paper_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl text-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" /> Question Paper
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {attemptTestId && (
        <AttemptTestModal
          testId={attemptTestId}
          studentId={studentId}
          onClose={() => setAttemptTestId(null)}
          onSubmitted={(marksObtained, totalMarks) => {
            setAttemptTestId(null);
            showToast(`Test submitted! You scored ${marksObtained} / ${totalMarks}.`, 'success');
            load();
          }}
        />
      )}

      {resultsTestId && (
        <ResultsModal
          testId={resultsTestId}
          submission={submissions[resultsTestId] || null}
          onClose={() => setResultsTestId(null)}
        />
      )}
    </div>
  );
};

const AttemptTestModal: React.FC<{
  testId: string;
  studentId?: string;
  onClose: () => void;
  onSubmitted: (marksObtained: number, totalMarks: number) => void;
}> = ({ testId, studentId, onClose, onSubmitted }) => {
  const [test, setTest] = useState<TestRow | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<{ test: TestRow; questions: TestQuestion[] }>(`/tests/${testId}`);
        setTest(res.test);
        setQuestions(res.questions || []);
      } catch (err: any) {
        showToast(err.message || 'Failed to load test.', 'error');
        onClose();
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  const selectAnswer = (questionId: string, option: 'A' | 'B' | 'C' | 'D') => {
    setAnswers((s) => ({ ...s, [questionId]: option }));
  };

  const handleSubmit = async () => {
    if (!studentId) {
      showToast('Your student profile could not be identified.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiFetch<{ success: boolean; marksObtained: number; totalMarks: number }>(
        `/tests/${testId}/submit`,
        {
          method: 'POST',
          body: JSON.stringify({ student_id: studentId, answers })
        }
      );
      onSubmitted(res.marksObtained, res.totalMarks);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit test.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-[#ded9cf] my-8">
        <div className="bg-[#fdfcfb] p-5 border-b border-[#ded9cf] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 font-heading flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-indigo-600" />
              {test?.title || 'Attempt Test'}
            </h3>
            {test && (
              <p className="text-xs text-slate-500">
                {test.subject_name ? `${test.subject_name} • ` : ''}
                {questions.length} questions • {test.total_marks} marks
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : (
          <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
            {questions
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((q, i) => (
                <div key={q.id} className="p-4 rounded-2xl border border-[#ded9cf] bg-[#fdfcfb] space-y-2.5">
                  <p className="text-xs font-bold text-slate-800">
                    {i + 1}. {q.question_text}{' '}
                    <span className="text-slate-400 font-medium">({q.marks} mk)</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                      const optionText = (q as any)[`option_${opt.toLowerCase()}`];
                      const selected = answers[q.id] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => selectAnswer(q.id, opt)}
                          className={`text-left px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                            selected
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'bg-white border-[#ded9cf] text-slate-700 hover:border-indigo-300'
                          }`}
                        >
                          {opt}) {optionText}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            {questions.length === 0 && (
              <p className="text-center text-slate-400 text-xs py-8">No questions found for this test.</p>
            )}
          </div>
        )}

        <div className="p-5 border-t border-[#ded9cf] flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500">
            {answeredCount} / {questions.length} answered
          </span>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading || questions.length === 0}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Test'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ResultsModal: React.FC<{ testId: string; submission: Submission | null; onClose: () => void }> = ({
  testId,
  submission,
  onClose
}) => {
  const [test, setTest] = useState<TestRow | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<{ test: TestRow; questions: TestQuestion[] }>(`/tests/${testId}`);
        setTest(res.test);
        setQuestions(res.questions || []);
      } catch (err: any) {
        showToast(err.message || 'Failed to load test.', 'error');
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  let myAnswers: Record<string, string> = {};
  try {
    myAnswers = submission?.answers_json ? JSON.parse(submission.answers_json) : {};
  } catch (_) {
    myAnswers = {};
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-[#ded9cf] my-8">
        <div className="bg-[#fdfcfb] p-5 border-b border-[#ded9cf] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 font-heading flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              {test?.title || 'Your Answers'}
            </h3>
            {test && submission && (
              <p className="text-xs text-slate-500">
                Marks: {submission.marks_obtained} / {test.total_marks}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : (
          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            {questions
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((q, i) => (
                <div key={q.id} className="p-4 rounded-2xl border border-[#ded9cf] bg-[#fdfcfb] space-y-1.5 text-xs">
                  <p className="font-bold text-slate-800">
                    {i + 1}. {q.question_text} <span className="text-slate-400 font-medium">({q.marks} mk)</span>
                  </p>
                  <p className="text-slate-500">
                    A) {q.option_a} &nbsp; B) {q.option_b} &nbsp; C) {q.option_c} &nbsp; D) {q.option_d}
                  </p>
                  <p className="font-bold text-indigo-700">Your answer: {myAnswers[q.id] || 'Not answered'}</p>
                </div>
              ))}
            {questions.length === 0 && (
              <p className="text-center text-slate-400 text-xs py-8">No questions found for this test.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
