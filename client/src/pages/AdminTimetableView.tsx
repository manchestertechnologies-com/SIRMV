import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../services/api';
import { showToast } from '../utils/toast';
import { Clock, MapPin, User, CalendarDays, Layers } from 'lucide-react';

interface TimetableEntry {
  id: string;
  day_of_week: string;
  period_number: number;
  start_time: string;
  end_time: string;
  subject_name: string;
  room_number: string;
  teacher_name: string;
}

interface ClassGroup {
  class_id: string;
  section_id: string;
  batch_id: string;
  class_name: string;
  section_name: string;
  batch_name: string;
  entries: TimetableEntry[];
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const AdminTimetableView: React.FC = () => {
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const todayName = DAY_ORDER[(new Date().getDay() + 6) % 7];

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch<any>('/timetable-generator/all-classes');
        setGroups(res?.groups || []);
      } catch (err: any) {
        showToast(err.message || 'Failed to load timetables.', 'error');
        setGroups([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (groups.length === 0) return;
    const key = `${groups[0].class_id}|${groups[0].section_id}|${groups[0].batch_id}`;
    setSelectedGroupKey((prev) => prev || key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  const selectedGroup = useMemo(
    () =>
      groups.find((g) => `${g.class_id}|${g.section_id}|${g.batch_id}` === selectedGroupKey) || null,
    [groups, selectedGroupKey]
  );

  const daysWithEntries = useMemo(() => {
    if (!selectedGroup) return [];
    const present = new Set(selectedGroup.entries.map((e) => e.day_of_week));
    return DAY_ORDER.filter((d) => present.has(d));
  }, [selectedGroup]);

  useEffect(() => {
    if (daysWithEntries.length === 0) {
      setSelectedDay(null);
      return;
    }
    if (selectedDay && daysWithEntries.includes(selectedDay)) return;
    setSelectedDay(daysWithEntries.includes(todayName) ? todayName : daysWithEntries[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysWithEntries]);

  const entriesForSelectedDay = useMemo(
    () =>
      (selectedGroup?.entries || [])
        .filter((e) => e.day_of_week === selectedDay)
        .sort((a, b) => a.period_number - b.period_number),
    [selectedGroup, selectedDay]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="p-12 text-center bg-[#fdfcfb] rounded-3xl border border-[#ded9cf] text-slate-400 text-sm">
        No published timetables found for any class yet. Publish a draft from the Timetable Generator to see
        it here.
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Class / Section / Batch Picker */}
      <div className="bg-[#fdfcfb] p-4 rounded-2xl border border-[#ded9cf] space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
          <Layers className="w-4 h-4 text-blue-600" />
          All Classes ({groups.length})
        </div>
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
          {groups.map((g) => {
            const key = `${g.class_id}|${g.section_id}|${g.batch_id}`;
            const isSelected = key === selectedGroupKey;
            return (
              <button
                key={key}
                onClick={() => setSelectedGroupKey(key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-600 border-[#ded9cf] hover:bg-slate-50'
                }`}
              >
                {g.class_name} • {g.section_name}
                <span className="opacity-70 font-semibold"> ({g.batch_name})</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedGroup && (
        <>
          {/* Day Tabs */}
          <div className="bg-[#fdfcfb] p-4 rounded-2xl border border-[#ded9cf] flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider shrink-0">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              Weekly Timetable
            </div>
            <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl">
              {daysWithEntries.map((day) => {
                const isSelected = selectedDay === day;
                const isToday = day === todayName;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition relative ${
                      isSelected ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {day.slice(0, 3)}
                    {isToday && (
                      <span
                        className={`ml-1.5 inline-block w-1.5 h-1.5 rounded-full align-middle ${
                          isSelected ? 'bg-white' : 'bg-emerald-500'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Schedule */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                {selectedGroup.class_name} • {selectedGroup.section_name} ({selectedGroup.batch_name}) —{' '}
                {selectedDay}
                {selectedDay === todayName && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Today
                  </span>
                )}
              </h3>
              <span className="text-xs text-slate-400">
                {entriesForSelectedDay.length} {entriesForSelectedDay.length === 1 ? 'Period' : 'Periods'}
              </span>
            </div>

            {entriesForSelectedDay.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No periods scheduled on this day.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {entriesForSelectedDay.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 hover:bg-slate-50/70 transition"
                  >
                    <div className="flex items-center gap-3 sm:w-40 shrink-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs font-heading shrink-0">
                        P{entry.period_number}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {entry.start_time}–{entry.end_time}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 text-sm truncate">{entry.subject_name}</div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {entry.teacher_name || 'N/A'}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          Room {entry.room_number || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
