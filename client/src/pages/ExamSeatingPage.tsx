import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Armchair, Clock, DoorOpen, Info } from 'lucide-react';

interface SeatingEntry {
  student_id?: string;
  student_name?: string;
  exam_name: string;
  pu_level: string;
  instructions: string | null;
  exam_date: string;
  start_time: string;
  end_time: string;
  reporting_time: string | null;
  subject_name: string;
  room_number: string;
  floor: number;
  bench_number: number;
  seat_number: number;
}

// Shown to STUDENT (their own seating) and PARENT (their child's seating) —
// the endpoint called differs, but both only ever return the caller's own
// (or their own child's) data; there is no student_id parameter to spoof.
export const ExamSeatingPage: React.FC = () => {
  const { user } = useAuth();
  const [seating, setSeating] = useState<SeatingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isParent = user?.role === 'PARENT';

  useEffect(() => {
    (async () => {
      try {
        const endpoint = isParent ? '/exam-management/child-seating' : '/exam-management/my-seating';
        const res = await apiFetch<{ seating: SeatingEntry[] }>(endpoint);
        setSeating(res.seating || []);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isParent]);

  const grouped = seating.reduce<Record<string, SeatingEntry[]>>((acc, s) => {
    const key = s.student_name ? `${s.exam_name} — ${s.student_name}` : s.exam_name;
    (acc[key] = acc[key] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <Armchair className="w-6 h-6 text-violet-600" />
          <h1 className="text-xl font-bold text-slate-900 font-heading">{isParent ? "Ward's Exam Seating" : 'My Exam Seating'}</h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">Room, floor and seat for every published exam.</p>
      </div>

      {isLoading ? (
        <div className="text-center text-slate-400 text-sm py-8">Loading...</div>
      ) : seating.length === 0 ? (
        <div className="text-center text-slate-400 text-sm py-8">No published exam seating yet.</div>
      ) : (
        Object.entries(grouped).map(([groupKey, rows]) => (
          <div key={groupKey} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900 flex items-center justify-between">
              <span>{groupKey}</span>
              <span className="text-[11px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">{rows[0].pu_level}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {rows.map((r, i) => (
                <div key={i} className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div><span className="text-slate-400 block">Subject</span><span className="font-semibold text-slate-900">{r.subject_name}</span></div>
                  <div><span className="text-slate-400 block flex items-center gap-1"><Clock className="w-3 h-3" /> Date / Time</span>{r.exam_date} · {r.start_time}–{r.end_time}</div>
                  <div><span className="text-slate-400 block flex items-center gap-1"><DoorOpen className="w-3 h-3" /> Room / Floor</span>Room {r.room_number}, Floor {r.floor}</div>
                  <div><span className="text-slate-400 block flex items-center gap-1"><Armchair className="w-3 h-3" /> Bench / Seat</span>Bench {r.bench_number}, Seat {r.seat_number}</div>
                  {r.reporting_time && <div className="col-span-2 sm:col-span-4 text-amber-700 bg-amber-50 rounded-lg px-2 py-1">Report by {r.reporting_time}</div>}
                  {r.instructions && (
                    <div className="col-span-2 sm:col-span-4 flex items-start gap-1.5 text-slate-500 italic">
                      <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {r.instructions}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
