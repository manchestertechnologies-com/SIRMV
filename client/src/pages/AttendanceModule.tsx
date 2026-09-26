import React, { useState, useEffect } from 'react';
import { showToast } from '../utils/toast';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Clock,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lock,
  Save,
  CheckCheck,
  Search,
  BookOpen,
  MapPin,
  Moon,
  Building2,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { IconAttendance } from '../components/ModuleIcons';

// Which of the 3 attendance types a role actually needs to see. Floor
// In-Charge only ever runs the classroom lecture round — evening study and
// hostel night roll-call are a hostel-warden concern, not theirs. Wardens
// only ever run the hostel-side rounds — the classroom lecture roster
// belongs to teachers/floor staff, not them (showing it to a warden is what
// caused the "Class Attendance Roster" screen and its per-student toggles
// to show up out of context for that role). Everyone else (Admin/Principal/
// Teacher/HOD) keeps the full institutional view.
function tabsForRole(role: string | undefined): Array<'lecture' | 'evening-study' | 'hostel-rollcall'> {
  if (role === 'FLOOR_ATTENDER') return ['lecture'];
  if (role === 'WARDEN' || role === 'HEAD_WARDEN') return ['evening-study', 'hostel-rollcall'];
  return ['lecture', 'evening-study', 'hostel-rollcall'];
}

