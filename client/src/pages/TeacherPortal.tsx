import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  CheckCircle2,
  AlertCircle,
  BellRing,
  CheckCheck
} from 'lucide-react';
import { IconTeachers, IconTimetable, IconSubstitution } from '../components/ModuleIcons';

export const TeacherPortal: React.FC = () => {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'today' | 'weekly' | 'substitutions' | 'profile'>('today');
  const [profileData, setProfileData] = useState<any>(null);
  const [timetableData, setTimetableData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadTeacherData = async () => {
    setIsLoading(true);
    try {
      const [pRes, tRes] = await Promise.all([
        apiFetch<any>('/teachers/me/profile'),
        apiFetch<any>('/teachers/me/timetable')
      ]);
      setProfileData(pRes);
      setTimetableData(tRes);
    } catch (err: any) {
      console.error('Failed to load teacher portal data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeacherData();
  }, [user]);

  const handleAcknowledgeSub = async (subId: string) => {
    try {
      await apiFetch(`/teachers/substitutions/${subId}/acknowledge`, { method: 'POST' });
      setActionSuccess('Substitution duty successfully acknowledged.');
      setTimeout(() => setActionSuccess(null), 4000);
      loadTeacherData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const profile = profileData?.profile;
  const assignments = profileData?.assignments || [];
  const todayTimetable = timetableData?.todayTimetable || [];
  const weeklyTimetable = timetableData?.weeklyTimetable || [];
  const substitutionDuties = timetableData?.substitutionDuties || [];
  const pendingAttendance = timetableData?.pendingAttendanceLectures || [];

  return (
    <div className="space-y-6">
      {/* Top Banner Card (Clean Warm Off-White Aesthetic) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#eae8e1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#fef2f2] border border-[#fecaca] flex items-center justify-center p-2 shrink-0">
            <IconTeachers className="w-12 h-12" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 font-heading tracking-tight">
                {profile?.name || user?.name}
              </h1>
              <span className="bg-[#fef3c7] text-[#92400e] text-xs px-2.5 py-0.5 rounded-full font-bold border border-[#fde68a]">
                {profile?.designation || 'Lecturer'}
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Emp ID: <span className="font-mono text-slate-800 font-bold">{profile?.employee_id || 'EMP-PHY-002'}</span> •{' '}
              {profile?.department_name || 'Physics'} • {profile?.branch_name || 'Davangere Campus'}
            </p>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="flex flex-wrap gap-3">
          <div className="bg-[#fbfaf8] border border-[#eae8e1] px-4 py-2.5 rounded-2xl text-center">
            <div className="text-[11px] text-slate-400 font-semibold">Today's Classes</div>
            <div className="text-base font-extrabold text-slate-800 font-heading">{todayTimetable.length} Periods</div>
          </div>
          <div className="bg-[#fbfaf8] border border-[#eae8e1] px-4 py-2.5 rounded-2xl text-center">
            <div className="text-[11px] text-slate-400 font-semibold">Proxy Duties</div>
            <div className={`text-base font-extrabold font-heading ${substitutionDuties.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {substitutionDuties.length} Active
            </div>
          </div>
          <div className="bg-[#fbfaf8] border border-[#eae8e1] px-4 py-2.5 rounded-2xl text-center">
            <div className="text-[11px] text-slate-400 font-semibold">Pending Att.</div>
            <div className={`text-base font-extrabold font-heading ${pendingAttendance.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {pendingAttendance.length}
            </div>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-sm">
          <CheckCheck className="w-5 h-5 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Clean Tabs */}
      <div className="flex border-b border-[#eae8e1] gap-2 sm:gap-6 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveSubTab('today')}
          className={`pb-3 text-xs sm:text-sm font-bold whitespace-nowrap transition flex items-center gap-2 ${
            activeSubTab === 'today'
              ? 'border-b-2 border-indigo-600 text-indigo-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Today's Timetable ({timetableData?.currentDay || 'Today'})
        </button>

        <button
          onClick={() => setActiveSubTab('weekly')}
          className={`pb-3 text-xs sm:text-sm font-bold whitespace-nowrap transition flex items-center gap-2 ${
            activeSubTab === 'weekly'
              ? 'border-b-2 border-indigo-600 text-indigo-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Weekly Timetable Grid
        </button>

        <button
          onClick={() => setActiveSubTab('substitutions')}
          className={`pb-3 text-xs sm:text-sm font-bold whitespace-nowrap transition flex items-center gap-2 ${
            activeSubTab === 'substitutions'
              ? 'border-b-2 border-indigo-600 text-indigo-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BellRing className="w-4 h-4" />
          Substitution Duties
          {substitutionDuties.length > 0 && (
            <span className="px-2 py-0.2 text-[10px] bg-amber-500 text-white rounded-full font-bold">
              {substitutionDuties.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('profile')}
          className={`pb-3 text-xs sm:text-sm font-bold whitespace-nowrap transition flex items-center gap-2 ${
            activeSubTab === 'profile'
              ? 'border-b-2 border-indigo-600 text-indigo-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          Profile & Assignments
        </button>
      </div>

      {/* TAB 1: TODAY'S TIMETABLE */}
      {activeSubTab === 'today' && (
        <div className="space-y-6">
          {/* Active Substitution Alert if any */}
          {substitutionDuties.length > 0 && (
            <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-3xl p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-amber-900 font-heading">Proxy Substitution Duty Assigned</h3>
                  <p className="text-xs text-amber-700 mt-0.5">
                    HOD allocated substitution periods for absent colleagues. Please acknowledge below.
                  </p>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {substitutionDuties.map((sub: any) => (
                      <div key={sub.id} className="bg-white rounded-2xl p-4 border border-[#fde68a] flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800 text-sm">
                            Period {sub.period_number} ({sub.start_time} - {sub.end_time})
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            {sub.subject_name} • {sub.class_name} {sub.section_name} ({sub.batch_name})
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            Room {sub.room_number} • Original: {sub.original_teacher_name}
                          </div>
                        </div>
                        {sub.status === 'ASSIGNED' ? (
                          <button
                            onClick={() => handleAcknowledgeSub(sub.id)}
                            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                          >
                            ACKNOWLEDGE
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Today's Schedule Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayTimetable.length === 0 ? (
              <div className="col-span-full bg-white p-8 rounded-3xl text-center border border-[#eae8e1] text-slate-400 text-sm">
                No scheduled lectures for today ({timetableData?.currentDay}).
              </div>
            ) : (
              todayTimetable.map((period: any, idx: number) => (
                <div
                  key={period.id}
                  className="bg-white rounded-3xl p-5 border border-[#eae8e1] transition shadow-xs hover:shadow-md hover:border-[#dedbd0]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono font-bold px-2.5 py-1 bg-[#f4f3ec] text-slate-700 rounded-xl border border-[#eae8e1]">
                      PERIOD {period.period_number}
                    </span>
                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {period.start_time} - {period.end_time}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-800 font-heading">{period.subject_name}</h3>
                  <p className="text-xs font-semibold text-indigo-700 mt-0.5">
                    {period.class_name} • Section {period.section_name} ({period.batch_name})
                  </p>

                  <div className="mt-4 pt-3 border-t border-[#f1efe8] flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>Room {period.room_number} (Floor {period.floor})</span>
                    </div>
                    <span className="px-2 py-0.5 bg-[#ecfdf5] text-[#047857] font-bold rounded-lg text-[10px] border border-[#a7f3d0]">
                      SCHEDULED
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: WEEKLY TIMETABLE GRID */}
      {activeSubTab === 'weekly' && (
        <div className="bg-white rounded-3xl border border-[#eae8e1] overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#eae8e1] flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm font-heading">Weekly Academic Grid</h3>
            <span className="text-xs text-slate-400">6 Periods Daily • Monday to Saturday</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#fbfaf8] border-b border-[#eae8e1] text-slate-600 font-bold">
                  <th className="py-3 px-4 w-28">Day</th>
                  <th className="py-3 px-4">Period 1<br/><span className="text-[10px] text-slate-400 font-normal">08:45 - 09:30</span></th>
                  <th className="py-3 px-4">Period 2<br/><span className="text-[10px] text-slate-400 font-normal">09:30 - 10:15</span></th>
                  <th className="py-3 px-4">Period 3<br/><span className="text-[10px] text-slate-400 font-normal">10:30 - 11:15</span></th>
                  <th className="py-3 px-4">Period 4<br/><span className="text-[10px] text-slate-400 font-normal">11:15 - 12:00</span></th>
                  <th className="py-3 px-4">Period 5<br/><span className="text-[10px] text-slate-400 font-normal">12:45 - 01:30</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1efe8]">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
                  const dayPeriods = weeklyTimetable.filter((w: any) => w.day_of_week === day);
                  return (
                    <tr key={day} className="hover:bg-[#fbfaf8] transition">
                      <td className="py-3 px-4 font-bold text-slate-800 bg-[#fbfaf8]">{day}</td>
                      {[1, 2, 3, 4, 5].map((pNum) => {
                        const match = dayPeriods.find((p: any) => p.period_number === pNum);
                        return (
                          <td key={pNum} className="py-3 px-4">
                            {match ? (
                              <div className="bg-[#f0f9ff] border border-[#bae6fd] p-2.5 rounded-2xl">
                                <div className="font-bold text-[#0369a1] font-heading">{match.subject_name}</div>
                                <div className="text-[11px] text-[#0284c7] font-semibold">{match.class_name} {match.section_name} ({match.batch_name})</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">Rm {match.room_number} (Fl {match.floor})</div>
                              </div>
                            ) : (
                              <div className="text-slate-300 italic text-[11px] py-2">-- Free --</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SUBSTITUTION DUTIES */}
      {activeSubTab === 'substitutions' && (
        <div className="bg-white rounded-3xl p-6 border border-[#eae8e1] shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-base font-heading">Assigned Proxy & Substitution Duties</h3>
          {substitutionDuties.length === 0 ? (
            <p className="text-slate-400 text-xs">No substitution duties assigned for today.</p>
          ) : (
            <div className="space-y-3">
              {substitutionDuties.map((sub: any) => (
                <div key={sub.id} className="p-4 rounded-2xl border border-[#eae8e1] bg-[#fbfaf8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm font-heading">Period {sub.period_number}</span>
                      <span className="text-xs text-slate-400">({sub.start_time} - {sub.end_time})</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        {sub.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1 font-semibold">
                      {sub.subject_name} • {sub.class_name} Section {sub.section_name} ({sub.batch_name})
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Room {sub.room_number} • Original: {sub.original_teacher_name} • Assigned by HOD: {sub.assigned_by_name}
                    </p>
                  </div>
                  {sub.status === 'ASSIGNED' && (
                    <button
                      onClick={() => handleAcknowledgeSub(sub.id)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition self-start sm:self-auto"
                    >
                      Acknowledge Duty
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TEACHER PROFILE & ACADEMIC ASSIGNMENTS */}
      {activeSubTab === 'profile' && profile && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-[#eae8e1] shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b border-[#f1efe8] pb-3 flex items-center gap-2 font-heading">
              <User className="w-4 h-4 text-indigo-600" />
              Personal Details
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block">Full Name</span>
                <span className="font-bold text-slate-800">{profile.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Employee ID</span>
                <span className="font-mono font-bold text-indigo-700">{profile.employee_id}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Phone & Email</span>
                <span className="font-medium text-slate-700">{profile.phone} • {profile.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Qualification</span>
                <span className="font-medium text-slate-700">{profile.qualification}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Address</span>
                <span className="font-medium text-slate-700">{profile.address}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#eae8e1] shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b border-[#f1efe8] pb-3 flex items-center gap-2 font-heading">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              Academic Class & Section Assignments
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {assignments.map((asg: any) => (
                <div key={asg.id} className="p-4 rounded-2xl border border-[#eae8e1] bg-[#fbfaf8]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-sm font-heading">{asg.subject_name}</span>
                    {asg.is_class_teacher === 1 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        Class Teacher
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Class: <span className="font-semibold text-slate-800">{asg.class_name} {asg.section_name}</span>
                  </div>
                  <div className="text-xs text-indigo-700 font-semibold mt-0.5">
                    Batch: {asg.batch_name}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Dept: {asg.department_name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
