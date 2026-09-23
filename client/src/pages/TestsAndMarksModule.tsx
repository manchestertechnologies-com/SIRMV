import React, { useState } from 'react';
import { Award, BookOpen, Calendar, CheckCircle2, ChevronRight, Download, Filter, Search, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { INITIAL_STUDENTS } from '../data/mockInstitutionalData';

export const TestsAndMarksModule: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'assessments' | 'scores'>('assessments');
  const [selectedExam, setSelectedExam] = useState('Unit Test 1');
  const [searchQuery, setSearchQuery] = useState('');

  const exams = [
    { id: 'exam-1', name: 'Unit Test 1', type: 'Unit Test', date: 'July 10-16, 2026', maxMarks: 50, status: 'EVALUATED' },
    { id: 'exam-2', name: 'Unit Test 2', type: 'Unit Test', date: 'Aug 18-24, 2026', maxMarks: 50, status: 'EVALUATED' },
    { id: 'exam-3', name: 'Mid Term Examination 2026', type: 'Term Exam', date: 'Sept 05-15, 2026', maxMarks: 100, status: 'EVALUATED' },
    { id: 'exam-4', name: 'NEET Intensive Test 1', type: 'NEET Mock', date: 'Sept 18, 2026', maxMarks: 720, status: 'RESULTS_PUBLISHED' },
    { id: 'exam-5', name: 'JEE Advanced Prep Test', type: 'JEE Mock', date: 'Sept 25, 2026', maxMarks: 300, status: 'UPCOMING' }
  ];

  // Generate student marks for the selected exam
  const studentScores = INITIAL_STUDENTS.map((std, idx) => {
    const seed = (idx + 1) * 13;
    const phy = 38 + (seed % 12);
    const chem = 36 + (seed % 14);
    const math = 37 + (seed % 13);
    const bio = 39 + (seed % 11);
    const total = phy + chem + math + bio;
    const percentage = Math.round((total / 200) * 100);

    return {
      id: std.id,
      name: std.name,
      roll: std.roll_number,
      reg: std.register_number,
      cls: std.class_name,
      sec: std.section_name,
      batch: std.batch_name,
      phy,
      chem,
      math,
      bio,
      total,
      percentage,
      grade: percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B+' : 'B'
    };
  });

  const filteredScores = studentScores.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.reg.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#ded9cf]">
        <div>
          <h1 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            <span>Examinations, Tests & Marks Registry</span>
          </h1>
          <p className="text-xs text-slate-500">
            Internal unit assessments, board examinations, and NEET/JEE score performance matrices.
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center gap-1 bg-[#ded9cf]/60 p-1 rounded-2xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('assessments')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'assessments'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Exam Schedules
          </button>
          <button
            onClick={() => setActiveTab('scores')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'scores'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Marks Matrix ({INITIAL_STUDENTS.length})
          </button>
        </div>
      </div>

      {activeTab === 'assessments' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-2xl border border-[#ded8cb] p-5 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                  {exam.type}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  exam.status === 'UPCOMING'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {exam.status}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">{exam.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> {exam.date}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Max Marks: <strong>{exam.maxMarks}</strong></span>
                <button
                  onClick={() => {
                    setSelectedExam(exam.name);
                    setActiveTab('scores');
                  }}
                  className="text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View Scores</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filter / Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#ded8cb]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Selected Exam:</span>
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                {exams.map((e) => (
                  <option key={e.id} value={e.name}>{e.name}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student or roll no..."
                className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Scores Table */}
          <div className="bg-white rounded-2xl border border-[#ded8cb] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#faf8f3] border-b border-[#ded8cb] text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Reg No</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Class & Batch</th>
                    <th className="py-3 px-3 text-center">Physics</th>
                    <th className="py-3 px-3 text-center">Chemistry</th>
                    <th className="py-3 px-3 text-center">Maths</th>
                    <th className="py-3 px-3 text-center">Biology/CS</th>
                    <th className="py-3 px-4 text-center">Total</th>
                    <th className="py-3 px-3 text-center">Percentage</th>
                    <th className="py-3 px-4 text-center">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredScores.slice(0, 30).map((row) => (
                    <tr key={row.id} className="hover:bg-blue-50/30 transition">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-700">{row.reg}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{row.name}</td>
                      <td className="py-2.5 px-4 text-slate-500">{row.cls} - {row.sec} ({row.batch})</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">{row.phy}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">{row.chem}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">{row.math}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">{row.bio}</td>
                      <td className="py-2.5 px-4 text-center font-black text-blue-700">{row.total}/200</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900">{row.percentage}%</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded font-extrabold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {row.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default TestsAndMarksModule;
