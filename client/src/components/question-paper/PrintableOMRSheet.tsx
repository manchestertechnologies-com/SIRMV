import React from 'react';

interface PrintableOMRSheetProps {
  examTitle?: string;
  setCode?: 'P' | 'Q' | 'R' | 'S';
  totalQuestions?: number;
  academicYear?: string;
}

export const PrintableOMRSheet: React.FC<PrintableOMRSheetProps> = ({
  examTitle = 'INSTITUTIONAL ASSESSMENT 2026',
  setCode = 'P',
  totalQuestions = 60,
  academicYear = '2026-2027'
}) => {
  // Determine number of question columns (e.g. 1-20, 21-40, 41-60 or up to 180)
  const questionsPerColumn = totalQuestions <= 60 ? 20 : totalQuestions <= 100 ? 25 : 45;
  const numColumns = Math.ceil(totalQuestions / questionsPerColumn);

  const columns: number[][] = [];
  for (let c = 0; c < numColumns; c++) {
    const col: number[] = [];
    const start = c * questionsPerColumn + 1;
    const end = Math.min((c + 1) * questionsPerColumn, totalQuestions);
    for (let q = start; q <= end; q++) {
      col.push(q);
    }
    columns.push(col);
  }

  return (
    <div className="printable-omr bg-white text-slate-950 font-sans text-xs max-w-[210mm] mx-auto p-4 border border-slate-300 shadow-sm print:border-none print:shadow-none print:p-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 6mm 8mm 6mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .printable-omr {
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}} />

      {/* Alignment Corner Markers for Optical Vision */}
      <div className="relative border-2 border-slate-900 p-3 rounded-xs">
        {/* Top Alignment Boxes */}
        <div className="absolute top-1 left-1 w-3 h-3 bg-black"></div>
        <div className="absolute top-1 right-1 w-3 h-3 bg-black"></div>
        <div className="absolute bottom-1 left-1 w-3 h-3 bg-black"></div>
        <div className="absolute bottom-1 right-1 w-3 h-3 bg-black"></div>

        {/* Header */}
        <div className="text-center border-b-2 border-slate-900 pb-2 mb-2">
          <div className="flex items-center justify-between">
            <div className="text-left text-[10px] font-bold text-slate-700">
              <div>INSTITUTION CODE: <span className="text-slate-900">SMG-PU-041</span></div>
              <div>YEAR: <span className="text-slate-900">{academicYear}</span></div>
            </div>

            <div className="text-center">
              <h1 className="text-base font-black tracking-wider uppercase">
                SIR M. VISVESVARAYA PU COLLEGE
              </h1>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                SHIVAMOGGA CAMPUS • OMR EVALUATION ASSESSMENT SHEET
              </p>
              <div className="text-xs font-bold text-slate-900 uppercase underline mt-0.5">
                {examTitle}
              </div>
            </div>

            <div className="text-right border-2 border-slate-900 px-2 py-0.5 rounded font-black text-xs bg-slate-100">
              <div>SET CODE</div>
              <div className="text-sm text-slate-950 font-black">{setCode}</div>
            </div>
          </div>
        </div>

        {/* Top Grid: Roll Number, Set Bubble, Subject Code */}
        <div className="grid grid-cols-12 gap-2 border border-slate-800 p-2 mb-2 bg-slate-50/50 rounded-xs">
          {/* Candidate Roll Number Grid */}
          <div className="col-span-6 border-r border-slate-400 pr-2">
            <div className="font-bold text-[10px] text-center mb-1 bg-slate-200 py-0.5 uppercase tracking-wide">
              Candidate Roll Number (Darken Appropriate Bubbles)
            </div>
            <div className="flex justify-center gap-1.5">
              {Array.from({ length: 7 }).map((_, digitIdx) => (
                <div key={digitIdx} className="flex flex-col items-center">
                  <div className="w-5 h-5 border border-slate-700 bg-white mb-1"></div>
                  <div className="flex flex-col gap-0.5">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <div
                        key={num}
                        className="w-3.5 h-3.5 rounded-full border border-slate-800 flex items-center justify-center text-[8px] font-mono font-bold text-slate-700"
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Question Booklet Set & Stream Bubbles */}
          <div className="col-span-6 pl-2 flex flex-col justify-between">
            {/* Set Selection Bubble Box */}
            <div className="border border-slate-700 p-1.5 rounded-xs bg-white">
              <div className="font-bold text-[10px] uppercase text-center mb-1 text-slate-800">
                Question Booklet Set
              </div>
              <div className="flex justify-around items-center">
                {(['P', 'Q', 'R', 'S'] as const).map((s) => (
                  <div key={s} className="flex flex-col items-center gap-0.5">
                    <span className="font-bold text-[10px]">{s}</span>
                    <div
                      className={`w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center font-bold text-[10px] ${
                        setCode === s ? 'bg-black text-white' : 'bg-white text-slate-800'
                      }`}
                    >
                      {s}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Candidate Details Text Box */}
            <div className="text-[10px] space-y-1 mt-1 border-t border-slate-300 pt-1">
              <div className="flex items-center gap-1">
                <span className="font-bold whitespace-nowrap">Name:</span>
                <div className="border-b border-dotted border-slate-700 flex-1"></div>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold whitespace-nowrap">Class / Section:</span>
                <div className="border-b border-dotted border-slate-700 flex-1"></div>
              </div>
            </div>

            {/* Instructions Alert */}
            <div className="bg-amber-50 border border-amber-300 p-1 text-[9px] rounded-xs text-amber-900 leading-tight">
              <b>Important:</b> Use Blue/Black Ball Point Pen. Fill completely: <span className="inline-block w-2.5 h-2.5 rounded-full bg-black align-middle"></span>. Do not tick <span className="text-rose-600 font-bold">✗</span> or cross <span className="text-rose-600 font-bold">✓</span>.
            </div>
          </div>
        </div>

        {/* Question Response Grid (Multi-column) */}
        <div className={`grid grid-cols-${numColumns} gap-2 border border-slate-800 p-2 bg-white rounded-xs`}>
          {columns.map((colQuestions, cIdx) => (
            <div
              key={cIdx}
              className={`space-y-1 ${cIdx < numColumns - 1 ? 'border-r border-slate-300 pr-2' : ''}`}
            >
              <div className="flex items-center justify-between text-[9px] font-bold text-slate-600 border-b border-slate-300 pb-0.5 px-0.5">
                <span>Q#</span>
                <div className="flex gap-2 pr-1 font-mono">
                  <span>A</span>
                  <span>B</span>
                  <span>C</span>
                  <span>D</span>
                </div>
              </div>

              {colQuestions.map((qNum) => (
                <div
                  key={qNum}
                  className="flex items-center justify-between px-0.5 hover:bg-slate-50 text-[10px]"
                >
                  <span className="font-bold font-mono text-slate-800 w-5 text-right pr-1">
                    {qNum}
                  </span>
                  <div className="flex gap-1.5 items-center">
                    {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                      <div
                        key={opt}
                        className="w-3.5 h-3.5 rounded-full border border-slate-900 flex items-center justify-center font-bold text-[8px] text-slate-700 bg-white"
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer Signatures */}
        <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold border-t border-slate-400 mt-2 pt-2">
          <div className="border-t border-dotted border-slate-600 pt-1">
            Candidate Signature
          </div>
          <div className="border-t border-dotted border-slate-600 pt-1">
            Invigilator Signature
          </div>
          <div className="border-t border-dotted border-slate-600 pt-1">
            Chief Superintendent Seal
          </div>
        </div>
      </div>
    </div>
  );
};
