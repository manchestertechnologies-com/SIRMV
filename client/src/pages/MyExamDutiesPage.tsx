import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { ClipboardList, DoorOpen, Clock, Users, Eye, ClipboardCheck, CheckCircle2, XCircle } from 'lucide-react';
import { ExamSeatingView3D, SeatInfo } from '../components/ExamSeatingView3D';
import { StudentSeatDetailPanel, SeatDetailData } from '../components/StudentSeatDetailPanel';

interface Duty {
  session_id: string;
  room_id: string;
  room_number: string;
  floor: number;
  exam_date: string;
  start_time: string;
  end_time: string;
  reporting_time: string | null;
  subject_name: string;
  exam_name: string;
  pu_level: string;
  instructions: string | null;
  benches: number;
  seats_per_bench: number;
}

interface SeatRow {
  id: string;
  student_id: string;
  student_name: string;
  register_number: string;
  class_id: string;
  section_id: string;
  class_name: string;
  section_name: string;
  bench_number: number;
  seat_number: number;
  room_number: string;
  attendance_status: 'PENDING' | 'PRESENT' | 'ABSENT';
  marked_by_name: string | null;
  marked_at: string | null;
}

// Invigilator-facing: their published duty list, a read-only seating table,
// and (new) a 3D take-attendance view for the room/session they're
// invigilating. Marking attendance here calls the server-side-authorized
// attendance endpoint, which independently re-checks that this teacher is
// actually the assigned invigilator for that room/session — the client
// never gets to just assert it.
export const MyExamDutiesPage: React.FC = () => {
  const [duties, setDuties] = useState<Duty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [seatingFor, setSeatingFor] = useState<Duty | null>(null);
  const [seating, setSeating] = useState<SeatRow[]>([]);
  const [attendanceFor, setAttendanceFor] = useState<Duty | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<SeatRow | null>(null);
  const [marking, setMarking] = useState(false);
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadDuties = async () => {
    try {
      const res = await apiFetch<{ duties: Duty[] }>('/exam-management/my-duties');
      setDuties(res.duties || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadDuties(); }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3500);
    return () => clearTimeout(t);
  }, [flash]);

  const viewSeating = async (duty: Duty) => {
    setAttendanceFor(null);
    setSeatingFor(duty);
    const res = await apiFetch<{ seating: SeatRow[] }>(`/exam-management/sessions/${duty.session_id}/seating`);
    setSeating((res.seating || []).filter((s) => s.room_number === duty.room_number));
  };

  const openAttendance = async (duty: Duty) => {
    setSeatingFor(null);
    setSelectedSeat(null);
    setAttendanceFor(duty);
    const res = await apiFetch<{ seating: SeatRow[] }>(`/exam-management/sessions/${duty.session_id}/seating`);
    setSeating((res.seating || []).filter((s) => s.room_number === duty.room_number));
  };

  const refreshAttendance = async (duty: Duty) => {
    const res = await apiFetch<{ seating: SeatRow[] }>(`/exam-management/sessions/${duty.session_id}/seating`);
    setSeating((res.seating || []).filter((s) => s.room_number === duty.room_number));
  };

  const markSeat = async (seat: SeatRow, status: 'PRESENT' | 'ABSENT') => {
    if (!attendanceFor) return;
    setMarking(true);
    try {
      await apiFetch(`/exam-management/sessions/${attendanceFor.session_id}/attendance`, {
        method: 'POST',
        body: JSON.stringify({ allocation_id: seat.id, status })
      });
      // Optimistic local update, then a real refetch so marked_by/marked_at
      // (and any other invigilator's concurrent marks) stay accurate.
      setSeating((prev) => prev.map((s) => (s.id === seat.id ? { ...s, attendance_status: status } : s)));
      setSelectedSeat((prev) => (prev && prev.id === seat.id ? { ...prev, attendance_status: status } : prev));
      setFlash({ type: 'success', message: `${seat.student_name} marked ${status.toLowerCase()}.` });
      await refreshAttendance(attendanceFor);
    } catch (err: any) {
      setFlash({ type: 'error', message: err.message || 'Could not save attendance.' });
    } finally {
      setMarking(false);
    }
  };

  const markAllPresent = async () => {
    if (!attendanceFor) return;
    const updates = seating.filter((s) => s.attendance_status === 'PENDING').map((s) => ({ allocation_id: s.id, status: 'PRESENT' as const }));
    if (updates.length === 0) return;
    setMarking(true);
    try {
      await apiFetch(`/exam-management/sessions/${attendanceFor.session_id}/attendance/bulk`, {
        method: 'POST',
        body: JSON.stringify({ room_id: attendanceFor.room_id, updates })
      });
      setFlash({ type: 'success', message: `${updates.length} student(s) marked present. Flip any absentees individually.` });
      await refreshAttendance(attendanceFor);
    } catch (err: any) {
      setFlash({ type: 'error', message: err.message || 'Could not save attendance.' });
    } finally {
      setMarking(false);
    }
  };

  const seatInfos: SeatInfo[] = seating.map((s) => ({
    allocationId: s.id,
    benchNumber: s.bench_number,
    seatNumber: s.seat_number,
    studentId: s.student_id,
    studentName: s.student_name,
    registerNumber: s.register_number,
    classId: s.class_id,
    sectionId: s.section_id,
    className: s.class_name,
    sectionName: s.section_name,
    attendanceStatus: s.attendance_status,
    markedByName: s.marked_by_name,
    markedAt: s.marked_at
  }));

  const presentCount = seating.filter((s) => s.attendance_status === 'PRESENT').length;
  const absentCount = seating.filter((s) => s.attendance_status === 'ABSENT').length;
  const pendingCount = seating.filter((s) => s.attendance_status === 'PENDING').length;

  const selectedDetail: SeatDetailData | null = selectedSeat && attendanceFor ? {
    studentName: selectedSeat.student_name,
    registerNumber: selectedSeat.register_number,
    className: selectedSeat.class_name,
    sectionName: selectedSeat.section_name,
    examName: attendanceFor.exam_name,
    subjectName: attendanceFor.subject_name,
    examDate: attendanceFor.exam_date,
    startTime: attendanceFor.start_time,
    endTime: attendanceFor.end_time,
    roomNumber: attendanceFor.room_number,
    floor: attendanceFor.floor,
    benchNumber: selectedSeat.bench_number,
    seatNumber: selectedSeat.seat_number,
    attendanceStatus: selectedSeat.attendance_status,
    markedByName: selectedSeat.marked_by_name,
    markedAt: selectedSeat.marked_at
  } : null;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-violet-600" />
          <h1 className="text-xl font-bold text-slate-900 font-heading">My Exam Duties</h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">Your published invigilation assignments.</p>
      </div>

      {flash && (
        <div className={`no-print px-4 py-2 rounded-xl text-xs font-semibold ${flash.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
          {flash.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 text-center text-slate-400 text-sm py-8">Loading duties...</div>
        ) : duties.length === 0 ? (
          <div className="col-span-2 text-center text-slate-400 text-sm py-8">No published exam duties yet.</div>
        ) : (
          duties.map((d) => (
            <div key={`${d.session_id}-${d.room_id}`} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{d.exam_name}</span>
                <span className="text-[11px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">{d.pu_level}</span>
              </div>
              <div className="text-xs text-slate-600">{d.subject_name} — {d.exam_date}</div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {d.start_time}–{d.end_time}</span>
                <span className="flex items-center gap-1"><DoorOpen className="w-3.5 h-3.5" /> Room {d.room_number}, Floor {d.floor}</span>
              </div>
              {d.reporting_time && <div className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1">Report by {d.reporting_time}</div>}
              {d.instructions && <div className="text-[11px] text-slate-500 italic">{d.instructions}</div>}
              <div className="flex items-center gap-3 pt-1">
                <button onClick={() => viewSeating(d)} className="flex items-center gap-1.5 text-xs font-semibold text-violet-600">
                  <Eye className="w-3.5 h-3.5" /> View Student Seating
                </button>
                <button onClick={() => openAttendance(d)} className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <ClipboardCheck className="w-3.5 h-3.5" /> Take Attendance
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {seatingFor && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-600" /> Room {seatingFor.room_number} — {seatingFor.subject_name}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead><tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2 px-4">Bench</th><th className="py-2 px-4">Seat</th><th className="py-2 px-4">Student</th><th className="py-2 px-4">Reg No.</th><th className="py-2 px-4">Batch</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {seating.sort((a, b) => a.seat_number - b.seat_number).map((s, i) => (
                  <tr key={i}>
                    <td className="py-2 px-4">{s.bench_number}</td>
                    <td className="py-2 px-4 font-bold text-violet-700">{s.seat_number}</td>
                    <td className="py-2 px-4 font-bold text-slate-900">{s.student_name}</td>
                    <td className="py-2 px-4 text-slate-500">{s.register_number}</td>
                    <td className="py-2 px-4">{s.class_name} {s.section_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {attendanceFor && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-emerald-600" /> Attendance — Room {attendanceFor.room_number}, {attendanceFor.subject_name}
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> {presentCount} Present</span>
              <span className="flex items-center gap-1 text-rose-600"><XCircle className="w-3.5 h-3.5" /> {absentCount} Absent</span>
              <span className="text-slate-400">{pendingCount} Unmarked</span>
              <button
                onClick={markAllPresent}
                disabled={marking || pendingCount === 0}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40"
              >
                Mark All Present
              </button>
            </div>
          </div>
          <div className="p-4 text-[11px] text-slate-500 border-b border-slate-100">
            Tap a seat with a student to mark them present or absent. Batch (class/section) colors match the legend below; marked-absent seats turn red.
          </div>
          <div className="p-4">
            <ExamSeatingView3D
              benches={attendanceFor.benches}
              seatsPerBench={attendanceFor.seats_per_bench}
              seats={seatInfos}
              showAttendance
              onSeatClick={(seat) => {
                const row = seating.find((s) => s.id === seat.allocationId);
                if (row) setSelectedSeat(row);
              }}
            />
          </div>
          {selectedDetail && (
            <div className="p-4 border-t border-slate-100">
              <StudentSeatDetailPanel
                data={selectedDetail}
                onClose={() => setSelectedSeat(null)}
                canMarkAttendance
                marking={marking}
                onMark={(status) => selectedSeat && markSeat(selectedSeat, status)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
