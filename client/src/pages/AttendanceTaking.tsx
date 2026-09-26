import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { Select } from '../components/Select';
import { CameraModal } from '../components/CameraModal';
import {
  Users,
  Camera,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  CheckCheck,
  Save,
  Lock
} from 'lucide-react';

interface AttendanceTakingProps {
  lectureSessionId?: string;
}

export const AttendanceTaking: React.FC<AttendanceTakingProps> = ({
  lectureSessionId = 'lec-session-101'
}) => {
  const [data, setData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoAnalysis, setPhotoAnalysis] = useState<any | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);

  const loadAttendanceData = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<any>(`/attendance/lecture/${lectureSessionId}`);
      setData(res);
      setStudents(res.students || []);
      setIsFinalized(res.isFinalized || false);
    } catch (err: any) {
      console.error('Failed to load attendance sheet', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttendanceData();
  }, [lectureSessionId]);

  // Bulk Marking Actions
  const handleMarkAll = (status: string) => {
    if (isFinalized) return;
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        status,
        match_status: 'MANUAL'
      }))
    );
  };

  // Individual Status Toggle
  const handleStatusChange = (studentId: string, status: string) => {
    if (isFinalized) return;
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status, match_status: 'MANUAL' } : s))
    );
  };

  // Save Draft Attendance
  const handleSaveDraft = async () => {
    try {
      await apiFetch('/attendance/save-draft', {
        method: 'POST',
        body: JSON.stringify({
          lecture_session_id: lectureSessionId,
          records: students.map((s) => ({
            student_id: s.id,
            status: s.status,
            confidence: s.detection_confidence,
            match_status: s.match_status
          }))
        })
      });
      setSuccessMessage('Attendance draft saved successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Process Captured Photo through Local CV Service
  const handlePhotoCaptured = async (photoUrl: string) => {
    setIsProcessingPhoto(true);
    try {
      const res = await apiFetch<any>('/attendance/photo-suggestions', {
        method: 'POST',
        body: JSON.stringify({
          lecture_session_id: lectureSessionId,
          photo_url: photoUrl
        })
      });

      setPhotoAnalysis(res.analysis);

      // Merge suggestions into current attendance state
      if (res.analysis?.results) {
        const suggestionMap = new Map();
        res.analysis.results.forEach((r: any) => suggestionMap.set(r.studentId, r));

        setStudents((prev) =>
          prev.map((st) => {
            const sug = suggestionMap.get(st.id);
            if (sug) {
              return {
                ...st,
                status: sug.suggestedStatus,
                match_status: sug.matchStatus,
                detection_confidence: sug.confidence
              };
            }
            return st;
          })
        );
      }

      setSuccessMessage('Photo processed. Please review and verify suggestions below before finalizing.');
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  // Finalize Attendance Lock
  const handleFinalizeAttendance = async () => {
    if (!window.confirm('Are you sure you want to finalize and lock attendance for this lecture? This action will record official attendance.')) {
      return;
    }

    try {
      const res = await apiFetch<any>('/attendance/finalize', {
        method: 'POST',
        body: JSON.stringify({
          lecture_session_id: lectureSessionId,
          records: students.map((s) => ({
            student_id: s.id,
            status: s.status,
            confidence: s.detection_confidence,
            match_status: s.match_status
          }))
        })
      });

      setIsFinalized(true);
      setSuccessMessage('Attendance successfully finalized and locked.');
      setTimeout(() => setSuccessMessage(null), 5000);
      loadAttendanceData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const lecture = data?.lecture;

  // Filter students based on search and status
  const filteredStudents = students.filter((st) => {
    const matchesSearch =
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.register_number.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || st.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const presentCount = students.filter((s) => s.status === 'PRESENT').length;
  const absentCount = students.filter((s) => s.status === 'ABSENT').length;
  const lateCount = students.filter((s) => s.status === 'LATE').length;
  const totalCount = students.length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">Student Classroom Attendance Sheet</h1>
            {isFinalized && (
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                <Lock className="w-3.5 h-3.5" /> FINALIZED
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {lecture?.class_name} • Section {lecture?.section_name} ({lecture?.batch_name}) • {lecture?.subject_name} • Date: {lecture?.date}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {!isFinalized && (
            <>
              <button
                onClick={() => setShowCameraModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                <Camera className="w-4 h-4" />
                Photo-Assisted Attendance
              </button>

              <button
                onClick={handleSaveDraft}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>

              <button
                onClick={handleFinalizeAttendance}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                <CheckCheck className="w-4 h-4" />
                Finalize Attendance
              </button>
            </>
          )}
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Photo AI Suggestions Banner if active */}
      {photoAnalysis && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-purple-950">Local Face Matching Suggestions Applied</h3>
              <p className="text-xs text-purple-800 mt-0.5">
                Analyzed classroom frame. {photoAnalysis.detectedCount} students detected with high confidence. Human verification required: review statuses below and click "Finalize Attendance".
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI & Quick Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Metric Badges */}
        <div className="flex items-center gap-4 text-xs font-bold">
          <span className="text-slate-600">Total: {totalCount}</span>
          <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
            Present: {presentCount}
          </span>
          <span className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
            Absent: {absentCount}
          </span>
          <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
            Late: {lateCount}
          </span>
        </div>

        {/* Quick Bulk Marking */}
        {!isFinalized && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Quick Mark:</span>
            <button
              onClick={() => handleMarkAll('PRESENT')}
              className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition"
            >
              All Present
            </button>
            <button
              onClick={() => handleMarkAll('ABSENT')}
              className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition"
            >
              All Absent
            </button>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search student by name or register number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          sheetTitle="Filter by Status"
          options={[
            { value: 'ALL', label: `All Statuses (${students.length})` },
            { value: 'PRESENT', label: `Present (${presentCount})` },
            { value: 'ABSENT', label: `Absent (${absentCount})` },
            { value: 'LATE', label: `Late (${lateCount})` },
            { value: 'MEDICAL', label: 'Medical Leave' }
          ]}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none"
        />
      </div>

      {/* Students Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Student Details</th>
                <th className="py-3 px-4">Reg Number</th>
                <th className="py-3 px-4">Match / Confidence</th>
                <th className="py-3 px-4 text-center">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((st, idx) => (
                <tr key={st.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                        {st.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div>{st.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {st.is_hostelite ? '🏠 Hostelite' : '🚶 Day Scholar'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 font-semibold">{st.register_number}</td>
                  <td className="py-3 px-4">
                    {st.match_status === 'CONFIRMED' ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> {(st.detection_confidence * 100).toFixed(0)}% Confirmed
                      </span>
                    ) : st.match_status === 'UNCERTAIN' ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="w-3 h-3" /> {(st.detection_confidence * 100).toFixed(0)}% Uncertain
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Manual Entry</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 gap-1">
                      {['PRESENT', 'ABSENT', 'LATE', 'MEDICAL', 'ON_LEAVE'].map((statusOption) => {
                        const isSelected = st.status === statusOption;
                        let activeColor = 'bg-indigo-600 text-white shadow-xs';
                        if (statusOption === 'PRESENT') activeColor = 'bg-emerald-600 text-white shadow-xs';
                        if (statusOption === 'ABSENT') activeColor = 'bg-rose-600 text-white shadow-xs';
                        if (statusOption === 'LATE') activeColor = 'bg-amber-600 text-white shadow-xs';

                        return (
                          <button
                            key={statusOption}
                            type="button"
                            disabled={isFinalized}
                            onClick={() => handleStatusChange(st.id, statusOption)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                              isSelected ? activeColor : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {statusOption.replace('_', ' ')}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Camera Modal */}
      <CameraModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        title="Capture Classroom Photo for Assisted Attendance"
        uploadEndpoint="/floor-attender/upload-photo"
        onPhotoCaptured={handlePhotoCaptured}
      />
    </div>
  );
};
