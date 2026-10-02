import React from 'react';
import { MathRenderer } from './MathRenderer';

export interface ProcessedQuestion {
  id: string;
  originalId: string;
  qNumber: number;
  subject: string;
  klass: string;
  chapter: string;
  topic?: string;
  qType: string;
  question: string;
  optA?: string;
  optB?: string;
  optC?: string;
  optD?: string;
  correctOption: string;
  solutionText?: string;
  marks: number;
  negativeMarks: number;
}

export interface ExamPaperSet {
  setCode: 'P' | 'Q' | 'R' | 'S';
  title: string;
  institutionName: string;
  academicYear: string;
  examDate?: string;
  durationMinutes: number;
  totalMarks: number;
  totalQuestions: number;
  instructions: string[];
  sections: Array<{
    name: string;
    subject: string;
    instructions?: string;
    questions: ProcessedQuestion[];
  }>;
  answerKey: Record<number, string>;
  solutions: Array<{
    qNumber: number;
    subject: string;
    chapter: string;
    correctOption: string;
    solutionText: string;
  }>;
}

export interface MasterAnswerKeyRow {
  baseNumber: number;
  subject: string;
  chapter: string;
  setKeys: {
    P: { qNumber: number; correct: string };
    Q: { qNumber: number; correct: string };
    R: { qNumber: number; correct: string };
    S: { qNumber: number; correct: string };
  };
}

interface PrintableQuestionPaperProps {
  paperSet: ExamPaperSet;
  columns?: 1 | 2;
  watermark?: boolean;
}

