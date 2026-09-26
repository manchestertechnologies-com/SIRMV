import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { Select } from '../components/Select';
import { useAuth } from '../context/AuthContext';
import {
  FileCheck2,
  Printer,
  Download,
  Search,
  Filter,
  Award,
  Layers,
  Calendar,
  BookOpen,
  User,
  GraduationCap,
  Eye,
  CheckCircle2,
  X,
  FileText,
  Users
} from 'lucide-react';

export const ReportCardGenerator: React.FC = () => {
  const { user, currentBranch } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [examSubjects, setExamSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Generator Selections
  const [selectedStudentId, setSelectedStudentId] = useState<string>('sp-rahul');
  const [selectedExamId, setSelectedExamId] = useState<string>('exam-midterm');
  const [subjectMode, setSubjectMode] = useState<'ALL' | 'SINGLE' | 'MULTI'>('ALL');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedMultiSubjects, setSelectedMultiSubjects] = useState<string[]>([]);
  const [reportType, setReportType] = useState<'DETAILED' | 'SUMMARY'>('DETAILED');

  // Bulk-generation modal selections (previously uncontrolled placeholders)
  const [bulkClass, setBulkClass] = useState<string>('2 PUC');
  const [bulkSectionBatch, setBulkSectionBatch] = useState<string>('A-NEET');

  // Generated Report Data
  const [reportData, setReportData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Evaluated Paper Modal State
  const [activeEvaluatedPaperUrl, setActiveEvaluatedPaperUrl] = useState<string | null>(null);
  const [activeEvaluatedPaperTitle, setActiveEvaluatedPaperTitle] = useState<string>('');

  // Bulk Generation State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkClassId, setBulkClassId] = useState('');
  const [bulkSectionId, setBulkSectionId] = useState('');
  const [bulkBatchId, setBulkBatchId] = useState('');
  const [bulkStudents, setBulkStudents] = useState<any[]>([]);

  useEffect(() => {
    async function loadMeta() {
      try {
        const branchId = currentBranch?.id || '';
        const examRes = await apiFetch<any>(`/reports/exams?branch_id=${branchId}`);
        setExams(examRes.exams || []);
        setExamSubjects(examRes.examSubjects || []);
        if (examRes.exams?.length > 0) {
          setSelectedExamId(examRes.exams[0].id);
        }

        const studentRes = await apiFetch<any>(`/evening-study/session?branch_id=${branchId}`);
        setStudents(studentRes.students || []);
        if (studentRes.students?.length > 0) {
          setSelectedStudentId(studentRes.students[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load report generator metadata', err);
      }
    }
    loadMeta();
  }, [currentBranch]);

  // Generate Report
  const handleGenerateReport = async () => {
    if (!selectedStudentId || !selectedExamId) return;
    setIsLoading(true);

    try {
      let subjectIdsToSend: string[] = ['ALL'];
      if (subjectMode === 'SINGLE' && selectedSubjectId) {
        subjectIdsToSend = [selectedSubjectId];
      } else if (subjectMode === 'MULTI' && selectedMultiSubjects.length > 0) {
        subjectIdsToSend = selectedMultiSubjects;
      }

      const res = await apiFetch<any>('/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          student_id: selectedStudentId,
          exam_id: selectedExamId,
          subject_ids: subjectIdsToSend,
          report_type: reportType
        })
      });

      setReportData(res);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStudentId && selectedExamId) {
      handleGenerateReport();
    }
  }, [selectedStudentId, selectedExamId, subjectMode, selectedSubjectId, selectedMultiSubjects]);

  const handleToggleMultiSubject = (sId: string) => {
    setSelectedMultiSubjects((prev) =>
      prev.includes(sId) ? prev.filter((id) => id !== sId) : [...prev, sId]
    );
  };

  // Bulk Generation
  const handleBulkGenerate = async () => {
    try {
      const res = await apiFetch<any>('/reports/bulk-generate', {
        method: 'POST',
        body: JSON.stringify({
          class_id: bulkClassId || undefined,
          section_id: bulkSectionId || undefined,
          batch_id: bulkBatchId || undefined,
          exam_id: selectedExamId
        })
      });

      setBulkStudents(res.students || []);
      alert(`Bulk report card batches generated for ${res.totalStudents} students.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const currentExam = exams.find((e) => e.id === selectedExamId);
  const currentStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="space-y-6">
      {/* Generator Configuration Card (hidden when printing) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-slate-900">Official Report Card Generator</h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Subject-wise, Multiple-subject or Consolidated Institutional Report Cards with dynamic assessment metrics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition flex items-center gap-1.5"
            >
              <Users className="w-4 h-4" />
              Bulk Batch Generation
            </button>
            <button
              onClick={() => window.print()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Download PDF / Print
            </button>
          </div>
        </div>

        {/* Configuration Selectors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {/* Select Student */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Student</label>
            <Select
              value={selectedStudentId}
              onChange={setSelectedStudentId}
              sheetTitle="Select Student"
              options={students.map((st) => ({ value: st.id, label: `${st.name} (${st.register_number})` }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none"
            />
          </div>

          {/* Dynamic Exam Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Examination</label>
            <Select
              value={selectedExamId}
              onChange={setSelectedExamId}
              sheetTitle="Select Examination"
              options={exams.map((ex) => ({ value: ex.id, label: `${ex.name} (${ex.exam_type})` }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-indigo-900 outline-none"
            />
          </div>

          {/* Subject Mode Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Subject Scope Mode</label>
            <Select
              value={subjectMode}
              onChange={(v) => setSubjectMode(v as 'ALL' | 'SINGLE' | 'MULTI')}
              sheetTitle="Subject Scope Mode"
              options={[
                { value: 'ALL', label: 'Option 1: ALL Enrolled Subjects' },
                { value: 'SINGLE', label: 'Option 2: ONE Subject Specific' },
                { value: 'MULTI', label: 'Option 3: MULTIPLE Selected Subjects' }
              ]}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none"
            />
          </div>

          {/* Report Layout Type */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Report Detail Level</label>
            <Select
              value={reportType}
              onChange={(v) => setReportType(v as 'DETAILED' | 'SUMMARY')}
              sheetTitle="Report Detail Level"
              options={[
                { value: 'DETAILED', label: 'Detailed Institutional Report' },
                { value: 'SUMMARY', label: 'Compact Summary Report' }
              ]}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none"
            />
          </div>
        </div>

        {/* Sub-selectors for Subject Specific / Multi-subject modes */}
        {subjectMode === 'SINGLE' && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-3 text-xs">
            <span className="font-bold text-slate-700">Choose Specific Subject:</span>
            {['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English', 'Kannada'].map((subName) => (
              <button
                key={subName}
                onClick={() => setSelectedSubjectId(subName)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                  selectedSubjectId === subName
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {subName}
              </button>
            ))}
          </div>
        )}

        {subjectMode === 'MULTI' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-slate-700">Select Multiple Subjects:</span>
            {['sub-phy-branch-dvg', 'sub-chem-branch-dvg', 'sub-math-branch-dvg', 'sub-bio-branch-dvg', 'sub-eng-branch-dvg', 'sub-kan-branch-dvg'].map((sId) => {
              const label = sId.includes('phy') ? 'Physics' : sId.includes('chem') ? 'Chemistry' : sId.includes('math') ? 'Mathematics' : sId.includes('bio') ? 'Biology' : sId.includes('eng') ? 'English' : 'Kannada';
              const isChecked = selectedMultiSubjects.includes(sId);
              return (
                <label key={sId} className="flex items-center gap-1.5 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleMultiSubject(sId)}
                    className="rounded text-indigo-600"
                  />
                  <span className="font-semibold text-slate-800">{label}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* REPORT CARD DOCUMENT VIEW */}
      {reportData && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-12 space-y-8 print:border-none print:shadow-none print:p-0">
          {/* Institutional Header */}
          <div className="border-b-2 border-slate-900 pb-6 text-center space-y-1">
            <div className="text-xs font-black text-indigo-700 tracking-widest uppercase">
              {reportData.student.college_name}
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              STUDENT ACADEMIC PERFORMANCE & PROGRESS REPORT
            </h1>
            <p className="text-xs text-slate-600">
              {reportData.student.college_address} • Phone: {reportData.student.college_phone} • {reportData.student.college_city}
            </p>
            <div className="inline-block mt-2 bg-indigo-900 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              {reportData.exam.name} ({reportData.exam.academic_year})
            </div>
          </div>

          {/* Student Profile & Meta Box */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200 text-xs">
            {/* Student Photo */}
            <div className="text-center md:border-r md:border-slate-200 pr-4 flex flex-col items-center justify-center">
              <div className="w-24 h-24 rounded-2xl bg-white border border-slate-300 overflow-hidden shadow-xs mb-2">
                <img
                  src={reportData.student.photo_url || '/avatars/student_rahul.png'}
                  alt="Student"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-bold text-slate-900 text-sm">{reportData.student.name}</span>
              <span className="font-mono text-indigo-700 font-bold">{reportData.student.register_number}</span>
            </div>

            {/* Academic Info */}
            <div className="space-y-2 md:col-span-2">
              <div className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-1">
                Student Demographics & Stream
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div><span className="text-slate-400">Class & Section:</span> <strong>{reportData.student.class_name} {reportData.student.section_name}</strong></div>
                <div><span className="text-slate-400">Competitive Stream:</span> <strong className="text-indigo-700">{reportData.student.batch_name}</strong></div>
                <div><span className="text-slate-400">Parent / Guardian:</span> <span>{reportData.student.parent_name}</span></div>
                <div><span className="text-slate-400">Contact Number:</span> <span className="font-mono">{reportData.student.parent_phone}</span></div>
                <div><span className="text-slate-400">Residential Status:</span> <span>{reportData.student.is_hostelite ? 'Hostelite (Campus Hostel)' : 'Day Scholar'}</span></div>
                <div><span className="text-slate-400">Academic Year:</span> <span>{reportData.exam.academic_year}</span></div>
              </div>
            </div>

            {/* Attendance & Overall Stats */}
            <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200 text-center flex flex-col justify-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Attendance & Class Standing</span>
              <div className="text-2xl font-black text-indigo-600">{reportData.summary.attendancePercentage}</div>
              <p className="text-[10px] text-slate-500">Class Rank: <strong>#{reportData.summary.classRank}</strong> • Batch Rank: <strong>#{reportData.summary.batchRank}</strong></p>
              <div className="text-xs font-bold text-emerald-700 bg-emerald-50 py-1 rounded-lg border border-emerald-100">
                {reportData.summary.overallGrade}
              </div>
            </div>
          </div>

          {/* MARKS & SUBJECT PERFORMANCE TABLE */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Assessment Subject Breakdown
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-semibold">
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4 text-center">Max Marks</th>
                    <th className="py-3 px-4 text-center">Obtained</th>
                    <th className="py-3 px-4 text-center">Percentage</th>
                    <th className="py-3 px-4 text-center">Grade</th>
                    <th className="py-3 px-4 text-center">Evaluated Paper</th>
                    <th className="py-3 px-4">Faculty Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.subjects.map((s: any) => {
                    const pct = ((s.marks_obtained / s.max_marks) * 100).toFixed(1);
                    return (
                      <tr key={s.subject_id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {s.subject_name}
                          <span className="block font-mono text-[10px] text-slate-400 font-normal">{s.subject_code}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-600">{s.max_marks}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-black text-slate-900 text-sm">{s.marks_obtained}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-indigo-700">{pct}%</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800">
                            {s.grade || 'A+'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {s.evaluated_paper_url ? (
                            <button
                              onClick={() => {
                                setActiveEvaluatedPaperUrl(s.evaluated_paper_url);
                                setActiveEvaluatedPaperTitle(`${s.subject_name} - Evaluated Answer Sheet`);
                              }}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-[11px] transition flex items-center gap-1 mx-auto no-print"
                            >
                              <Eye className="w-3 h-3" /> View Paper
                            </button>
                          ) : (
                            <span className="text-slate-300 text-[10px]">Not Uploaded</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-[11px] italic max-w-xs">
                          {s.teacher_remarks || 'Good analytical clarity.'}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Summary Totals Row */}
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300 text-xs">
                    <td className="py-4 px-4 uppercase tracking-wider">Consolidated Aggregates</td>
                    <td className="py-4 px-4 text-center font-mono">{reportData.summary.totalMaxMarks}</td>
                    <td className="py-4 px-4 text-center font-mono text-base text-indigo-950 font-black">
                      {reportData.summary.totalObtainedMarks}
                    </td>
                    <td className="py-4 px-4 text-center font-mono text-base text-indigo-700 font-black">
                      {reportData.summary.overallPercentage}%
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-xs shadow-xs">
                        {reportData.summary.overallGrade.slice(0, 2)}
                      </span>
                    </td>
                    <td colSpan={2} className="py-4 px-4 text-slate-500 text-[11px]">
                      Institution Standing: <strong>Top 5% of Batch</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* MULTI-LEVEL INSTITUTIONAL REMARKS */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Faculty & Leadership Feedback
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="font-bold text-slate-700 block mb-1">Class Teacher Remarks</span>
                <p className="text-slate-600 italic">"{reportData.remarks?.class_teacher_remarks}"</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="font-bold text-slate-700 block mb-1">HOD Departmental Assessment</span>
                <p className="text-slate-600 italic">"{reportData.remarks?.hod_remarks}"</p>
              </div>
            </div>
          </div>

          {/* SIGNATURE BLOCKS */}
          <div className="pt-8 border-t border-slate-200">
            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              <div className="border-t border-slate-300 pt-2 font-bold text-slate-700">
                Class Teacher Signature
              </div>
              <div className="border-t border-slate-300 pt-2 font-bold text-slate-700">
                Head of Department (HOD)
              </div>
              <div className="border-t border-slate-300 pt-2">
                <div className="font-extrabold text-slate-900">{reportData.student.principal_name}</div>
                <span className="text-[10px] text-emerald-700 font-bold block">✓ INSTITUTIONALLY CERTIFIED</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EVALUATED PAPER VIEWER MODAL */}
      {activeEvaluatedPaperUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">{activeEvaluatedPaperTitle}</h3>
              </div>
              <button
                onClick={() => setActiveEvaluatedPaperUrl(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-100 flex items-center justify-center">
              <div className="bg-white p-8 rounded-2xl shadow-lg max-w-2xl w-full border border-slate-200 text-center space-y-4">
                <div className="border-b border-slate-200 pb-4">
                  <h4 className="font-extrabold text-slate-900 text-base">EVALUATED ANSWER SCRIPT RECORD</h4>
                  <p className="text-xs text-slate-500">SIR MV PU College Examination Cell</p>
                </div>
                <div className="py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs space-y-2">
                  <FileCheck2 className="w-12 h-12 text-indigo-600 mx-auto opacity-75" />
                  <p className="font-semibold text-slate-800">Secure Evaluated Paper Document Verified</p>
                  <p className="font-mono text-[11px] text-slate-400">File Path: {activeEvaluatedPaperUrl}</p>
                </div>
                <p className="text-xs text-slate-500">
                  Valued by faculty with step marks, corrections, and question-by-question scoring breakdown.
                </p>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveEvaluatedPaperUrl(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK GENERATION MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                Bulk Report Card Batch Generation
              </h3>
              <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Class</label>
                <Select
                  value={bulkClass}
                  onChange={setBulkClass}
                  sheetTitle="Target Class"
                  options={[{ value: '2 PUC', label: '2 PUC' }, { value: '1 PUC', label: '1 PUC' }]}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Section & Batch</label>
                <Select
                  value={bulkSectionBatch}
                  onChange={setBulkSectionBatch}
                  sheetTitle="Target Section & Batch"
                  options={[
                    { value: 'A-NEET', label: 'Section A - NEET Batch' },
                    { value: 'B-JEE', label: 'Section B - JEE Batch' },
                    { value: 'C-KCET', label: 'Section C - KCET Batch' }
                  ]}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Examination</label>
                <Select
                  value={selectedExamId}
                  onChange={setSelectedExamId}
                  sheetTitle="Examination"
                  options={exams.map((ex) => ({ value: ex.id, label: ex.name }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkGenerate}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Generate All Reports
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
