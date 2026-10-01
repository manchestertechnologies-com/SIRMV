import React from 'react';
import { X, Printer, CheckCircle2, XCircle, UserCircle2 } from 'lucide-react';

// A downloadable "seat slip" for one student, opened by clicking their seat
// in the 3D seating view. Uses the same client-side window.print() +
// .no-print convention as ExamReports.tsx — there is no server-side PDF
// library in this app, so "download" is just the browser's print-to-PDF on
// this panel. Rendered inline (not a fixed-position overlay) so it behaves
// like every other printable view in the app instead of fighting print
// layout with a floating dialog.
export interface SeatDetailData {
  studentName: string;
  registerNumber: string;
  className: string;
  sectionName: string;
  examName: string;
  subjectName: string;
  examDate: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  floor: number;
  benchNumber: number;
  seatNumber: number;
  attendanceStatus?: 'PENDING' | 'PRESENT' | 'ABSENT' | null;
  markedByName?: string | null;
  markedAt?: string | null;
}

const Row: React.FC<{ label: string; value: React.ReactNode; bold?: boolean }> = ({ label, value, bold }) => (
  <div className="flex justify-between gap-3 py-1">
    <span className="text-slate-400">{label}</span>
    <span className={bold ? 'font-bold text-slate-900' : 'text-slate-700'}>{value}</span>
  </div>
);

export const StudentSeatDetailPanel: React.FC<{
  data: SeatDetailData;
  onClose: () => void;
  canMarkAttendance?: boolean;
  onMark?: (status: 'PRESENT' | 'ABSENT') => void;
  marking?: boolean;
  onViewProfile?: () => void;
}> = ({ data, onClose, canMarkAttendance, onMark, marking, onViewProfile }) => {
  const statusColor =
    data.attendanceStatus === 'PRESENT' ? 'text-emerald-600' :
    data.attendanceStatus === 'ABSENT' ? 'text-rose-600' : 'text-slate-400';

  return (
    <div className="bg-white rounded-2xl border-2 border-violet-200 shadow-xs p-5 relative">
      <button onClick={onClose} className="no-print absolute top-3 right-3 p-1.5 rounded-lg hover:bg-slate-100" aria-label="Close">
        <X className="w-4 h-4 text-slate-500" />
      </button>

      <div className="text-center border-b border-slate-200 pb-3 mb-3">
        <div className="font-bold text-slate-900">SIR MV PU College</div>
        <div className="text-xs text-slate-500">Exam Seat Slip</div>
      </div>

      <div className="max-w-sm mx-auto text-sm divide-y divide-slate-100">
        <Row label="Student" value={data.studentName} bold />
        <Row label="Register No." value={data.registerNumber} />
        <Row label="Class / Section" value={`${data.className} ${data.sectionName}`} />
        <Row label="Exam" value={`${data.examName} — ${data.subjectName}`} />
        <Row label="Date / Time" value={`${data.examDate} · ${data.startTime}–${data.endTime}`} />
        <Row label="Room / Floor" value={`Room ${data.roomNumber}, Floor ${data.floor}`} />
        <Row label="Bench / Seat" value={`Bench ${data.benchNumber}, Seat ${data.seatNumber}`} />
        {data.attendanceStatus && (
          <Row label="Attendance" value={<span className={`font-bold ${statusColor}`}>{data.attendanceStatus}</span>} />
        )}
        {data.markedByName && <Row label="Marked By" value={data.markedByName} />}
        {data.markedAt && <Row label="Marked At" value={new Date(data.markedAt).toLocaleString()} />}
      </div>

      {canMarkAttendance && (
        <div className="no-print flex gap-2 mt-4 max-w-sm mx-auto">
          <button
            disabled={marking}
            onClick={() => onMark?.('PRESENT')}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Present
          </button>
          <button
            disabled={marking}
            onClick={() => onMark?.('ABSENT')}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" /> Mark Absent
          </button>
        </div>
      )}

      <div className="no-print flex gap-2 mt-3 max-w-sm mx-auto">
        {onViewProfile && (
          <button
            onClick={onViewProfile}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200"
          >
            <UserCircle2 className="w-3.5 h-3.5" /> View 360° Profile
          </button>
        )}
        <button
          onClick={() => window.print()}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
        >
          <Printer className="w-3.5 h-3.5" /> Print / Download
        </button>
      </div>
    </div>
  );
};
