import React, { useState, useEffect } from 'react';
import { showToast } from '../utils/toast';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Moon,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Save,
  Search,
  FileSpreadsheet,
  Download,
  Users,
  CheckCheck
} from 'lucide-react';

export const EveningStudyDashboard: React.FC = () => {
  const { user, currentBranch } = useAuth();
  const [activeTab, setActiveTab] = useState<'attendance' | 'reports'>('attendance');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [studyHall, setStudyHall] = useState('Study Hall 1 (Dr. Sir MV Block)');
  const [sessionData, setSessionData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reports state
  const [reportStartDate, setReportStartDate] = useState('2026-09-01');
  const [reportEndDate, setReportEndDate] = useState('2026-09-30');
  const [reportsData, setReportsData] = useState<any>(null);

  const loadSession = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<any>(
        `/evening-study/session?branch_id=${currentBranch?.id || ''}&date=${date}&study_hall=${encodeURIComponent(studyHall)}`
      );
      setSessionData(res.session);
      setStudents(res.students || []);
    } catch (err: any) {
      console.error('Failed to load evening study session', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      const res = await apiFetch<any>(
        `/evening-study/reports?branch_id=${currentBranch?.id || ''}&start_date=${reportStartDate}&end_date=${reportEndDate}`
      );
      setReportsData(res);
    } catch (err: any) {
      console.error('Failed to load evening study reports', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'attendance') {
      loadSession();
    } else {
      loadReports();
    }
  }, [date, studyHall, activeTab, currentBranch]);

  const handleStudentFieldChange = (studentId: string, field: string, value: any) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, [field]: value } : s))
    );
  };

  const handleSaveAttendance = async () => {
    if (!sessionData) return;
    setIsSaving(true);
    try {
      await apiFetch('/evening-study/mark', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionData.id,
          records: students.map((s) => ({
            student_id: s.id,
            entry_time: s.entry_time || '18:30',
            exit_time: s.exit_time || '21:00',
            duration_minutes: parseInt(s.duration_minutes || '150', 10),
            status: s.status,
            remarks: s.student_remarks || ''
          }))
        })
      });

      setSuccessMessage('Evening study attendance recorded successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
      loadSession();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Moon className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">Evening Study Attendance System</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Independent supervised study hall roll call tracking entry/exit times, durations and disciplinary remarks.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'attendance' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Study Roll Call
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Historical Reports
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-sm">
          <CheckCheck className="w-5 h-5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* TAB 1: ATTENDANCE SESSION */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Session Filters & Meta */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 outline-none"
                />
              </div>

              <select
                value={studyHall}
                onChange={(e) => setStudyHall(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none"
              >
                <option value="Study Hall 1 (Dr. Sir MV Block)">Study Hall 1 (Dr. Sir MV Block)</option>
                <option value="Study Hall 2 (Kuvempu Block)">Study Hall 2 (Kuvempu Block)</option>
                <option value="Library Reading Hall">Library Reading Hall</option>
              </select>

              <span className="text-slate-400 font-mono">Slot: 18:30 - 21:00 (150 mins)</span>
            </div>

            <button
              onClick={handleSaveAttendance}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Evening Study Attendance'}
            </button>
          </div>

          {/* Student Roster Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Reg No</th>
                    <th className="py-3 px-4">Class / Batch</th>
                    <th className="py-3 px-4">Entry / Exit</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((st, idx) => (
                    <tr key={st.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 text-center text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{st.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{st.register_number}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{st.class_name} {st.section_name}</span>
                        <span className="text-indigo-600 block text-[11px] font-medium">{st.batch_name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <input
                            type="time"
                            value={st.entry_time || '18:30'}
                            onChange={(e) => handleStudentFieldChange(st.id, 'entry_time', e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded p-1 font-mono text-[11px]"
                          />
                          <span className="text-slate-400">-</span>
                          <input
                            type="time"
                            value={st.exit_time || '21:00'}
                            onChange={(e) => handleStudentFieldChange(st.id, 'exit_time', e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded p-1 font-mono text-[11px]"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={st.status || 'PRESENT'}
                          onChange={(e) => handleStudentFieldChange(st.id, 'status', e.target.value)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold outline-none border ${
                            st.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            st.status === 'ABSENT' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                            st.status === 'LEFT_EARLY' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                            'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          <option value="PRESENT">PRESENT</option>
                          <option value="ABSENT">ABSENT</option>
                          <option value="LATE">LATE</option>
                          <option value="LEFT_EARLY">LEFT EARLY</option>
                          <option value="ON_LEAVE">ON LEAVE</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Remarks..."
                          value={st.student_remarks || ''}
                          onChange={(e) => handleStudentFieldChange(st.id, 'student_remarks', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[11px] outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Summary KPI */}
          {reportsData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                <span className="text-xs text-slate-400 block">Total Logs</span>
                <span className="text-xl font-bold text-slate-900">{reportsData.summary.totalRecords}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                <span className="text-xs text-slate-400 block">Present</span>
                <span className="text-xl font-bold text-emerald-600">{reportsData.summary.present}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                <span className="text-xs text-slate-400 block">Absent</span>
                <span className="text-xl font-bold text-rose-600">{reportsData.summary.absent}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                <span className="text-xs text-slate-400 block">Late Arrivals</span>
                <span className="text-xl font-bold text-amber-600">{reportsData.summary.late}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                <span className="text-xs text-slate-400 block">Left Early</span>
                <span className="text-xl font-bold text-purple-600">{reportsData.summary.leftEarly}</span>
              </div>
            </div>
          )}

          {/* Historical Log Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Evening Study Attendance History</h3>
              <span className="text-xs text-slate-400">Monthly Aggregates</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Study Hall</th>
                    <th className="py-3 px-4">Entry / Exit</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reportsData?.report || []).map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">{r.date}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {r.student_name} <span className="font-mono text-slate-400 text-[10px]">({r.register_number})</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{r.study_hall}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {r.entry_time} - {r.exit_time} ({r.duration_minutes}m)
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          r.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                          r.status === 'ABSENT' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{r.remarks || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
