import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../services/api';
import { Printer, FileText, Users, LayoutGrid } from 'lucide-react';

type ReportType = 'INVIGILATOR' | 'SEATING' | 'ROOM_CHART';

interface InvigilatorRow {
  exam_date: string; start_time: string; end_time: string; reporting_time: string | null;
  subject_name: string; room_number: string; floor: number; teacher_name: string; department_name: string | null;
}

interface SeatingRow {
  exam_date: string; start_time: string; end_time: string; subject_name: string;
  room_number: string; floor: number; bench_number: number; seat_number: number;
  student_name: string; register_number: string; class_name: string; section_name: string;
}

export const ExamReports: React.FC<{ examId: string }> = ({ examId }) => {
  const [reportType, setReportType] = useState<ReportType>('SEATING');
  const [exam, setExam] = useState<any | null>(null);
  const [invigilatorRows, setInvigilatorRows] = useState<InvigilatorRow[]>([]);
  const [seatingRows, setSeatingRows] = useState<SeatingRow[]>([]);
  const [roomFilter, setRoomFilter] = useState('ALL');
  const [batchFilter, setBatchFilter] = useState('ALL');

  useEffect(() => {
    (async () => {
      const [invig, seat] = await Promise.all([
        apiFetch<any>(`/exam-management/exams/${examId}/invigilator-report`),
        apiFetch<any>(`/exam-management/exams/${examId}/seating-report`)
      ]);
      setExam(invig.exam);
      setInvigilatorRows(invig.rows || []);
      setSeatingRows(seat.rows || []);
    })();
  }, [examId]);

  const rooms = useMemo(() => [...new Set(seatingRows.map((r) => r.room_number))].sort(), [seatingRows]);
  const batches = useMemo(() => [...new Set(seatingRows.map((r) => `${r.class_name} ${r.section_name}`))].sort(), [seatingRows]);

  const filteredSeating = seatingRows.filter((r) =>
    (roomFilter === 'ALL' || r.room_number === roomFilter) &&
    (batchFilter === 'ALL' || `${r.class_name} ${r.section_name}` === batchFilter)
  );

  const roomChartGroups = useMemo(() => {
    const byRoom = new Map<string, SeatingRow[]>();
    for (const r of seatingRows) {
      const key = `${r.room_number}|${r.floor}`;
      if (!byRoom.has(key)) byRoom.set(key, []);
      byRoom.get(key)!.push(r);
    }
    return [...byRoom.entries()].map(([key, rows]) => {
      const [roomNumber, floor] = key.split('|');
      const byBench = new Map<number, SeatingRow[]>();
      for (const r of rows) {
        if (!byBench.has(r.bench_number)) byBench.set(r.bench_number, []);
        byBench.get(r.bench_number)!.push(r);
      }
      return {
        roomNumber, floor,
        benches: [...byBench.entries()].sort((a, b) => a[0] - b[0]).map(([bench, seats]) => ({
          bench, seats: seats.sort((a, b) => a.seat_number - b.seat_number)
        }))
      };
    });
  }, [seatingRows]);

  if (!exam) return <div className="p-6 text-center text-slate-400 text-xs">Loading reports...</div>;

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <button onClick={() => setReportType('INVIGILATOR')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${reportType === 'INVIGILATOR' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
          <Users className="w-3.5 h-3.5" /> Invigilator Allocation
        </button>
        <button onClick={() => setReportType('SEATING')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${reportType === 'SEATING' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
          <FileText className="w-3.5 h-3.5" /> Student Seating
        </button>
        <button onClick={() => setReportType('ROOM_CHART')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${reportType === 'ROOM_CHART' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
          <LayoutGrid className="w-3.5 h-3.5" /> Room Seating Chart
        </button>

        {reportType === 'SEATING' && (
          <>
            <select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none">
              <option value="ALL">All Rooms</option>
              {rooms.map((r) => <option key={r} value={r}>Room {r}</option>)}
            </select>
            <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none">
              <option value="ALL">All Batches</option>
              {batches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </>
        )}

        <button onClick={() => window.print()} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
          <Printer className="w-3.5 h-3.5" /> Print / Download PDF
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="text-center mb-4 border-b border-slate-200 pb-3">
          <div className="font-bold text-slate-900">SIR MV PU College</div>
          <div className="text-sm font-semibold text-slate-700">{exam.name} — {exam.pu_level}</div>
        </div>

        {reportType === 'INVIGILATOR' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead><tr className="border-b-2 border-slate-800 font-bold">
              <th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Time</th><th className="py-2 pr-3">Subject</th>
              <th className="py-2 pr-3">Room</th><th className="py-2 pr-3">Floor</th><th className="py-2 pr-3">Invigilator</th>
              <th className="py-2 pr-3">Department</th><th className="py-2 pr-3">Reporting</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-200">
              {invigilatorRows.map((r, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-3">{r.exam_date}</td>
                  <td className="py-1.5 pr-3">{r.start_time}–{r.end_time}</td>
                  <td className="py-1.5 pr-3">{r.subject_name}</td>
                  <td className="py-1.5 pr-3">{r.room_number}</td>
                  <td className="py-1.5 pr-3">{r.floor}</td>
                  <td className="py-1.5 pr-3 font-semibold">{r.teacher_name}</td>
                  <td className="py-1.5 pr-3">{r.department_name || '—'}</td>
                  <td className="py-1.5 pr-3">{r.reporting_time || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {reportType === 'SEATING' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead><tr className="border-b-2 border-slate-800 font-bold">
              <th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Subject</th><th className="py-2 pr-3">Room</th>
              <th className="py-2 pr-3">Bench</th><th className="py-2 pr-3">Seat</th><th className="py-2 pr-3">Student</th>
              <th className="py-2 pr-3">Reg No.</th><th className="py-2 pr-3">Batch</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSeating.map((r, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-3">{r.exam_date}</td>
                  <td className="py-1.5 pr-3">{r.subject_name}</td>
                  <td className="py-1.5 pr-3">{r.room_number}</td>
                  <td className="py-1.5 pr-3">{r.bench_number}</td>
                  <td className="py-1.5 pr-3 font-bold">{r.seat_number}</td>
                  <td className="py-1.5 pr-3 font-semibold">{r.student_name}</td>
                  <td className="py-1.5 pr-3">{r.register_number}</td>
                  <td className="py-1.5 pr-3">{r.class_name} {r.section_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {reportType === 'ROOM_CHART' && (
          <div className="space-y-8">
            {roomChartGroups.map((g, gi) => (
              <div key={gi} className={gi > 0 ? 'page-break pt-6' : ''}>
                <div className="text-center font-bold text-slate-900 mb-1">ROOM {g.roomNumber} — FLOOR {g.floor}</div>
                <div className="text-center text-[10px] text-slate-400 mb-3 border-b border-slate-300 pb-2">BOARD</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {g.benches.map((b) => (
                    <div key={b.bench} className="border border-slate-300 rounded-lg p-2">
                      <div className="text-[10px] font-bold text-slate-400 mb-1">Bench {b.bench}</div>
                      <div className="flex gap-1 flex-wrap">
                        {b.seats.map((s) => (
                          <div key={s.seat_number} className="border border-slate-200 rounded px-1.5 py-1 text-[10px]">
                            [{s.seat_number} {s.student_name}]
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
