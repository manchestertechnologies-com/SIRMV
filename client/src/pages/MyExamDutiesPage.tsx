import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { ClipboardList, DoorOpen, Clock, Users, Eye } from 'lucide-react';

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
}

interface SeatRow {
  student_name: string;
  register_number: string;
  class_name: string;
  section_name: string;
  bench_number: number;
  seat_number: number;
}

export const MyExamDutiesPage: React.FC = () => {
  const [duties, setDuties] = useState<Duty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [seatingFor, setSeatingFor] = useState<Duty | null>(null);
  const [seating, setSeating] = useState<SeatRow[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<{ duties: Duty[] }>('/exam-management/my-duties');
        setDuties(res.duties || []);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const viewSeating = async (duty: Duty) => {
    setSeatingFor(duty);
    const res = await apiFetch<{ seating: any[] }>(`/exam-management/sessions/${duty.session_id}/seating`);
    setSeating((res.seating || []).filter((s) => s.room_number === duty.room_number));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-violet-600" />
          <h1 className="text-xl font-bold text-slate-900 font-heading">My Exam Duties</h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">Your published invigilation assignments.</p>
      </div>

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
              <button onClick={() => viewSeating(d)} className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 mt-1">
                <Eye className="w-3.5 h-3.5" /> View Student Seating
              </button>
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
    </div>
  );
};