export const AttendanceModule: React.FC = () => {
  const { user, currentBranch } = useAuth();
  const visibleTabs = tabsForRole(user?.role);
  const [activeTab, setActiveTab] = useState<'lecture' | 'evening-study' | 'hostel-rollcall'>(visibleTabs[0]);

  // Lecture Attendance State
  const [lectureSessions, setLectureSessions] = useState<any[]>([]);
  const [selectedLectureId, setSelectedLectureId] = useState<string>('lec-session-101');
  const [lectureDetails, setLectureDetails] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFinalized, setIsFinalized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Evening Study State
  const [eveningDate, setEveningDate] = useState(new Date().toISOString().split('T')[0]);
  const [eveningSessionId, setEveningSessionId] = useState<string | null>(null);
  const [eveningRoster, setEveningRoster] = useState<any[]>([]);
  const [eveningLoading, setEveningLoading] = useState(false);

  // Hostel Rollcall State
  const [hostelDate, setHostelDate] = useState(new Date().toISOString().split('T')[0]);
  const [hostelRollCall, setHostelRollCall] = useState<any[]>([]);
  const [hostelLoading, setHostelLoading] = useState(false);

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isAttenderOrTeacher = ['FLOOR_ATTENDER', 'TEACHER', 'HOD', 'ADMIN', 'PRINCIPAL'].includes(user?.role || '');

  // Load Lecture Attendance Sheet
  const loadLectureAttendance = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<any>(`/attendance/lecture/${selectedLectureId}`);
      setLectureDetails(res.lecture);
      setStudents(res.students || []);
      setIsFinalized(res.isFinalized || false);
    } catch (err: any) {
      console.error('Failed to load lecture attendance', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Evening Study Roster
  const loadEveningStudy = async () => {
    setEveningLoading(true);
    try {
      const res = await apiFetch<any>(`/evening-study/session?date=${eveningDate}&branch_id=${currentBranch?.id || ''}`);
      setEveningSessionId(res.session?.id || null);
      setEveningRoster(res.students || []);
    } catch (err: any) {
      console.error('Failed to load evening study roster', err);
    } finally {
      setEveningLoading(false);
    }
  };

  // Load Hostel Roll Call
  const loadHostelRollCall = async () => {
    setHostelLoading(true);
    try {
      const res = await apiFetch<any>(`/hostel/attendance?date=${hostelDate}&branch_id=${currentBranch?.id || ''}`);
      setHostelRollCall(res.records || []);
    } catch (err: any) {
      console.error('Failed to load hostel roll call', err);
    } finally {
      setHostelLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'lecture') {
      loadLectureAttendance();
    } else if (activeTab === 'evening-study') {
      loadEveningStudy();
    } else if (activeTab === 'hostel-rollcall') {
      loadHostelRollCall();
    }
  }, [activeTab, selectedLectureId, eveningDate, hostelDate, currentBranch]);

  // Bulk Marking
  const handleMarkAll = (status: 'PRESENT' | 'ABSENT' | 'LATE') => {
    if (isFinalized) return;
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        status,
        match_status: 'MANUAL'
      }))
    );
  };

  // Toggle single status
  const handleStatusToggle = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE') => {
    if (isFinalized) return;
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status, match_status: 'MANUAL' } : s))
    );
  };

  // Save Manual Attendance Draft
  const handleSaveDraft = async () => {
    try {
      await apiFetch('/attendance/save-draft', {
        method: 'POST',
        body: JSON.stringify({
          lecture_session_id: selectedLectureId,
          records: students.map((s) => ({
            student_id: s.id,
            status: s.status,
            match_status: 'MANUAL'
          }))
        })
      });
      setNotification({ type: 'success', message: 'Manual attendance draft saved successfully.' });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  // Finalize & Lock Attendance
  const handleFinalizeAttendance = async () => {
    if (!window.confirm('Are you sure you want to finalize and lock attendance for this lecture?')) {
      return;
    }

    try {
      const res = await apiFetch<any>('/attendance/finalize', {
        method: 'POST',
        body: JSON.stringify({
          lecture_session_id: selectedLectureId,
          records: students.map((s) => ({
            student_id: s.id,
            status: s.status,
            match_status: 'MANUAL'
          }))
        })
      });
      setIsFinalized(true);
      setNotification({ type: 'success', message: res.message || 'Attendance finalized and locked.' });
      setTimeout(() => setNotification(null), 4000);
      loadLectureAttendance();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  // Evening Study Status Change
  const handleEveningStatus = async (studentId: string, status: string) => {
    if (!eveningSessionId) {
      showToast('Evening study session is still loading — try again in a moment.', 'error');
      return;
    }
    try {
      await apiFetch('/evening-study/mark', {
        method: 'POST',
        body: JSON.stringify({
          session_id: eveningSessionId,
          records: [{ student_id: studentId, status }]
        })
      });
      setEveningRoster((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, status } : s))
      );
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Hostel Rollcall Status Change
  const handleHostelStatus = async (roomId: string, studentId: string, status: string) => {
    try {
      await apiFetch('/hostel/mark', {
        method: 'POST',
        body: JSON.stringify({
          date: hostelDate,
          time: '21:30',
          records: [{ student_id: studentId, room_id: roomId, status, remarks: '' }]
        })
      });
      setHostelRollCall((prev) =>
        prev.map((r) => (r.student_id === studentId ? { ...r, status } : r))
      );
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const filteredStudents = students.filter((s) => {
    return (
      searchQuery === '' ||
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.roll_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admission_number?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const presentCount = students.filter((s) => s.status === 'PRESENT').length;
  const absentCount = students.filter((s) => s.status === 'ABSENT').length;
  const lateCount = students.filter((s) => s.status === 'LATE').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Card */}
      <div className="bg-[#fdfcfb] rounded-3xl p-6 sm:p-8 border border-[#ded9cf] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#dcfce7] border border-[#bbf7d0] flex items-center justify-center p-2.5 shrink-0">
            <IconAttendance className="w-10 h-10 text-emerald-800" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">
                Attendance Management System
              </h1>
              <span className="bg-[#dcfce7] text-emerald-900 text-xs px-2.5 py-0.5 rounded-full font-bold border border-[#bbf7d0]">
                100% Manual & Verified
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Classroom lecture records, evening study attendance tracking, and daily hostel night roll-call.
            </p>
          </div>
        </div>

        {/* Action Controls for Lecture Attendance */}
        {activeTab === 'lecture' && isAttenderOrTeacher && (
          <div className="flex flex-wrap items-center gap-2">
            {!isFinalized ? (
              <>
                <button
                  onClick={handleSaveDraft}
                  className="flex items-center gap-2 px-3.5 py-2 bg-white border border-[#ded9cf] hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-2xs"
                >
                  <Save className="w-4 h-4 text-slate-500" />
                  Save Draft
                </button>

                <button
                  onClick={handleFinalizeAttendance}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Finalize & Lock
                </button>
              </>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
                <Lock className="w-4 h-4 text-emerald-600" />
                Attendance Locked
              </span>
            )}
          </div>
        )}
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-2 text-xs font-semibold ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCheck className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      {visibleTabs.length > 1 && (
        <div className="flex border-b border-[#ded9cf] gap-2 sm:gap-6 overflow-x-auto">
          {visibleTabs.includes('lecture') && (
            <button
              onClick={() => setActiveTab('lecture')}
              className={`pb-3 text-xs sm:text-sm font-bold whitespace-nowrap transition flex items-center gap-2 ${
                activeTab === 'lecture'
                  ? 'border-b-2 border-emerald-600 text-emerald-800'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              Classroom Lecture Attendance
            </button>
          )}

          {visibleTabs.includes('evening-study') && (
            <button
              onClick={() => setActiveTab('evening-study')}
              className={`pb-3 text-xs sm:text-sm font-bold whitespace-nowrap transition flex items-center gap-2 ${
                activeTab === 'evening-study'
                  ? 'border-b-2 border-emerald-600 text-emerald-800'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Evening Study Roster
            </button>
          )}

          {visibleTabs.includes('hostel-rollcall') && (
            <button
              onClick={() => setActiveTab('hostel-rollcall')}
              className={`pb-3 text-xs sm:text-sm font-bold whitespace-nowrap transition flex items-center gap-2 ${
                activeTab === 'hostel-rollcall'
                  ? 'border-b-2 border-emerald-600 text-emerald-800'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Moon className="w-4 h-4" />
              Hostel Night Roll-Call
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: CLASSROOM LECTURE ATTENDANCE */}
      {/* ========================================================================= */}
      {activeTab === 'lecture' && (
        <div className="space-y-6">
          {/* Lecture Metadata Card */}
          {lectureDetails && (
            <div className="bg-[#fdfcfb] rounded-2xl p-5 border border-[#ded9cf] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col items-center justify-center font-bold text-emerald-900 shrink-0">
                  <span className="text-[9px] uppercase font-bold text-emerald-700">Period</span>
                  <span className="text-base font-extrabold">2</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm font-heading">
                    {lectureDetails.subject_name || 'Physics'} • {lectureDetails.class_name} Section {lectureDetails.section_name} ({lectureDetails.batch_name})
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-3">
                    <span>
                      Room: <strong>{lectureDetails.room_number || 'Room 201'}</strong> (Floor {lectureDetails.floor || 2})
                    </span>
                    <span>Date: <strong>{lectureDetails.date || 'Today'}</strong></span>
                    <span>Status: <strong className={isFinalized ? 'text-emerald-700' : 'text-amber-600'}>{isFinalized ? 'Finalized' : 'Active Marking'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Real-time Stats */}
              <div className="flex items-center gap-2">
                <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-center">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">Present</span>
                  <span className="text-sm font-extrabold text-emerald-900 font-heading">{presentCount}</span>
                </div>
                <div className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-center">
                  <span className="text-[10px] text-rose-700 font-bold uppercase block">Absent</span>
                  <span className="text-sm font-extrabold text-rose-900 font-heading">{absentCount}</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-center">
                  <span className="text-[10px] text-amber-700 font-bold uppercase block">Late</span>
                  <span className="text-sm font-extrabold text-amber-900 font-heading">{lateCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Marking Actions Bar */}
          <div className="bg-[#fdfcfb] p-4 rounded-2xl border border-[#ded9cf] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-600 mr-1">Quick Mark:</span>
              <button
                type="button"
                disabled={isFinalized}
                onClick={() => handleMarkAll('PRESENT')}
                className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                Mark All Present
              </button>
              <button
                type="button"
                disabled={isFinalized}
                onClick={() => handleMarkAll('ABSENT')}
                className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                Mark All Absent
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student or roll no..."
                className="w-full pl-9 pr-4 py-1.5 bg-white border border-[#ded9cf] rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Student Attendance List */}
          <div className="bg-white rounded-3xl border border-[#ded9cf] overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-[#ded9cf] flex items-center justify-between bg-[#fdfcfb]">
              <span className="text-xs font-bold text-slate-800">
                Class Attendance Roster ({filteredStudents.length} Students)
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">
                Click P / A / L to toggle individual student attendance
              </span>
            </div>

            {isLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                No students found for this lecture session.
              </div>
            ) : (
              <div className="divide-y divide-[#f2eee6]">
                {filteredStudents.map((s, idx) => (
                  <div
                    key={s.id}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 font-mono shrink-0">
                        {s.roll_number || idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs sm:text-sm font-heading">
                          {s.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Adm: <span className="font-mono">{s.admission_number}</span> • {s.residential_status}
                        </div>
                      </div>
                    </div>

                    {/* Multi-Status Manual Toggle */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isFinalized}
                        onClick={() => handleStatusToggle(s.id, 'PRESENT')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                          s.status === 'PRESENT'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-800'
                        }`}
                      >
                        P (Present)
                      </button>

                      <button
                        type="button"
                        disabled={isFinalized}
                        onClick={() => handleStatusToggle(s.id, 'ABSENT')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                          s.status === 'ABSENT'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-800'
                        }`}
                      >
                        A (Absent)
                      </button>

                      <button
                        type="button"
                        disabled={isFinalized}
                        onClick={() => handleStatusToggle(s.id, 'LATE')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                          s.status === 'LATE'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-800'
                        }`}
                      >
                        L (Late)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EVENING STUDY ATTENDANCE */}
      {/* ========================================================================= */}
      {activeTab === 'evening-study' && (
        <div className="space-y-6">
          <div className="bg-[#fdfcfb] rounded-2xl p-5 border border-[#ded9cf] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 font-heading flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                Evening Study Attendance Session
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mandatory supervised evening study hours (06:30 PM - 08:30 PM) for residential students.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white border border-[#ded9cf] rounded-xl px-3 py-1.5 text-xs">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={eveningDate}
                onChange={(e) => setEveningDate(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#ded9cf] overflow-hidden">
            <div className="p-4 border-b border-[#ded9cf] flex items-center justify-between bg-[#fdfcfb]">
              <span className="text-xs font-bold text-slate-800">
                Evening Study Roster ({eveningRoster.length} Hostellers)
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">
                Supervised by Residential Warden / Floor Staff
              </span>
            </div>

            {eveningLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              </div>
            ) : eveningRoster.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                No evening study session records for {eveningDate}.
              </div>
            ) : (
              <div className="divide-y divide-[#f2eee6]">
                {eveningRoster.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center">
                        {s.hostel_room_number || 'H'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">{s.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {s.class_name} Section {s.section_name} • {s.hostel_block_name || 'Hostel'} (Room {s.hostel_room_number})
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEveningStatus(s.id, 'PRESENT')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          s.status === 'PRESENT'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-emerald-100'
                        }`}
                      >
                        Present
                      </button>
                      <button
                        onClick={() => handleEveningStatus(s.id, 'ABSENT')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          s.status === 'ABSENT'
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-rose-100'
                        }`}
                      >
                        Absent
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HOSTEL NIGHT ROLL-CALL */}
      {/* ========================================================================= */}
      {activeTab === 'hostel-rollcall' && (
        <div className="space-y-6">
          <div className="bg-[#fdfcfb] rounded-2xl p-5 border border-[#ded9cf] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 font-heading flex items-center gap-2">
                <Moon className="w-5 h-5 text-indigo-600" />
                Daily Hostel Night Roll-Call
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Night headcount at 09:30 PM across all hostel blocks and floors.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white border border-[#ded9cf] rounded-xl px-3 py-1.5 text-xs">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={hostelDate}
                onChange={(e) => setHostelDate(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#ded9cf] overflow-hidden">
            <div className="p-4 border-b border-[#ded9cf] flex items-center justify-between bg-[#fdfcfb]">
              <span className="text-xs font-bold text-slate-800">
                Night Roll-Call Roster ({hostelRollCall.length} Residents)
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">
                Statuses: Present • Outpass • Medical • Late Return
              </span>
            </div>

            {hostelLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              </div>
            ) : hostelRollCall.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                No hostel roll-call records for {hostelDate}.
              </div>
            ) : (
              <div className="divide-y divide-[#f2eee6]">
                {hostelRollCall.map((r) => (
                  <div
                    key={r.id || r.student_id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm font-heading">
                        {r.student_name || r.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {r.block_name || 'Block A'} • Room {r.room_number} (Bed {r.bed_number || '1'})
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {['PRESENT', 'OUTPASS', 'MEDICAL', 'LATE_RETURN'].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleHostelStatus(r.room_id, r.student_id, st)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition ${
                            r.status === st
                              ? st === 'PRESENT'
                                ? 'bg-emerald-600 text-white'
                                : st === 'OUTPASS'
                                ? 'bg-purple-600 text-white'
                                : st === 'MEDICAL'
                                ? 'bg-rose-600 text-white'
                                : 'bg-amber-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {st.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
