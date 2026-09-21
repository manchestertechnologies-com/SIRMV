import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CameraModal } from '../components/CameraModal';
import {
  Layers,
  Clock,
  MapPin,
  Camera,
  CheckCircle2,
  AlertCircle,
  Video,
  BookOpen,
  UserCheck,
  UserX,
  Play,
  CheckSquare,
  Edit3,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface FloorAttenderDashboardProps {
  onOpenAttendance?: (lectureSessionId: string) => void;
  onOpenOnePageRecord?: (lectureSessionId: string) => void;
}

export const FloorAttenderDashboard: React.FC<FloorAttenderDashboardProps> = ({
  onOpenAttendance,
  onOpenOnePageRecord
}) => {
  const { user, currentBranch } = useAuth();
  const [floor, setFloor] = useState<number>(2);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Quick Action Modal for Room / Lecture
  const [selectedLecture, setSelectedLecture] = useState<any | null>(null);
  const [teacherTimeIn, setTeacherTimeIn] = useState('');
  const [lectureStartTime, setLectureStartTime] = useState('');
  const [lectureEndTime, setLectureEndTime] = useState('');
  const [teacherTimeOut, setTeacherTimeOut] = useState('');
  const [teacherStatus, setTeacherStatus] = useState('PRESENT');
  const [chapter, setChapter] = useState('');
  const [concept, setConcept] = useState('');
  const [topicTaught, setTopicTaught] = useState('');
  const [classroomPhotoUrl, setClassroomPhotoUrl] = useState('');
  const [recordingUrl, setRecordingUrl] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Camera modal state
  const [showCamera, setShowCamera] = useState(false);

  const loadFloorDashboard = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<any>(
        `/floor-attender/dashboard?branch_id=${currentBranch?.id || ''}&floor=${floor}&date=${date}`
      );
      setDashboardData(res);
    } catch (err: any) {
      console.error('Failed to load floor attender dashboard', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFloorDashboard();
  }, [floor, date, currentBranch]);

  const openActionModal = (item: any) => {
    setSelectedLecture(item);
    const session = item.session;
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    setTeacherTimeIn(session?.teacher_time_in || nowTime);
    setLectureStartTime(session?.lecture_start_time || nowTime);
    setLectureEndTime(session?.lecture_end_time || '');
    setTeacherTimeOut(session?.teacher_time_out || '');
    setTeacherStatus(session?.teacher_status || (item.isAbsent ? 'SUBSTITUTE' : 'PRESENT'));
    setChapter(session?.chapter || 'Chapter 11: Thermodynamics');
    setConcept(session?.concept || 'Second Law & Heat Engines');
    setTopicTaught(session?.topic_taught || 'Carnot cycle efficiency and isothermal expansion');
    setClassroomPhotoUrl(session?.classroom_photo_url || '');
    setRecordingUrl(session?.recording_url || '');
    setRemarks(session?.remarks || '');
  };

  const handleSaveLectureActivity = async () => {
    if (!selectedLecture) return;
    setIsSaving(true);
    try {
      const entry = selectedLecture.timetableEntry;
      const res = await apiFetch<any>('/floor-attender/lecture-session', {
        method: 'POST',
        body: JSON.stringify({
          id: selectedLecture.session?.id,
          timetable_entry_id: entry.id,
          date,
          class_id: entry.class_id,
          section_id: entry.section_id,
          batch_id: entry.batch_id,
          subject_id: entry.subject_id,
          teacher_id: entry.teacher_id,
          substitute_teacher_id: selectedLecture.substituteAssignment?.substitute_teacher_id || null,
          room_id: entry.room_id,
          floor: entry.floor,
          scheduled_start: entry.start_time,
          scheduled_end: entry.end_time,
          teacher_time_in: teacherTimeIn,
          lecture_start_time: lectureStartTime,
          lecture_end_time: lectureEndTime,
          teacher_time_out: teacherTimeOut,
          teacher_status: teacherStatus,
          classroom_photo_url: classroomPhotoUrl,
          recording_url: recordingUrl,
          remarks,
          chapter,
          concept,
          topic_taught: topicTaught
        })
      });

      setSelectedLecture(null);
      loadFloorDashboard();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN CLASS':
      case 'PRESENT':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[11px]">IN CLASS</span>;
      case 'SUBSTITUTE':
        return <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-0.5 rounded-full font-bold text-[11px]">SUBSTITUTE</span>;
      case 'ABSENT':
      case 'TEACHER ABSENT':
        return <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full font-bold text-[11px]">TEACHER ABSENT</span>;
      case 'LATE':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold text-[11px]">TEACHER LATE</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full font-bold text-[11px]">PENDING</span>;
    }
  };

  const stats = dashboardData?.stats || {};
  const lectures = dashboardData?.lectures || [];

  return (
    <div className="space-y-6">
      {/* Operations Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">Floor Attender Operational Dashboard</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quick 1-screen classroom verification, faculty check-in/out, photo capture and lecture logging.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Floor Selector Pills */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {[1, 2, 3].map((f) => (
              <button
                key={f}
                onClick={() => setFloor(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                  floor === f ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Floor {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Real-time Status KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Scheduled Classes</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalClasses || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Classes In Session</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.classesStarted || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Teachers Absent</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{stats.teachersAbsent || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Attendance Pending</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{stats.attendancePending || 0}</div>
        </div>
      </div>

      {/* Classroom Activity Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            Floor {floor} Classrooms & Lecture Status ({dashboardData?.dayOfWeek}, {date})
          </h3>
          <span className="text-xs text-slate-400">Click any classroom to record activity or capture photo</span>
        </div>

        <div className="divide-y divide-slate-100">
          {lectures.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No scheduled classes found on Floor {floor} for {dashboardData?.dayOfWeek}.
            </div>
          ) : (
            lectures.map((item: any, idx: number) => {
              const entry = item.timetableEntry;
              const session = item.session;
              const isStarted = !!session?.teacher_time_in;
              const isFinalized = session?.finalization_status === 'COMPLETED';

              return (
                <div
                  key={idx}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-start gap-4">
                    {/* Room Badge */}
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] uppercase font-bold text-indigo-500">Room</span>
                      <span className="text-lg font-extrabold text-indigo-950">{entry.room_number}</span>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">{entry.subject_name}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                          {entry.class_name} • {entry.section_name} ({entry.batch_name})
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          Period {entry.period_number} ({entry.start_time} - {entry.end_time})
                        </span>
                        {getStatusBadge(item.computedTeacherStatus)}
                      </div>

                      <div className="text-xs text-slate-600 mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1">
                        <span>
                          Faculty: <strong className="text-slate-800">{entry.teacher_name}</strong>
                          {item.substituteAssignment && (
                            <span className="text-purple-700 ml-1 font-semibold">
                              ➔ Sub: {item.substituteAssignment.substitute_name}
                            </span>
                          )}
                        </span>

                        {isStarted && (
                          <span className="text-emerald-700 font-medium">
                            Time In: {session.teacher_time_in} • Start: {session.lecture_start_time}
                          </span>
                        )}

                        {session?.concept && (
                          <span className="text-slate-500 truncate max-w-xs">
                            Concept: <em className="text-slate-700">{session.concept}</em>
                          </span>
                        )}
                      </div>

                      {/* Attendance indicator */}
                      {session?.total_students > 0 && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span className="font-semibold text-slate-700">Attendance:</span>
                          <span className="text-emerald-700 font-bold">{session.present_students} Present</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-rose-700 font-bold">{session.absent_students} Absent</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-amber-700 font-bold">{session.late_students} Late</span>
                          {isFinalized && (
                            <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                              FINALIZED
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operational Quick Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                    <button
                      onClick={() => openActionModal(item)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Record Activity
                    </button>

                    {session?.id && onOpenAttendance && (
                      <button
                        onClick={() => onOpenAttendance(session.id)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Take Attendance
                      </button>
                    )}

                    {session?.id && onOpenOnePageRecord && (
                      <button
                        onClick={() => onOpenOnePageRecord(session.id)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                      >
                        1-Page Record
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* QUICK OPERATIONAL MODAL: Record Lecture Activity */}
      {selectedLecture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  Record Classroom Activity • Room {selectedLecture.timetableEntry.room_number}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedLecture.timetableEntry.subject_name} • {selectedLecture.timetableEntry.class_name} {selectedLecture.timetableEntry.section_name} ({selectedLecture.timetableEntry.batch_name})
                </p>
              </div>
              <button onClick={() => setSelectedLecture(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Timing Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Teacher Time In</label>
                  <input
                    type="time"
                    value={teacherTimeIn}
                    onChange={(e) => setTeacherTimeIn(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Lecture Start</label>
                  <input
                    type="time"
                    value={lectureStartTime}
                    onChange={(e) => setLectureStartTime(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Lecture End</label>
                  <input
                    type="time"
                    value={lectureEndTime}
                    onChange={(e) => setLectureEndTime(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Teacher Time Out</label>
                  <input
                    type="time"
                    value={teacherTimeOut}
                    onChange={(e) => setTeacherTimeOut(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-semibold"
                  />
                </div>
              </div>

              {/* Teacher Status */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Faculty Status</label>
                <div className="grid grid-cols-4 gap-2">
                  {['PRESENT', 'ABSENT', 'LATE', 'SUBSTITUTE'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTeacherStatus(st)}
                      className={`py-2 rounded-xl font-bold transition border ${
                        teacherStatus === st
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Concept Taught */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Concept & Topic Taught</label>
                <input
                  type="text"
                  placeholder="Chapter (e.g. Chapter 11: Thermodynamics)"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                />
                <input
                  type="text"
                  placeholder="Core Concept (e.g. Carnot Cycle & Heat Engine Efficiency)"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                />
                <textarea
                  rows={2}
                  placeholder="Detailed Topic / Work covered in class..."
                  value={topicTaught}
                  onChange={(e) => setTopicTaught(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                />
              </div>

              {/* Classroom Photo Capture */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Classroom Verification Photo</label>
                <div className="flex items-center gap-3">
                  {classroomPhotoUrl ? (
                    <div className="relative w-24 h-16 rounded-xl overflow-hidden border border-slate-200">
                      <img src={classroomPhotoUrl} alt="Classroom" className="w-full h-full object-cover" />
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-semibold transition border border-indigo-200"
                  >
                    <Camera className="w-4 h-4" />
                    {classroomPhotoUrl ? 'Retake Photo' : 'Open Camera & Capture Photo'}
                  </button>
                </div>
              </div>

              {/* Class Video Recording Link */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Class Recording URL (For Absent Students)</label>
                <input
                  type="text"
                  placeholder="e.g. https://institution-storage.sirmv.edu.in/recordings/phy_thermo_2026.mp4"
                  value={recordingUrl}
                  onChange={(e) => setRecordingUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Floor Attender Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. All students attentive. Smartboard used for derivations."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedLecture(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveLectureActivity}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {isSaving ? 'Saving Activity...' : 'Save Lecture Record'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        title="Capture Classroom Photograph"
        uploadEndpoint="/floor-attender/upload-photo"
        onPhotoCaptured={(url) => setClassroomPhotoUrl(url)}
      />
    </div>
  );
};
