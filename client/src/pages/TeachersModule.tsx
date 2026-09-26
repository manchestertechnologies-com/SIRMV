import React, { useState, useEffect } from 'react';
import { showToast } from '../utils/toast';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Users,
  Search,
  Plus,
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  CheckCircle2,
  AlertCircle,
  BellRing,
  CheckCheck,
  UserX,
  UserCheck2,
  Filter,
  ArrowRight,
  ShieldAlert,
  Phone,
  Mail,
  GraduationCap,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { IconStaffs, IconTimetable } from '../components/ModuleIcons';
import { INITIAL_TEACHERS } from '../data/mockInstitutionalData';

const DEFAULT_DEPTS = [
  { id: 'dept-phy', name: 'Physics Department', code: 'PHY' },
  { id: 'dept-chem', name: 'Chemistry Department', code: 'CHEM' },
  { id: 'dept-math', name: 'Mathematics Department', code: 'MATH' },
  { id: 'dept-bio', name: 'Biology Department', code: 'BIO' },
  { id: 'dept-cs', name: 'Computer Science Department', code: 'CS' },
  { id: 'dept-elec', name: 'Electronics Department', code: 'ELEC' },
  { id: 'dept-kan', name: 'Kannada Department', code: 'KAN' },
  { id: 'dept-sans', name: 'Sanskrit Department', code: 'SANS' },
  { id: 'dept-hin', name: 'Hindi Department', code: 'HIN' },
  { id: 'dept-eng', name: 'English Department', code: 'ENG' }
];

const DEFAULT_DESIGNATIONS = ['Professor & HOD', 'Senior Faculty', 'Faculty', 'Lab Faculty'];

