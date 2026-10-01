import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { X, User, BookOpen, CalendarCheck2, Award } from 'lucide-react';

// A compact "360°" student profile for exam-duty contexts (seating view /
// take-attendance view): basic info, overall attendance percentage, and a
// quick list of past exam results (theory, competitive, board). Deliberately
// separate from the full Student 360° Profile modal in StudentsModule.tsx
// (which is gated to Warden/Head Warden for hostel students) — this one is
// read-only and opened by any invigilating teacher from the seating chart.
interface ExamRow {
  exam_id: string;
  exam_name: string;
  exam_type: string;
  start_date: string;
  total_obtained: number;
  total_max: number;
  percentage: number;
  overall_rank: number | null;
  section_rank: number | null;
}

export const ExamStudentProfileModal: React.FC<{ studentId: string; onClose: () => void }> = ({ studentId, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [attendance, setAttendance] = useState<{ overallPercentage: number; overallTotal: number; overallAttended: number } | null>(null);
  const [theory, setTheory] = useState<ExamRow[]>([]);
  const [competitive, setCompetitive] = useState<ExamRow[]>([]);
  const [board, setBoard] = useState<ExamRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const [profileRes, attRes, theoryRes, compRes, boardRes] = await Promise.all([
          apiFetch<any>(`/students/${studentId}`),
          apiFetch<any>(`/attendance/student/${studentId}/calendar`).catch(() => null),
          apiFetch<any>(`/students/${studentId}/marks/theory`).catch(() => ({ exams: [] })),
          apiFetch<any>(`/students/${studentId}/marks/competitive`).catch(() => ({ exams: [] })),
          apiFetch<any>(`/students/${studentId}/marks/board`).catch(() => ({ exams: [] }))
        ]);
        if (cancelled) return;
        setProfile(profileRes?.profile || null);
        setAttendance(attRes || null);
        setTheory(theoryRes?.exams || []);
        setCompetitive(compRes?.exams || []);
        setBoard(boardRes?.exams || []);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const ExamTable: React.FC<{ title: string; rows: ExamRow[] }> = ({ title, rows }) =>
    rows.length === 0 ? null : (
      <div className="space-y-1.5">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{title}</div>
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-left">
                <th className="py-1.5 px-3">Exam</th>
                <th className="py-1.5 px-3">Marks</th>
                <th className="py-1.5 px-3">%</th>
                <th className="py-1.5 px-3">Rank (Sec / Overall)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((r) => (
                <tr key={r.exam_id}>
                  <td className="py-1.5 px-3 font-semibold text-slate-800">{r.exam_name}</td>
                  <td className="py-1.5 px-3 text-slate-600">{r.total_obtained}/{r.total_max}</td>
                  <td className="py-1.5 px-3 font-bold text-indigo-700">{r.percentage}%</td>
                  <td className="py-1.5 px-3 text-slate-500">
                    {r.section_rank ?? '—'} / {r.overall_rank ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-violet-600" />
            <h2 className="font-bold text-slate-900 text-sm">Student 360° Profile</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Close">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          </div>
        ) : !profile ? (
          <div className="p-8 text-center text-slate-400 text-sm">Student profile not found.</div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Basic Info */}
            <div className="flex items-center gap-4">
              {profile.photo_url ? (
                <img src={profile.photo_url} alt={profile.name} className="w-16 h-16 rounded-2xl object-cover border border-violet-200" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-700 font-bold text-xl">
                  {profile.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                </div>
              )}
              <div>
                <div className="font-bold text-slate-900">{profile.name}</div>
                <div className="text-xs text-slate-500">{profile.register_number}</div>
                <div className="text-xs text-slate-500">
                  {profile.class_name} {profile.section_name} • {profile.batch_name}
                </div>
              </div>
            </div>

            {/* Attendance */}
            <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
              <CalendarCheck2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Overall Attendance</div>
                <div className="text-lg font-bold text-slate-900">
                  {attendance?.overallPercentage ?? 0}%
                  <span className="text-xs font-semibold text-slate-400 ml-2">
                    ({attendance?.overallAttended ?? 0}/{attendance?.overallTotal ?? 0} periods)
                  </span>
                </div>
              </div>
            </div>

            {/* Marks */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Previous Marks</h3>
              </div>
              {theory.length === 0 && competitive.length === 0 && board.length === 0 ? (
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> No exam results recorded yet.
                </div>
              ) : (
                <>
                  <ExamTable title="Theory Exams" rows={theory} />
                  <ExamTable title="Competitive Exams (NEET/JEE/KCET)" rows={competitive} />
                  <ExamTable title="Board Exams" rows={board} />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
