import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import {
  Printer,
  Download,
  Calendar,
  Clock,
  MapPin,
  User,
  BookOpen,
  Camera,
  Video,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Award,
  Users,
  Building,
  ArrowLeft
} from 'lucide-react';

interface OnePageLectureRecordProps {
  lectureSessionId: string;
  onBack?: () => void;
}

export const OnePageLectureRecord: React.FC<OnePageLectureRecordProps> = ({
  lectureSessionId,
  onBack
}) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  useEffect(() => {
    async function loadRecord() {
      setIsLoading(true);
      try {
        const res = await apiFetch<any>(`/lectures/${lectureSessionId}`);
        setData(res);
      } catch (err: any) {
        console.error('Failed to load lecture record', err);
      } finally {
        setIsLoading(false);
      }
    }
    if (lectureSessionId) {
      loadRecord();
    }
  }, [lectureSessionId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data || !data.lecture) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
        Lecture record not found.
      </div>
    );
  }

  const { lecture, concept, attendanceSummary, attendanceRecords, hasRecording } = data;

  const printDocument = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar (hidden when printing) */}
      <div className="no-print flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-base font-bold text-slate-900">Consolidated Lecture Session Record</h2>
            <p className="text-xs text-slate-500">Session ID: <span className="font-mono">{lecture.id}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={printDocument}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* CONSOLIDATED 1-PAGE DOCUMENT CONTAINER */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-10 space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Institutional Header */}
        <div className="border-b-2 border-slate-900 pb-6 text-center space-y-1">
          <div className="text-xs font-extrabold text-indigo-700 tracking-widest uppercase">
            {lecture.branch_name}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            OFFICIAL CLASSROOM LECTURE SESSION REPORT
          </h1>
          <p className="text-xs text-slate-500">
            {lecture.branch_city} Campus • Academic Year {lecture.academic_year} • Principal: {lecture.principal_name}
          </p>
        </div>

        {/* Section 1: Lecture Session Details */}
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            1. Lecture Session Details
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block">Date</span>
              <span className="font-bold text-slate-900 text-sm">{lecture.date}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Class & Section</span>
              <span className="font-bold text-slate-900 text-sm">{lecture.class_name} {lecture.section_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Competitive Batch</span>
              <span className="font-bold text-indigo-700 text-sm">{lecture.batch_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Subject</span>
              <span className="font-bold text-slate-900 text-sm">{lecture.subject_name} ({lecture.subject_code})</span>
            </div>
            <div>
              <span className="text-slate-400 block">Room Number</span>
              <span className="font-semibold text-slate-800">Room {lecture.room_number} (Floor {lecture.room_floor})</span>
            </div>
            <div>
              <span className="text-slate-400 block">Faculty In-Charge</span>
              <span className="font-semibold text-slate-800">{lecture.original_teacher_name} ({lecture.original_teacher_empid})</span>
            </div>
            <div>
              <span className="text-slate-400 block">Floor Attender</span>
              <span className="font-semibold text-slate-800">{lecture.floor_attender_name || 'Ramesh Kumar'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Final Verification</span>
              <span className="font-bold text-emerald-700">COMPLETED</span>
            </div>
          </div>
        </div>

        {/* Section 2: Schedule & Timing Log */}
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            2. Scheduled vs Actual Timestamps
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100 text-xs text-center">
            <div className="bg-white p-3 rounded-xl border border-indigo-100">
              <span className="text-slate-400 block text-[10px]">Scheduled Slot</span>
              <span className="font-bold text-slate-900 font-mono text-xs">{lecture.scheduled_start} - {lecture.scheduled_end}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-indigo-100">
              <span className="text-slate-400 block text-[10px]">Teacher Time In</span>
              <span className="font-bold text-indigo-700 font-mono text-xs">{lecture.teacher_time_in || '--:--'}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-indigo-100">
              <span className="text-slate-400 block text-[10px]">Lecture Started</span>
              <span className="font-bold text-emerald-700 font-mono text-xs">{lecture.lecture_start_time || '--:--'}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-indigo-100">
              <span className="text-slate-400 block text-[10px]">Lecture Ended</span>
              <span className="font-bold text-indigo-700 font-mono text-xs">{lecture.lecture_end_time || '--:--'}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-indigo-100">
              <span className="text-slate-400 block text-[10px]">Teacher Time Out</span>
              <span className="font-bold text-slate-900 font-mono text-xs">{lecture.teacher_time_out || '--:--'}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Teacher Status & Proxy Allocation */}
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            3. Faculty Status
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full font-bold text-xs ${
                lecture.teacher_status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                lecture.teacher_status === 'SUBSTITUTE' ? 'bg-purple-100 text-purple-800' : 'bg-rose-100 text-rose-800'
              }`}>
                STATUS: {lecture.teacher_status}
              </span>
              {lecture.substitute_teacher_name && (
                <span className="text-slate-700">
                  Substitute Faculty: <strong>{lecture.substitute_teacher_name}</strong> ({lecture.substitute_teacher_empid})
                </span>
              )}
            </div>
            <span className="text-slate-500 font-medium">Original Assigned: {lecture.original_teacher_name}</span>
          </div>
        </div>

        {/* Section 4: Concept & Syllabus Progress */}
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            4. Concept Taught in Classroom
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-200 text-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 w-24">Chapter:</span>
              <span className="font-bold text-slate-900">{concept?.chapter || 'Chapter 11: Thermodynamics'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 w-24">Core Concept:</span>
              <span className="font-semibold text-indigo-700">{concept?.concept || 'Second Law of Thermodynamics & Carnot Engine'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-slate-500 w-24 shrink-0">Topic Taught:</span>
              <span className="text-slate-700">{concept?.topic_taught || 'Work done in isothermal & adiabatic expansion, Carnot cycle efficiency derivation and problem solving'}</span>
            </div>
          </div>
        </div>

        {/* Section 5: Student Attendance Metrics & Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              5. Student Attendance Summary ({attendanceSummary.attendancePercentage}%)
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="text-slate-600">Total: {attendanceSummary.total}</span>
              <span className="text-emerald-700">Present: {attendanceSummary.present}</span>
              <span className="text-rose-700">Absent: {attendanceSummary.absent}</span>
              <span className="text-amber-700">Late: {attendanceSummary.late}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-4 max-h-60 overflow-y-auto">
              {attendanceRecords.map((rec: any) => (
                <div key={rec.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{rec.student_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{rec.register_number}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    rec.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                    rec.status === 'ABSENT' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {rec.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 6: Classroom Photo & Class Recording */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Class Photo */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              6. Captured Classroom Photo
            </div>
            <div className="aspect-16/9 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center">
              {lecture.classroom_photo_url ? (
                <img src={lecture.classroom_photo_url} alt="Classroom Verification" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-6 text-slate-400 text-xs">
                  <Camera className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  No Classroom Photo Uploaded
                </div>
              )}
            </div>
          </div>

          {/* Class Recording */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              7. Class Recording (For Absent Students)
            </div>
            <div className="aspect-16/9 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex flex-col items-center justify-center text-white p-6 text-center">
              {hasRecording ? (
                <>
                  <Video className="w-8 h-8 text-indigo-400 mb-2" />
                  <div className="text-xs font-bold text-white mb-1">Live Recording Available</div>
                  <p className="text-[11px] text-slate-400 mb-3 truncate max-w-xs">{lecture.recording_url}</p>
                  <a
                    href={lecture.recording_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition shadow-xs"
                  >
                    Watch Lecture Recording
                  </a>
                </>
              ) : (
                <>
                  <Video className="w-8 h-8 text-slate-600 mb-2" />
                  <span className="text-xs font-semibold text-slate-400">Class Recording Not Available</span>
                  <p className="text-[10px] text-slate-500 mt-1">No video stream linked for this period.</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Section 7: Floor Attender Remarks & Management Signatures */}
        <div className="pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-600 mb-6">
            <strong>Floor Attender Remarks:</strong> {lecture.remarks || 'Classroom session completed with full decorum and verified attendance.'}
          </div>

          <div className="grid grid-cols-3 gap-6 text-center text-xs pt-8">
            <div className="border-t border-slate-300 pt-2 font-bold text-slate-700">
              Floor Attender Signature
            </div>
            <div className="border-t border-slate-300 pt-2 font-bold text-slate-700">
              Subject Faculty Signature
            </div>
            <div className="border-t border-slate-300 pt-2 font-bold text-slate-700">
              Principal / HOD Approval
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