export const PrintableQuestionPaper: React.FC<PrintableQuestionPaperProps> = ({
  paperSet,
  columns = 2,
  watermark = true
}) => {
  return (
    <div className="printable-paper bg-white text-slate-900 font-serif leading-relaxed text-[13px] relative max-w-[210mm] mx-auto p-6 shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 10mm 12mm 10mm;
          }
          body {
            background: white !important;
            color: black !important;
            font-size: 11pt !important;
          }
          .printable-paper {
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .avoid-page-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .force-page-break {
            page-break-before: always;
            break-before: page;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      {/* Watermark */}
      {watermark && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03] select-none z-0">
          <div className="text-8xl font-black font-sans uppercase rotate-[-35deg] tracking-widest text-slate-900 text-center">
            SIR MV<br />PU COLLEGE
          </div>
        </div>
      )}

      {/* Paper Content Wrapper */}
      <div className="relative z-10">
        {/* Institutional Header */}
        <header className="border-b-2 border-slate-900 pb-3 mb-4 text-center">
          <div className="flex items-center justify-between gap-2 border-b border-slate-300 pb-2 mb-2">
            <div className="text-left text-[11px] font-sans font-semibold text-slate-700">
              <div>COLLEGE CODE: <span className="font-bold text-slate-900">SMG-PU-041</span></div>
              <div>ACADEMIC YEAR: <span className="font-bold text-slate-900">{paperSet.academicYear || '2026-2027'}</span></div>
            </div>

            {/* Set Badge Box */}
            <div className="flex flex-col items-center">
              <div className="border-2 border-slate-900 bg-slate-900 text-white font-sans font-black px-4 py-1 rounded text-base tracking-wider uppercase shadow-2xs">
                QUESTION BOOKLET — SET {paperSet.setCode}
              </div>
            </div>

            <div className="text-right text-[11px] font-sans font-semibold text-slate-700">
              <div>MAX MARKS: <span className="font-bold text-slate-900">{paperSet.totalMarks}</span></div>
              <div>TIME: <span className="font-bold text-slate-900">{paperSet.durationMinutes} MINS</span></div>
            </div>
          </div>

          <h1 className="text-lg sm:text-xl font-bold font-sans tracking-wide text-slate-950 uppercase">
            {paperSet.institutionName || 'SIR M. VISVESVARAYA PU COLLEGE'}
          </h1>
          <p className="text-[11px] font-sans text-slate-600 uppercase tracking-wider font-semibold">
            SHIVAMOGGA CAMPUS • DEPARTMENT OF PRE-UNIVERSITY & COMPETITIVE EXAMINATIONS
          </p>
          <div className="mt-1 font-bold text-sm tracking-wide bg-slate-100 py-1 border-y border-slate-300 font-sans uppercase">
            {paperSet.title}
          </div>
        </header>

        {/* Candidate Information Box */}
        <div className="border border-slate-800 rounded p-2 mb-4 font-sans text-[11px] avoid-page-break bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold whitespace-nowrap">Candidate Name:</span>
              <div className="border-b border-dotted border-slate-700 flex-1 min-h-[18px]"></div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold whitespace-nowrap">Roll / Register No:</span>
              <div className="border border-slate-800 grid grid-cols-8 h-6 w-48 text-center text-xs font-mono">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="border-r last:border-r-0 border-slate-400"></div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold whitespace-nowrap">Candidate Signature:</span>
              <div className="border-b border-dotted border-slate-700 flex-1 min-h-[18px]"></div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold whitespace-nowrap">Invigilator Signature:</span>
              <div className="border-b border-dotted border-slate-700 flex-1 min-h-[18px]"></div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {paperSet.instructions && paperSet.instructions.length > 0 && (
          <div className="border border-slate-300 bg-slate-50/70 p-2.5 rounded mb-4 text-[11px] font-sans avoid-page-break">
            <div className="font-bold text-slate-900 uppercase tracking-wider mb-1 border-b border-slate-200 pb-0.5">
              Important Instructions for Candidates:
            </div>
            <ol className="list-decimal pl-4 space-y-0.5 text-slate-700">
              {paperSet.instructions.map((inst, idx) => (
                <li key={idx}>{inst}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Question Sections */}
        {paperSet.sections.map((section, sIdx) => (
          <div key={sIdx} className="mb-6">
            {/* Section Divider Header */}
            <div className="border-t-2 border-b border-slate-900 bg-slate-100 py-1 px-2 my-3 text-center avoid-page-break">
              <span className="font-sans font-black text-xs uppercase tracking-wider text-slate-900">
                {section.name}
              </span>
              {section.instructions && (
                <div className="text-[11px] font-sans text-slate-600 italic">
                  {section.instructions}
                </div>
              )}
            </div>

            {/* Questions Grid (2 columns or 1 column) */}
            <div className={`grid ${columns === 2 ? 'grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 print:grid-cols-2' : 'grid-cols-1 gap-y-4'}`}>
              {section.questions.map((q) => (
                <div
                  key={q.id}
                  className="avoid-page-break border-b border-slate-200 pb-3 last:border-b-0 text-slate-900"
                >
                  {/* Question Header & Content */}
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold font-sans text-xs bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 min-w-[24px] text-center">
                      {q.qNumber}.
                    </span>
                    <div className="flex-1 font-serif text-[13px]">
                      <MathRenderer text={q.question} />
                    </div>
                  </div>

                  {/* Options (A, B, C, D) */}
                  {(q.optA || q.optB || q.optC || q.optD) && (
                    <div className="mt-2 pl-7 grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 font-serif text-[12.5px]">
                      {q.optA && (
                        <div className="flex items-start gap-1">
                          <span className="font-bold font-sans text-[11px] text-slate-700 min-w-[18px]">(A)</span>
                          <MathRenderer text={q.optA} />
                        </div>
                      )}
                      {q.optB && (
                        <div className="flex items-start gap-1">
                          <span className="font-bold font-sans text-[11px] text-slate-700 min-w-[18px]">(B)</span>
                          <MathRenderer text={q.optB} />
                        </div>
                      )}
                      {q.optC && (
                        <div className="flex items-start gap-1">
                          <span className="font-bold font-sans text-[11px] text-slate-700 min-w-[18px]">(C)</span>
                          <MathRenderer text={q.optC} />
                        </div>
                      )}
                      {q.optD && (
                        <div className="flex items-start gap-1">
                          <span className="font-bold font-sans text-[11px] text-slate-700 min-w-[18px]">(D)</span>
                          <MathRenderer text={q.optD} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Space for Rough Work Page */}
        <div className="force-page-break border-2 border-dashed border-slate-300 rounded p-4 text-center mt-8 min-h-[300px]">
          <span className="font-sans font-bold text-xs uppercase tracking-widest text-slate-400">
            SPACE FOR ROUGH WORK / CALCULATIONS
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Printable Master Cross-Set Answer Key Grid (Set P vs Q vs R vs S)
 */
export const PrintableMasterAnswerKey: React.FC<{
  title: string;
  matrix: MasterAnswerKeyRow[];
  totalQuestions: number;
}> = ({ title, matrix, totalQuestions }) => {
  return (
    <div className="printable-master-key bg-white text-slate-900 font-sans p-6 max-w-[210mm] mx-auto border border-slate-200 print:border-none print:p-0">
      <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
        <h1 className="text-lg font-bold uppercase">SIR M. VISVESVARAYA PU COLLEGE - SHIVAMOGGA</h1>
        <h2 className="text-sm font-semibold uppercase text-slate-700">{title}</h2>
        <div className="mt-1 inline-block bg-slate-900 text-white font-bold px-3 py-0.5 rounded text-xs tracking-wider uppercase">
          MASTER CROSS-SET ANSWER KEY MATRIX (SETS P, Q, R, S)
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border border-slate-400 border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400 text-center">
              <th className="p-1.5 border-r border-slate-400 w-12">Q.No</th>
              <th className="p-1.5 border-r border-slate-400">Subject / Chapter</th>
              <th className="p-1.5 border-r border-slate-400 bg-amber-50 text-amber-900 w-20">SET P</th>
              <th className="p-1.5 border-r border-slate-400 bg-emerald-50 text-emerald-900 w-20">SET Q</th>
              <th className="p-1.5 border-r border-slate-400 bg-sky-50 text-sky-900 w-20">SET R</th>
              <th className="p-1.5 bg-violet-50 text-violet-900 w-20">SET S</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, idx) => (
              <tr key={idx} className="border-b border-slate-300 hover:bg-slate-50 text-center">
                <td className="p-1 border-r border-slate-300 font-bold text-slate-800">{row.baseNumber}</td>
                <td className="p-1 border-r border-slate-300 text-left pl-2 font-medium text-slate-700 truncate max-w-[180px]">
                  <span className="font-semibold text-slate-900">{row.subject}:</span> {row.chapter}
                </td>
                <td className="p-1 border-r border-slate-300 bg-amber-50/50 font-bold text-slate-900">
                  Q{row.setKeys.P.qNumber} : <span className="text-amber-700 font-black">({row.setKeys.P.correct})</span>
                </td>
                <td className="p-1 border-r border-slate-300 bg-emerald-50/50 font-bold text-slate-900">
                  Q{row.setKeys.Q.qNumber} : <span className="text-emerald-700 font-black">({row.setKeys.Q.correct})</span>
                </td>
                <td className="p-1 border-r border-slate-300 bg-sky-50/50 font-bold text-slate-900">
                  Q{row.setKeys.R.qNumber} : <span className="text-sky-700 font-black">({row.setKeys.R.correct})</span>
                </td>
                <td className="p-1 bg-violet-50/50 font-bold text-slate-900">
                  Q{row.setKeys.S.qNumber} : <span className="text-violet-700 font-black">({row.setKeys.S.correct})</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Printable Detailed Step-by-Step Solution Booklet
 */
export const PrintableSolutionBooklet: React.FC<{
  paperSet: ExamPaperSet;
}> = ({ paperSet }) => {
  return (
    <div className="printable-solutions bg-white text-slate-900 font-serif p-6 max-w-[210mm] mx-auto border border-slate-200 print:border-none print:p-0">
      <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
        <h1 className="text-lg font-bold font-sans uppercase">SIR M. VISVESVARAYA PU COLLEGE</h1>
        <h2 className="text-sm font-semibold font-sans uppercase text-slate-700">{paperSet.title}</h2>
        <div className="mt-1 inline-block bg-slate-900 text-white font-sans font-bold px-3 py-0.5 rounded text-xs tracking-wider uppercase">
          DETAILED SOLUTIONS & HINTS — SET {paperSet.setCode}
        </div>
      </div>

      <div className="space-y-4">
        {paperSet.solutions.map((sol) => (
          <div key={sol.qNumber} className="avoid-page-break border-b border-slate-200 pb-3">
            <div className="flex items-center justify-between font-sans text-xs font-bold mb-1">
              <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                Question #{sol.qNumber} ({sol.subject} - {sol.chapter})
              </span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                Correct Option: ({sol.correctOption})
              </span>
            </div>
            <div className="font-serif text-[13px] text-slate-800 pl-2 leading-relaxed bg-slate-50/60 p-2 rounded border border-slate-100">
              <MathRenderer text={sol.solutionText || 'Refer to classroom syllabus notes for proof.'} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