export const TeachersModule: React.FC = () => {
  const { user, currentBranch } = useAuth();
  const [activeTab, setActiveTab] = useState<'directory' | 'my-schedule' | 'substitutions'>('directory');
  
  // Directory state
  const [teachers, setTeachers] = useState<any[]>(INITIAL_TEACHERS);
  const [departments, setDepartments] = useState<any[]>(DEFAULT_DEPTS);
  const [designations, setDesignations] = useState<string[]>(DEFAULT_DESIGNATIONS);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Selected Teacher for Detailed View
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedTeacherDetail, setSelectedTeacherDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Personal Teacher State
  const [myProfileData, setMyProfileData] = useState<any | null>(null);
  const [myTimetableData, setMyTimetableData] = useState<any | null>(null);

  // Substitution Center State
  const [subDate, setSubDate] = useState(new Date().toISOString().split('T')[0]);
  const [substitutionData, setSubstitutionData] = useState<any | null>(null);
  const [showMarkAbsentModal, setShowMarkAbsentModal] = useState(false);
  const [absentTeacherId, setAbsentTeacherId] = useState('');
  const [absentReason, setAbsentReason] = useState('Medical Leave / Personal Emergency');
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);
  const [selectedSubstituteId, setSelectedSubstituteId] = useState('');
  const [assignRemarks, setAssignRemarks] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Create Faculty Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    employee_id: '',
    department_id: '',
    designation: 'Faculty',
    qualification: 'M.Sc., B.Ed',
    experience_years: 3
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isManagement = ['ADMIN', 'PRINCIPAL', 'HOD'].includes(user?.role || '');
  const isFaculty = user?.role === 'TEACHER' || user?.role === 'HOD';

  // Load Directory & Departments
  const loadDirectory = async () => {
    try {
      const [deptRes, teachersRes, desigRes] = await Promise.all([
        apiFetch<any>(`/teachers/departments?branch_id=${currentBranch?.id || ''}`).catch(() => null),
        apiFetch<any>(`/teachers?branch_id=${currentBranch?.id || ''}`).catch(() => null),
        apiFetch<any>('/teachers/designations').catch(() => null)
      ]);
      if (deptRes && deptRes.departments?.length > 0) {
        setDepartments(deptRes.departments);
      }
      if (desigRes && desigRes.designations?.length > 0) {
        setDesignations(desigRes.designations);
      }
      if (teachersRes && teachersRes.teachers && teachersRes.teachers.length > 0) {
        setTeachers(teachersRes.teachers);
      } else {
        setTeachers(INITIAL_TEACHERS);
      }
    } catch (err: any) {
      console.error('Using institutional faculty directory', err);
      setTeachers(INITIAL_TEACHERS);
    } finally {
      setIsLoading(false);
    }
  };

  // Load My Schedule if Faculty
  const loadMySchedule = async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        apiFetch<any>('/teachers/me/profile').catch(() => null),
        apiFetch<any>('/teachers/me/timetable').catch(() => null)
      ]);
      if (pRes) setMyProfileData(pRes);
      if (tRes) setMyTimetableData(tRes);
    } catch (err: any) {
      console.error('Failed to load personal teacher schedule', err);
    }
  };

  // Load Substitution Center Data
  const loadSubstitutionCenter = async () => {
    try {
      const res = await apiFetch<any>(`/substitutions/center?date=${subDate}&branch_id=${currentBranch?.id || ''}`).catch(() => null);
      if (res) setSubstitutionData(res);
    } catch (err: any) {
      console.error('Failed to load substitutions', err);
    }
  };

  useEffect(() => {
    loadDirectory();
    if (isFaculty) {
      loadMySchedule();
    }
    loadSubstitutionCenter();
  }, [currentBranch, subDate]);

  // Load Single Teacher Details
  const handleViewTeacher = async (tId: string) => {
    setSelectedTeacherId(tId);
    setDetailLoading(true);
    try {
      const res = await apiFetch<any>(`/teachers/${tId}`);
      setSelectedTeacherDetail(res);
    } catch (err: any) {
      const found = teachers.find((t) => t.id === tId) || INITIAL_TEACHERS.find((t) => t.id === tId);
      if (found) {
        setSelectedTeacherDetail({
          profile: found,
          assignments: [
            { class_name: '2 PUC', section_name: 'A', batch_name: 'NEET Batch', subject_name: found.department_name, is_class_teacher: 1 },
            { class_name: '2 PUC', section_name: 'B', batch_name: 'JEE Batch', subject_name: found.department_name, is_class_teacher: 0 },
            { class_name: '1 PUC', section_name: 'A', batch_name: 'NEET Batch', subject_name: found.department_name, is_class_teacher: 0 }
          ],
          timetable: [
            { day_of_week: 'Monday', period_number: 1, start_time: '08:45', end_time: '09:30', class_name: '2 PUC', section_name: 'A', room_number: '201', floor: 2 },
            { day_of_week: 'Monday', period_number: 2, start_time: '09:30', end_time: '10:15', class_name: '2 PUC', section_name: 'B', room_number: '202', floor: 2 },
            { day_of_week: 'Tuesday', period_number: 3, start_time: '10:30', end_time: '11:15', class_name: '1 PUC', section_name: 'A', room_number: '101', floor: 1 }
          ]
        });
      }
    } finally {
      setDetailLoading(false);
    }
  };

  // Acknowledge substitution duty
  const handleAcknowledgeSub = async (subId: string) => {
    try {
      await apiFetch(`/teachers/substitutions/${subId}/acknowledge`, { method: 'POST' });
      setNotification({ type: 'success', message: 'Substitution duty acknowledged successfully.' });
      loadMySchedule();
      loadSubstitutionCenter();
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  // Mark Teacher Absent
  const handleMarkAbsent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!absentTeacherId) return;

    try {
      const res = await apiFetch<any>('/substitutions/absence', {
        method: 'POST',
        body: JSON.stringify({
          teacher_id: absentTeacherId,
          date: subDate,
          reason: absentReason
        })
      });
      setShowMarkAbsentModal(false);
      setAbsentTeacherId('');
      setNotification({ type: 'success', message: res.message });
      setTimeout(() => setNotification(null), 5000);
      loadSubstitutionCenter();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Open Assign Substitute Modal. Passing a teacher id pre-selects it (used
  // by the inline "Recommended" quick-assign action) instead of leaving the
  // list unselected.
  const handleOpenAssignModal = async (req: any, presetSubstituteId?: string) => {
    setSelectedReq(req);
    setSelectedSubstituteId(presetSubstituteId || '');
    setAssignRemarks('');
    try {
      const res = await apiFetch<any>(
        `/substitutions/available-teachers?branch_id=${currentBranch?.id || ''}&date=${subDate}&day_of_week=${req.dayOfWeek}&period_number=${req.timetableEntry.period_number}&exclude_teacher_id=${req.timetableEntry.teacher_id}`
      );
      setAvailableTeachers(res.teachers || []);
    } catch (err: any) {
      console.error('Failed to fetch available teachers', err);
    }
  };

  // Submit Substitute Assignment
  const handleAssignSubstitute = async () => {
    if (!selectedReq || !selectedSubstituteId) return;
    setIsAssigning(true);
    try {
      const res = await apiFetch<any>('/substitutions/assign', {
        method: 'POST',
        body: JSON.stringify({
          timetable_entry_id: selectedReq.timetableEntry.id,
          date: subDate,
          original_teacher_id: selectedReq.timetableEntry.teacher_id,
          substitute_teacher_id: selectedSubstituteId,
          remarks: assignRemarks
        })
      });
      setSelectedReq(null);
      setNotification({ type: 'success', message: res.message });
      setTimeout(() => setNotification(null), 5000);
      loadSubstitutionCenter();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  // Create Faculty Profile
  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/teachers', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setShowCreateModal(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        employee_id: '',
        department_id: '',
        designation: 'Faculty',
        qualification: 'M.Sc., B.Ed',
        experience_years: 3
      });
      setNotification({ type: 'success', message: 'New faculty member registered successfully.' });
      setTimeout(() => setNotification(null), 4000);
      loadDirectory();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Filter teachers
  const filteredTeachers = teachers.filter((t) => {
    const matchesDept = selectedDept === 'ALL' || t.department_id === selectedDept;
    const matchesSearch =
      searchQuery === '' ||
      t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.employee_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.qualification?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Card */}
      <div className="bg-[#fdfcfb] rounded-3xl p-6 sm:p-8 border border-[#ded9cf] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#ede9df] border border-[#dcd7cb] flex items-center justify-center p-2.5 shrink-0">
            <IconStaffs className="w-10 h-10 text-slate-800" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">
                Faculty & Teaching Staff
              </h1>
              <span className="bg-[#e8e4db] text-slate-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-[#dcd7cb]">
                {teachers.length} Faculty Members
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Academic departments, weekly timetables, classroom allocations, and real-time proxy duty management.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isManagement && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Add New Faculty
            </button>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-2 text-xs font-semibold ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCheck className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-[#ded9cf] gap-2 sm:gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('directory')}
          className={`pb-3 text-xs sm:text-sm font-bold whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'directory'
              ? 'border-b-2 border-blue-600 text-blue-700'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          Faculty Directory ({filteredTeachers.length})
        </button>

        {isFaculty && (
          <button
            onClick={() => setActiveTab('my-schedule')}
            className={`pb-3 text-xs sm:text-sm font-bold whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === 'my-schedule'
                ? 'border-b-2 border-blue-600 text-blue-700'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            My Schedule & Duties
            {myTimetableData?.substitutionDuties?.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-amber-500 text-white rounded-full font-bold">
                {myTimetableData.substitutionDuties.length}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('substitutions')}
          className={`pb-3 text-xs sm:text-sm font-bold whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'substitutions'
              ? 'border-b-2 border-blue-600 text-blue-700'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck2 className="w-4 h-4" />
          Substitution & Proxy Center
          {substitutionData?.requirements?.filter((r: any) => !r.substitutionAssignment).length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] bg-rose-500 text-white rounded-full font-bold">
              {substitutionData.requirements.filter((r: any) => !r.substitutionAssignment).length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FACULTY DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-[#fdfcfb] p-4 rounded-2xl border border-[#ded9cf] flex flex-col sm:flex-row gap-3 items-center justify-between">
            {user?.role !== 'HOD' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">Department:</span>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="bg-white border border-[#ded9cf] rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold outline-none"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {user?.role === 'HOD' && (
              <div className="flex items-center gap-2 w-full sm:w-auto text-xs font-semibold text-slate-600">
                <Filter className="w-4 h-4 text-slate-400" />
                Showing your department's faculty only.
              </div>
            )}

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search faculty by name, ID..."
                className="w-full pl-9 pr-4 py-1.5 bg-white border border-[#ded9cf] rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Teacher Cards Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="p-12 text-center bg-[#fdfcfb] rounded-3xl border border-[#ded9cf] text-slate-400 text-sm">
              No faculty members found matching your search or filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTeachers.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleViewTeacher(t.id)}
                  className="bg-[#fdfcfb] hover:bg-white rounded-3xl p-5 border border-[#ded9cf] hover:border-blue-300 transition-all duration-150 shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 shrink-0">
                          {(t.avatar_url || t.photo_url) ? (
                            <img
                              src={t.avatar_url || t.photo_url}
                              alt={t.name}
                              className="w-12 h-12 rounded-2xl object-cover border border-blue-200"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-base font-heading">
                              {t.name
                                ?.split(' ')
                                .map((n: string) => n[0])
                                .slice(0, 2)
                                .join('')}
                            </div>
                          )}
                          <span
                            title={t.is_absent_today ? 'Absent today' : 'Present today'}
                            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                              t.is_absent_today ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                          />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition">
                            {t.name}
                          </h3>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {t.designation || 'Faculty'} • {t.department_name || 'Physics'}
                          </span>
                          <span className={`ml-2 text-[10px] font-bold ${t.is_absent_today ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {t.is_absent_today ? 'Absent' : 'Present'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-[#ede9df] text-slate-700 px-2 py-0.5 rounded-lg">
                        {t.employee_id}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#f2eee6] space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{t.qualification || 'M.Sc.'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{t.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t.phone || '+91 98450 12345'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#f2eee6] flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span className="text-blue-700 font-bold text-[11px] flex items-center gap-1 group-hover:underline">
                      View Timetable & Assignments
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {t.period_count || 0} Periods/Wk
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MY SCHEDULE & DUTIES (TEACHER VIEW) */}
      {/* ========================================================================= */}
      {activeTab === 'my-schedule' && isFaculty && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#fdfcfb] p-5 rounded-2xl border border-[#ded9cf]">
              <div className="text-xs text-slate-500 font-semibold">Today's Lectures</div>
              <div className="text-2xl font-extrabold text-slate-900 font-heading mt-1">
                {myTimetableData?.todayTimetable?.length || 0} Periods
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Day: {myTimetableData?.currentDay}
              </div>
            </div>

            <div className="bg-[#fdfcfb] p-5 rounded-2xl border border-[#ded9cf]">
              <div className="text-xs text-slate-500 font-semibold">Assigned Proxy Duties</div>
              <div
                className={`text-2xl font-extrabold font-heading mt-1 ${
                  (myTimetableData?.substitutionDuties?.length || 0) > 0
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              >
                {myTimetableData?.substitutionDuties?.length || 0} Active
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Requires Acknowledgment
              </div>
            </div>

            <div className="bg-[#fdfcfb] p-5 rounded-2xl border border-[#ded9cf]">
              <div className="text-xs text-slate-500 font-semibold">Class Teacher Assigned</div>
              <div className="text-2xl font-extrabold text-blue-700 font-heading mt-1">
                {myProfileData?.assignments?.filter((a: any) => a.is_class_teacher === 1).length > 0
                  ? 'Yes'
                  : 'Faculty'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {myProfileData?.profile?.department_name} Department
              </div>
            </div>
          </div>

          {/* Substitution alerts for me */}
          {myTimetableData?.substitutionDuties?.length > 0 && (
            <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-3xl p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-amber-900 font-heading">
                    Proxy Substitution Duty Assigned
                  </h3>
                  <p className="text-xs text-amber-700 mt-0.5">
                    HOD allocated substitution periods for absent colleagues. Please acknowledge below.
                  </p>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {myTimetableData.substitutionDuties.map((sub: any) => (
                      <div
                        key={sub.id}
                        className="bg-white rounded-2xl p-4 border border-[#fde68a] flex items-center justify-between"
                      >
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

          {/* Today's Lectures */}
          <div className="bg-[#fdfcfb] rounded-3xl p-6 border border-[#ded9cf]">
            <h3 className="font-bold text-slate-900 text-base mb-4 font-heading flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Today's Schedule ({myTimetableData?.currentDay})
            </h3>

            {(!myTimetableData?.todayTimetable || myTimetableData.todayTimetable.length === 0) ? (
              <p className="text-slate-400 text-xs py-4">No scheduled lectures for today.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myTimetableData.todayTimetable.map((period: any) => (
                  <div
                    key={period.id}
                    className="bg-white rounded-2xl p-4 border border-[#ded9cf] shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg">
                        PERIOD {period.period_number}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {period.start_time} - {period.end_time}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{period.subject_name}</h4>
                    <p className="text-xs text-blue-700 font-semibold mt-0.5">
                      {period.class_name} • Section {period.section_name} ({period.batch_name})
                    </p>
                    <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        Room {period.room_number} (Fl {period.floor})
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        CONFIRMED
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SUBSTITUTION & PROXY CENTER */}
      {/* ========================================================================= */}
      {activeTab === 'substitutions' && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="bg-[#fdfcfb] rounded-2xl p-5 border border-[#ded9cf] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                <UserCheck2 className="w-5 h-5 text-blue-600" />
                Live Substitution & Proxy Hub
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically identifies absent faculty timetable conflicts and recommends an available proxy teacher for each affected period.
              </p>
              {user?.role === 'HOD' && (
                <p className="text-[10px] text-blue-600 font-semibold mt-1">
                  Showing your department's faculty only.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 bg-white border border-[#ded9cf] rounded-xl px-3 py-1.5 text-xs">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={subDate}
                  onChange={(e) => setSubDate(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 outline-none"
                />
              </div>

              {(isManagement || isFaculty) && (
                <button
                  onClick={() => {
                    if (!isManagement && myProfileData?.profile?.id) {
                      setAbsentTeacherId(myProfileData.profile.id);
                    }
                    setShowMarkAbsentModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition whitespace-nowrap"
                >
                  <UserX className="w-4 h-4" />
                  {isManagement ? 'Mark Teacher Absent' : 'Mark Myself Absent'}
                </button>
              )}
            </div>
          </div>

          {/* Absent Faculty List — always shows every absentee for the date,
              even when they have no timetable periods scheduled today, so
              the count above the fold always matches a visible name. */}
          {substitutionData?.absences && substitutionData.absences.length > 0 && (
            <div className="bg-[#fdfcfb] rounded-3xl border border-[#ded9cf] overflow-hidden">
              <div className="p-4 border-b border-[#ded9cf]">
                <span className="text-xs font-bold text-slate-800">
                  Absent Faculty Today ({substitutionData.absences.length})
                </span>
              </div>
              <div className="divide-y divide-[#f2eee6]">
                {substitutionData.absences.map((abs: any) => {
                  const periodCount = (substitutionData.requirements || []).filter(
                    (r: any) => r.absence?.teacher_id === abs.teacher_id
                  ).length;
                  return (
                    <div key={abs.teacher_id} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-800 font-bold text-xs shrink-0">
                          {abs.teacher_name
                            ?.split(' ')
                            .map((n: string) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {abs.teacher_name} <span className="text-slate-400 font-mono font-normal">({abs.employee_id})</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {abs.department_name || 'Unassigned Department'} • <span className="italic">{abs.reason}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                        {periodCount > 0 ? `${periodCount} period(s) today` : 'No periods scheduled today'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Requirements List */}
          <div className="bg-[#fdfcfb] rounded-3xl border border-[#ded9cf] overflow-hidden">
            <div className="p-4 border-b border-[#ded9cf] flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Affected Timetable Periods ({substitutionData?.requirements?.length || 0})
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                {substitutionData?.absentTeacherCount || 0} Faculty absent on {subDate}
              </span>
            </div>

            {(!substitutionData?.requirements || substitutionData.requirements.length === 0) ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                {substitutionData?.absences && substitutionData.absences.length > 0
                  ? 'None of today\'s absent faculty have any timetable periods scheduled for this day.'
                  : `No teacher absences reported for ${subDate}. All regular classes are in order.`}
              </div>
            ) : (
              <div className="divide-y divide-[#f2eee6]">
                {substitutionData.requirements.map((req: any, idx: number) => {
                  const entry = req.timetableEntry;
                  const sub = req.substitutionAssignment;

                  return (
                    <div
                      key={idx}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white transition"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col items-center justify-center shrink-0 text-amber-900">
                          <span className="text-[9px] uppercase font-bold text-amber-700">Period</span>
                          <span className="text-sm font-extrabold">{entry.period_number}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm font-heading">
                              {entry.subject_name}
                            </span>
                            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                              {entry.class_name} • Section {entry.section_name} ({entry.batch_name})
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              {entry.start_time} - {entry.end_time}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span>
                              Absent: <strong className="text-rose-700">{req.absence?.teacher_name}</strong> (
                              {req.absence?.employee_id})
                            </span>
                            <span>
                              Room: <strong className="text-slate-800">{entry.room_number}</strong> (Floor{' '}
                              {entry.floor})
                            </span>
                            <span>
                              Reason: <span className="text-slate-500 italic">{req.absence?.reason}</span>
                            </span>
                          </div>

                          {sub ? (
                            <div className="mt-2 text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Proxy Substitute: <strong>{sub.substitute_teacher_name}</strong> (
                              {sub.substitute_employee_id}) • Status: {sub.status}
                            </div>
                          ) : req.recommendedSubstitute ? (
                            <div className="mt-2 text-xs text-blue-700 font-semibold flex items-center gap-1.5">
                              <UserCheck2 className="w-3.5 h-3.5" />
                              Recommended Proxy: <strong>{req.recommendedSubstitute.teacher_name}</strong> (
                              {req.recommendedSubstitute.employee_id}) — {req.recommendedSubstitute.department_name || 'free this period'}
                            </div>
                          ) : (
                            <div className="mt-2 text-xs text-amber-700 font-semibold flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5" />
                              SUBSTITUTION REQUIRED — no faculty currently free for this period
                            </div>
                          )}
                        </div>
                      </div>

                      {isManagement && (
                        <div className="shrink-0 flex items-center gap-2">
                          {!sub && req.recommendedSubstitute && (
                            <button
                              onClick={() => handleOpenAssignModal(req, req.recommendedSubstitute.teacher_id)}
                              className="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            >
                              Quick Assign
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenAssignModal(req)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                              sub
                                ? 'bg-[#ede9df] hover:bg-[#e0dbcf] text-slate-800'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                            }`}
                          >
                            {sub ? 'Change Proxy' : 'Assign Proxy'}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TEACHER PROFILE & TIMETABLE DETAIL */}
      {/* ========================================================================= */}
      {selectedTeacherId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-[#ded9cf] my-8">
            <div className="bg-[#fdfcfb] p-6 border-b border-[#ded9cf] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-900 font-heading">
                  {selectedTeacherDetail?.profile?.name || 'Faculty Details'}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedTeacherDetail?.profile?.designation} • {selectedTeacherDetail?.profile?.department_name} Department
                </p>
              </div>
              <button
                onClick={() => setSelectedTeacherId(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {detailLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Personal & Professional Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#fdfcfb] border border-[#ded9cf] text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Employee ID</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {selectedTeacherDetail?.profile?.employee_id}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Qualification</span>
                    <span className="font-bold text-slate-800">
                      {selectedTeacherDetail?.profile?.qualification}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Phone</span>
                    <span className="font-bold text-slate-800">
                      {selectedTeacherDetail?.profile?.user_phone || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Email</span>
                    <span className="font-bold text-slate-800 truncate block">
                      {selectedTeacherDetail?.profile?.user_email}
                    </span>
                  </div>
                </div>

                {/* Academic Assignments */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                    Assigned Classes & Subjects ({selectedTeacherDetail?.assignments?.length || 0})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedTeacherDetail?.assignments?.map((asg: any) => (
                      <div
                        key={asg.id}
                        className="p-3.5 rounded-2xl border border-[#ded9cf] bg-[#fdfcfb]"
                      >
                        <div className="font-bold text-slate-900 text-xs">{asg.subject_name}</div>
                        <div className="text-[11px] text-blue-700 font-semibold mt-0.5">
                          {asg.class_name} Section {asg.section_name} ({asg.batch_name})
                        </div>
                        {asg.is_class_teacher === 1 && (
                          <span className="inline-block mt-2 px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[9px] font-bold">
                            Class Teacher
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weekly Timetable Grid */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                    Weekly Schedule Matrix
                  </h4>
                  <div className="border border-[#ded9cf] rounded-2xl overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#fdfcfb] border-b border-[#ded9cf] text-slate-600 font-bold">
                          <th className="py-2.5 px-3 w-24">Day</th>
                          {[1, 2, 3, 4, 5, 6].map((p) => (
                            <th key={p} className="py-2.5 px-3">
                              P{p}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f2eee6]">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
                          const periods = selectedTeacherDetail?.timetable?.filter(
                            (w: any) => w.day_of_week === day
                          );
                          return (
                            <tr key={day} className="hover:bg-[#fdfcfb]">
                              <td className="py-2.5 px-3 font-bold text-slate-800 bg-[#fdfcfb]">{day}</td>
                              {[1, 2, 3, 4, 5, 6].map((pNum) => {
                                const match = periods?.find((p: any) => p.period_number === pNum);
                                return (
                                  <td key={pNum} className="py-2.5 px-3">
                                    {match ? (
                                      <div className={`p-1.5 rounded-xl text-[10px] border ${match.substitute_teacher_name ? 'bg-amber-50 border-amber-300' : 'bg-blue-50 border-blue-200'}`}>
                                        <div className={`font-bold ${match.substitute_teacher_name ? 'text-amber-900' : 'text-blue-900'}`}>{match.subject_name}</div>
                                        <div className={match.substitute_teacher_name ? 'text-amber-700' : 'text-blue-700'}>
                                          {match.class_name} {match.section_name}
                                        </div>
                                        <div className="text-slate-400">
                                          {match.start_time}–{match.end_time} • Rm {match.room_number} (Fl {match.floor})
                                        </div>
                                        {match.substitute_teacher_name && (
                                          <div className="mt-1 pt-1 border-t border-amber-200 font-bold text-amber-800">
                                            Replaced by {match.substitute_teacher_name}
                                            <span className="block font-normal text-amber-600">
                                              {match.substitution_status === 'ACKNOWLEDGED' ? 'Confirmed' : 'Pending confirmation'}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-slate-300 text-[10px]">--</span>
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
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: MARK TEACHER ABSENT */}
      {/* ========================================================================= */}
      {showMarkAbsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-[#ded9cf]">
            <div className="bg-[#fdfcfb] p-5 border-b border-[#ded9cf] flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 font-heading">
                <UserX className="w-4 h-4 text-rose-600" />
                Record Faculty Absence / Leave
              </h3>
              <button onClick={() => setShowMarkAbsentModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleMarkAbsent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Faculty Member</label>
                <select
                  required
                  disabled={!isManagement}
                  value={absentTeacherId}
                  onChange={(e) => setAbsentTeacherId(e.target.value)}
                  className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none disabled:opacity-70"
                >
                  {isManagement && <option value="">-- Choose Faculty --</option>}
                  {isManagement
                    ? (substitutionData?.presentTeachers && substitutionData.presentTeachers.length > 0
                        ? substitutionData.presentTeachers.map((t: any) => ({ id: t.teacher_id, name: t.teacher_name, employee_id: t.employee_id, department_name: t.department_name }))
                        : teachers.filter((t) => !substitutionData?.absentTeacherIds?.includes(t.id))
                      ).map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.employee_id}) - {t.department_name}
                        </option>
                      ))
                    : (
                        <option value={absentTeacherId}>
                          {myProfileData?.profile?.name || 'Myself'}
                        </option>
                      )}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  {isManagement ? 'Only faculty currently marked present are listed.' : 'Faculty can only mark themselves absent.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Absence Date</label>
                <input
                  type="date"
                  value={subDate}
                  onChange={(e) => setSubDate(e.target.value)}
                  className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Notes</label>
                <input
                  type="text"
                  value={absentReason}
                  onChange={(e) => setAbsentReason(e.target.value)}
                  placeholder="e.g. Medical emergency / Academic training"
                  className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMarkAbsentModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Record Absence & Find Proxies
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ASSIGN PROXY SUBSTITUTE */}
      {/* ========================================================================= */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#ded9cf]">
            <div className="bg-[#fdfcfb] p-5 border-b border-[#ded9cf] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 font-heading">
                  Allocate Proxy Substitute • Period {selectedReq.timetableEntry.period_number}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedReq.timetableEntry.subject_name} • Room {selectedReq.timetableEntry.room_number}
                </p>
              </div>
              <button onClick={() => setSelectedReq(null)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <label className="block text-xs font-bold text-slate-700">
                Available Faculty for Period {selectedReq.timetableEntry.period_number}
              </label>

              <div className="space-y-2">
                {availableTeachers.map((t: any) => (
                  <label
                    key={t.teacher_id}
                    className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                      selectedSubstituteId === t.teacher_id
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400/20'
                        : 'bg-white border-[#ded9cf] hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="substituteTeacher"
                        value={t.teacher_id}
                        checked={selectedSubstituteId === t.teacher_id}
                        onChange={() => setSelectedSubstituteId(t.teacher_id)}
                        className="text-blue-600"
                      />
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{t.name}</div>
                        <div className="text-[10px] text-slate-500">
                          {t.employee_id} • {t.department_name} ({t.designation})
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        t.isFree
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {t.statusLabel}
                    </span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Remarks for Proxy</label>
                <input
                  type="text"
                  value={assignRemarks}
                  onChange={(e) => setAssignRemarks(e.target.value)}
                  placeholder="e.g. Please cover Ray Optics derivations"
                  className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedReq(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignSubstitute}
                  disabled={!selectedSubstituteId || isAssigning}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {isAssigning ? 'Assigning...' : 'Confirm Proxy Allocation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CREATE NEW FACULTY PROFILE */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#ded9cf]">
            <div className="bg-[#fdfcfb] p-5 border-b border-[#ded9cf] flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 font-heading flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                Register New Faculty Member
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFaculty} className="p-6 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Raghavendra Rao"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-PHY-009"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <select
                    required
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  >
                    <option value="">-- Choose Department --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                  <select
                    required
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  >
                    {designations.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="raghavendra@sirmv.edu.in"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98450 12345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Qualification</label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    value={formData.experience_years}
                    onChange={(e) =>
                      setFormData({ ...formData, experience_years: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Register Faculty Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
