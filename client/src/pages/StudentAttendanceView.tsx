import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../utils/toast';
import { CalendarDays, ChevronLeft, ChevronRight, X, Clock, User, DoorOpen, BookOpen } from 'lucide-react';

interface DayRecord {
  date: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
  status: 'PRESENT' | 'ABSENT' | 'PARTIAL';
}

interface CalendarResponse {
  month: string;
  days: DayRecord[];
  overallPercentage: number;
  overallTotal: number;
  overallAttended: number;
}

interface PeriodRecord {
  lecture_session_id: string;
  scheduled_start: string;
  scheduled_end: string;
  period_number: number;
  subject_name: string;
  teacher_name: string;
  room_number: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'MEDICAL' | 'ON_LEAVE' | 'NOT_MARKED';
  attendance_remarks: string | null;
}

interface DayDetailResponse {
  date: string;
  periods: PeriodRecord[];
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(key: string): string {
  const [y, m] = key.split('-').map((n) => parseInt(n, 10));
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function overallColor(pct: number): { text: string; bg: string; ring: string } {
  if (pct >= 75) return { text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'border-emerald-200' };
  if (pct >= 60) return { text: 'text-amber-700', bg: 'bg-amber-50', ring: 'border-amber-200' };
  return { text: 'text-rose-700', bg: 'bg-rose-50', ring: 'border-rose-200' };
}

function dayCellClasses(status: DayRecord['status']): string {
  switch (status) {
    case 'PRESENT':
      return 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100';
    case 'ABSENT':
      return 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100';
    case 'PARTIAL':
      return 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100';
    default:
      return 'bg-slate-50 border-slate-100 text-slate-400';
  }
}

function periodStatusBadge(status: PeriodRecord['status']): string {
  switch (status) {
    case 'PRESENT':
      return 'bg-emerald-100 text-emerald-700';
    case 'LATE':
      return 'bg-amber-100 text-amber-700';
    case 'EXCUSED':
    case 'ON_LEAVE':
      return 'bg-sky-100 text-sky-700';
    case 'MEDICAL':
      return 'bg-violet-100 text-violet-700';
    case 'ABSENT':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-500';
  }
}

export const StudentAttendanceView: React.FC = () => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<DayDetailResponse | null>(null);
  const [isDayLoading, setIsDayLoading] = useState(false);

  const monthKeyStr = useMemo(() => monthKey(selectedMonth), [selectedMonth]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.student_id) return;
      setIsLoading(true);
      try {
        const res = await apiFetch<CalendarResponse>(
          `/attendance/student/${user.student_id}/calendar?month=${monthKeyStr}`
        );
        if (!cancelled) setCalendar(res);
      } catch (err: any) {
        showToast(err.message || 'Failed to load attendance calendar.', 'error');
        if (!cancelled) setCalendar(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [monthKeyStr, user?.student_id]);

  const daysByDate = useMemo(() => {
    const map = new Map<string, DayRecord>();
    (calendar?.days || []).forEach((d) => map.set(d.date, d));
    return map;
  }, [calendar]);

  const goToPrevMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleMonthInputChange = (value: string) => {
    if (!value) return;
    const [y, m] = value.split('-').map((n) => parseInt(n, 10));
    if (!y || !m) return;
    setSelectedMonth(new Date(y, m - 1, 1));
  };

  const openDay = async (dateStr: string) => {
    const record = daysByDate.get(dateStr);
    if (!record || record.total <= 0 || !user?.student_id) return;
    setSelectedDate(dateStr);
    setDayDetail(null);
    setIsDayLoading(true);
    try {
      const res = await apiFetch<DayDetailResponse>(
        `/attendance/student/${user.student_id}/day?date=${dateStr}`
      );
      setDayDetail(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to load day details.', 'error');
    } finally {
      setIsDayLoading(false);
    }
  };

  const closeDay = () => {
    setSelectedDate(null);
    setDayDetail(null);
  };

  // Build the calendar grid cells (Sun-Sat columns) for the selected month,
  // including leading/trailing blanks so the first day lands in its real
  // weekday column.
  const gridCells = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingBlanks = firstDay.getDay();

    const cells: Array<{ date: string | null; dayNum: number | null }> = [];
    for (let i = 0; i < leadingBlanks; i++) {
      cells.push({ date: null, dayNum: null });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ date: dateStr, dayNum: day });
    }
    return cells;
  }, [selectedMonth]);

  const overall = calendar?.overallPercentage ?? 0;
  const overallClasses = overallColor(overall);

  return (
    <div className="space-y-4">
      {/* Month picker */}
      <div className="bg-[#fdfcfb] border border-[#ded9cf] rounded-3xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-slate-500" />
          <span className="font-bold text-sm text-slate-900">{formatMonthLabel(monthKeyStr)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="w-8 h-8 rounded-xl bg-white border border-[#ded9cf] flex items-center justify-center text-slate-600 hover:bg-slate-50"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="month"
            value={monthKeyStr}
            onChange={(e) => handleMonthInputChange(e.target.value)}
            className="text-xs font-semibold border border-[#ded9cf] rounded-xl px-3 py-1.5 bg-white text-slate-700"
          />
          <button
            onClick={goToNextMonth}
            className="w-8 h-8 rounded-xl bg-white border border-[#ded9cf] flex items-center justify-center text-slate-600 hover:bg-slate-50"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Overall stat */}
      <div className={`rounded-3xl border p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${overallClasses.bg} ${overallClasses.ring}`}>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Overall Attendance</div>
          <div className={`text-4xl font-bold font-heading ${overallClasses.text}`}>
            {isLoading ? '—' : `${overall}%`}
          </div>
        </div>
        <div className="text-sm text-slate-600">
          {isLoading ? (
            'Loading...'
          ) : (
            <>
              <span className="font-bold text-slate-800">{calendar?.overallAttended ?? 0}</span>
              {' / '}
              <span className="font-bold text-slate-800">{calendar?.overallTotal ?? 0}</span>
              {' periods attended'}
            </>
          )}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
        {isLoading ? (
          <div className="text-center text-slate-400 text-sm py-10">Loading attendance...</div>
        ) : !calendar || calendar.days.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-10">No attendance records for this month yet.</div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1.5 mb-2">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="text-center text-[10px] font-bold uppercase text-slate-400 py-1">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {gridCells.map((cell, idx) => {
                if (!cell.date) {
                  return <div key={`blank-${idx}`} />;
                }
                const record = daysByDate.get(cell.date);
                const hasRecord = !!record && record.total > 0;
                return (
                  <button
                    key={cell.date}
                    onClick={() => hasRecord && openDay(cell.date!)}
                    disabled={!hasRecord}
                    className={`aspect-square rounded-xl border flex flex-col items-center justify-center text-xs transition-colors ${
                      hasRecord ? dayCellClasses(record!.status) : 'bg-slate-50/50 border-transparent text-slate-300'
                    } ${hasRecord ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className="font-bold">{cell.dayNum}</span>
                    {hasRecord && <span className="text-[9px] font-semibold">{record!.percentage}%</span>}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-200 inline-block" /> Present</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-200 inline-block" /> Partial</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-rose-200 inline-block" /> Absent</span>
            </div>
          </>
        )}
      </div>

      {/* Day detail modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#ded9cf] my-8">
            <div className="bg-[#fdfcfb] p-5 border-b border-[#ded9cf] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 font-heading">Attendance Detail</h3>
                <p className="text-xs text-slate-500">{selectedDate}</p>
              </div>
              <button
                onClick={closeDay}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              {isDayLoading ? (
                <div className="text-center text-slate-400 text-sm py-8">Loading periods...</div>
              ) : !dayDetail || dayDetail.periods.length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-8">No periods recorded for this day.</div>
              ) : (
                dayDetail.periods
                  .slice()
                  .sort((a, b) => a.period_number - b.period_number)
                  .map((p) => (
                    <div key={p.lecture_session_id} className="border border-slate-200 rounded-2xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                            Period {p.period_number} — {p.subject_name}
                          </div>
                          <div className="flex flex-wrap gap-3 mt-1.5 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {p.scheduled_start}–{p.scheduled_end}</span>
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {p.teacher_name}</span>
                            {p.room_number && <span className="flex items-center gap-1"><DoorOpen className="w-3 h-3" /> Room {p.room_number}</span>}
                          </div>
                          {p.attendance_remarks && (
                            <div className="text-[11px] text-slate-400 italic mt-1">{p.attendance_remarks}</div>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full whitespace-nowrap ${periodStatusBadge(p.status)}`}>
                          {p.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
