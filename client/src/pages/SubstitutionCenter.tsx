import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { Select } from '../components/Select';
import { useAuth } from '../context/AuthContext';
import {
  UserX,
  UserCheck2,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  CheckCheck
} from 'lucide-react';

export const SubstitutionCenter: React.FC = () => {
  const { user, currentBranch } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [substitutionData, setSubstitutionData] = useState<any>(null);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);
  const [selectedSubstituteId, setSelectedSubstituteId] = useState<string>('');
  const [assignRemarks, setAssignRemarks] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form to mark a teacher absent
  const [showMarkAbsentModal, setShowMarkAbsentModal] = useState(false);
  const [absentTeacherId, setAbsentTeacherId] = useState('');
  const [absentReason, setAbsentReason] = useState('Medical Leave / Personal Emergency');

  const loadCenterData = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<any>(`/substitutions/center?date=${date}&branch_id=${currentBranch?.id || ''}`);
      setSubstitutionData(res);

      const teachersRes = await apiFetch<any>(`/teachers?branch_id=${currentBranch?.id || ''}`);
      setAllTeachers(teachersRes.teachers || []);
    } catch (err: any) {
      console.error('Failed to load substitution center', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCenterData();
  }, [date, currentBranch]);

  const handleOpenAssignModal = async (req: any) => {
    setSelectedReq(req);
    setSelectedSubstituteId('');
    setAssignRemarks('');
    try {
      const res = await apiFetch<any>(
        `/substitutions/available-teachers?branch_id=${currentBranch?.id || ''}&date=${date}&day_of_week=${req.dayOfWeek}&period_number=${req.timetableEntry.period_number}&exclude_teacher_id=${req.timetableEntry.teacher_id}`
      );
      setAvailableTeachers(res.teachers || []);
    } catch (err: any) {
      console.error('Failed to fetch available teachers', err);
    }
  };

  const handleMarkTeacherAbsent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!absentTeacherId) return;

    try {
      const res = await apiFetch<any>('/substitutions/absence', {
        method: 'POST',
        body: JSON.stringify({
          teacher_id: absentTeacherId,
          date,
          reason: absentReason
        })
      });

      setShowMarkAbsentModal(false);
      setAbsentTeacherId('');
      setSuccessMessage(res.message);
      setTimeout(() => setSuccessMessage(null), 5000);
      loadCenterData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAssignSubstitute = async () => {
    if (!selectedReq || !selectedSubstituteId) return;
    setIsAssigning(true);

    try {
      const res = await apiFetch<any>('/substitutions/assign', {
        method: 'POST',
        body: JSON.stringify({
          timetable_entry_id: selectedReq.timetableEntry.id,
          date,
          original_teacher_id: selectedReq.timetableEntry.teacher_id,
          substitute_teacher_id: selectedSubstituteId,
          remarks: assignRemarks
        })
      });

      setSelectedReq(null);
      setSuccessMessage(res.message);
      setTimeout(() => setSuccessMessage(null), 5000);
      loadCenterData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const requirements = substitutionData?.requirements || [];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck2 className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">HOD Substitution Allocation Center</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time proxy lecture management and automated conflict-free faculty dispatching.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
            onClick={() => setShowMarkAbsentModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <UserX className="w-4 h-4" />
            Mark Teacher Absent
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-sm">
          <CheckCheck className="w-5 h-5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Affected Timetable Periods List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Affected Timetable Periods ({requirements.length})</h3>
            <span className="text-xs text-slate-500">
              {substitutionData?.absentTeacherCount || 0} Faculty member(s) marked absent for {date}
            </span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg">
            {requirements.filter((r: any) => !r.substitutionAssignment).length} Pending Substitution
          </span>
        </div>

        {requirements.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            No absent teachers or affected periods for {date}. All regular faculty are in session.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requirements.map((req: any, index: number) => {
              const entry = req.timetableEntry;
              const sub = req.substitutionAssignment;
              return (
                <div key={index} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex flex-col items-center justify-center shrink-0 text-amber-900">
                      <span className="text-[10px] uppercase font-bold text-amber-700">Period</span>
                      <span className="text-base font-extrabold">{entry.period_number}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{entry.subject_name}</span>
                        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {entry.class_name} • {entry.section_name} ({entry.batch_name})
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {entry.start_time} - {entry.end_time}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>
                          Absent: <strong className="text-rose-700">{req.absence.teacher_name}</strong> ({req.absence.employee_id})
                        </span>
                        <span>
                          Room: <strong className="text-slate-800">{entry.room_number}</strong> (Floor {entry.floor})
                        </span>
                        <span>
                          Reason: <span className="text-slate-500 italic">{req.absence.reason || 'Medical'}</span>
                        </span>
                      </div>

                      {sub ? (
                        <div className="mt-2 text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Substitute Allocated: {sub.substitute_teacher_name} ({sub.substitute_employee_id}) • Status: {sub.status}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-amber-700 font-semibold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          SUBSTITUTION REQUIRED
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => handleOpenAssignModal(req)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        sub
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                      }`}
                    >
                      {sub ? 'Change Substitute' : 'Select Substitute'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Mark Teacher Absent */}
      {showMarkAbsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <UserX className="w-5 h-5 text-rose-400" />
                Mark Faculty Member Absent
              </h3>
              <button onClick={() => setShowMarkAbsentModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleMarkTeacherAbsent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Faculty Member</label>
                <Select
                  required
                  value={absentTeacherId}
                  onChange={setAbsentTeacherId}
                  placeholder="-- Choose Teacher --"
                  sheetTitle="Select Faculty Member"
                  options={allTeachers.map((t) => ({
                    value: t.id,
                    label: `${t.name} (${t.employee_id}) - ${t.department_name}`
                  }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Absence Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Notes</label>
                <input
                  type="text"
                  value={absentReason}
                  onChange={(e) => setAbsentReason(e.target.value)}
                  placeholder="e.g. Viral fever / Emergency leave"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowMarkAbsentModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs shadow-sm transition"
                >
                  Confirm & Identify Periods
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Assign Substitute Teacher Drawer */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Select Substitute Teacher</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Period {selectedReq.timetableEntry.period_number} ({selectedReq.timetableEntry.start_time} - {selectedReq.timetableEntry.end_time}) • {selectedReq.timetableEntry.subject_name} • Room {selectedReq.timetableEntry.room_number}
                </p>
              </div>
              <button onClick={() => setSelectedReq(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="bg-indigo-50/70 border border-indigo-100 p-3 rounded-xl text-xs text-indigo-900">
                Original Teacher: <strong>{selectedReq.absence.teacher_name}</strong> ({selectedReq.absence.employee_id})
                <br />
                Target Class: <strong>{selectedReq.timetableEntry.class_name} {selectedReq.timetableEntry.section_name} ({selectedReq.timetableEntry.batch_name})</strong>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Available Faculty for this Period (Prioritizing Free Period)</label>
                <div className="space-y-2">
                  {availableTeachers.map((teacher) => {
                    const isSelected = selectedSubstituteId === teacher.teacher_id;
                    return (
                      <div
                        key={teacher.teacher_id}
                        onClick={() => setSelectedSubstituteId(teacher.teacher_id)}
                        className={`p-3.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-200'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900">{teacher.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {teacher.department_name} • {teacher.qualification}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              teacher.isFree
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {teacher.statusLabel}
                          </span>
                          <input
                            type="radio"
                            name="substituteRadio"
                            checked={isSelected}
                            onChange={() => setSelectedSubstituteId(teacher.teacher_id)}
                            className="text-indigo-600"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Remarks / Assignment Notes</label>
                <input
                  type="text"
                  value={assignRemarks}
                  onChange={(e) => setAssignRemarks(e.target.value)}
                  placeholder="e.g. Please cover Carnot Cycle derivation"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedReq(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignSubstitute}
                  disabled={!selectedSubstituteId || isAssigning}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-sm transition disabled:opacity-50"
                >
                  {isAssigning ? 'Allocating...' : 'Confirm Substitution Duty'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
