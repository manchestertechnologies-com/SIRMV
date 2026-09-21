import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Save,
  Search,
  Bed,
  ShieldCheck,
  CheckCheck,
  Building
} from 'lucide-react';

export const HostelDashboard: React.FC = () => {
  const { user, currentBranch } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [floor, setFloor] = useState<number>(2);
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadHostelAttendance = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<any>(
        `/hostel/attendance?branch_id=${currentBranch?.id || ''}&date=${date}&floor=${floor}`
      );
      setRecords(res.records || []);
    } catch (err: any) {
      console.error('Failed to load hostel attendance', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHostelAttendance();
  }, [date, floor, currentBranch]);

  const handleStatusChange = (studentId: string, status: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, status } : r))
    );
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, remarks } : r))
    );
  };

  const handleSaveAttendance = async () => {
    setIsSaving(true);
    try {
      await apiFetch('/hostel/mark', {
        method: 'POST',
        body: JSON.stringify({
          date,
          time: '21:30',
          records: records.map((r) => ({
            student_id: r.student_id,
            room_id: r.room_id,
            status: r.status,
            remarks: r.remarks || ''
          }))
        })
      });

      setSuccessMessage('Hostel night roll call attendance recorded successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
      loadHostelAttendance();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const presentCount = records.filter((r) => r.status === 'PRESENT').length;
  const outpassCount = records.filter((r) => r.status === 'OUTPASS').length;
  const absentCount = records.filter((r) => r.status === 'ABSENT').length;
  const leaveCount = records.filter((r) => r.status === 'LEAVE').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Home className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">Hostel Attendance & Night Roll Call</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Hostel hierarchy tracking: Block ➔ Floor ➔ Room ➔ Bed allocation & daily warden verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Floor Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {[1, 2, 3].map((f) => (
              <button
                key={f}
                onClick={() => setFloor(f)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
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

          <button
            onClick={handleSaveAttendance}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Roll Call'}
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-sm">
          <CheckCheck className="w-5 h-5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-400 block font-medium">Total Hostelite Beds</span>
          <span className="text-2xl font-bold text-slate-900 mt-1">{records.length}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-400 block font-medium">Present in Room</span>
          <span className="text-2xl font-bold text-emerald-600 mt-1">{presentCount}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-400 block font-medium">Out on Gate Pass</span>
          <span className="text-2xl font-bold text-indigo-600 mt-1">{outpassCount}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-400 block font-medium">Absent / Unauthorized</span>
          <span className="text-2xl font-bold text-rose-600 mt-1">{absentCount}</span>
        </div>
      </div>

      {/* Bed-by-Bed Room Roster */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            Hostel Block A • Floor {floor} Rooms ({records.length} Beds Assigned)
          </h3>
          <span className="text-xs text-slate-400">Night Roll Call (21:30)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Room & Bed</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Reg No</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Warden Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-bold text-indigo-950">
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 mr-2 font-mono">
                      Room {r.room_number}
                    </span>
                    <span className="text-slate-500 font-normal">{r.bed_number}</span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">{r.student_name}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">{r.register_number}</td>
                  <td className="py-3 px-4">
                    <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 gap-1">
                      {['PRESENT', 'ABSENT', 'OUTPASS', 'LEAVE', 'MEDICAL', 'LATE_RETURN'].map((st) => {
                        const isSelected = r.status === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleStatusChange(r.student_id, st)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                              isSelected
                                ? st === 'PRESENT'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : st === 'OUTPASS'
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {st}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      placeholder="Remarks / room check notes..."
                      value={r.remarks || ''}
                      onChange={(e) => handleRemarksChange(r.student_id, e.target.value)}
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
  );
};
