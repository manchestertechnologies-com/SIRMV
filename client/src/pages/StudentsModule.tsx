import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Search,
  Plus,
  Filter,
  User,
  Phone,
  Mail,
  Home,
  BookOpen,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  GraduationCap,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  CheckCheck
} from 'lucide-react';
import { IconStudents } from '../components/ModuleIcons';

export const StudentsModule: React.FC = () => {
  const { user, currentBranch } = useAuth();

  // State
  const [students, setStudents] = useState<any[]>([]);
  const [options, setOptions] = useState<{ classes: any[]; sections: any[]; batches: any[]; hostelRooms: any[] }>({
    classes: [],
    sections: [],
    batches: [],
    hostelRooms: []
  });

  // Filters
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [selectedBatch, setSelectedBatch] = useState<string>('ALL');
  const [selectedResStatus, setSelectedResStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Student 360 Modal
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetail, setStudentDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Personal Profile View for Student/Parent
  const [myProfileData, setMyProfileData] = useState<any | null>(null);

  // Register Student Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    admission_number: '',
    roll_number: '',
    class_id: '',
    section_id: '',
    batch_id: '',
    gender: 'Male',
    date_of_birth: '2008-05-15',
    blood_group: 'O+',
    residential_status: 'DAY_SCHOLAR',
    father_name: '',
    mother_name: '',
    parent_phone: '',
    parent_email: '',
    parent_address: ''
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isManagement = ['ADMIN', 'PRINCIPAL', 'HOD'].includes(user?.role || '');
  const isStudentOrParent = user?.role === 'STUDENT' || user?.role === 'PARENT';

  // Load Metadata Options & Student Roster
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [optRes, stdRes] = await Promise.all([
        apiFetch<any>(`/students/options/classes-batches?branch_id=${currentBranch?.id || ''}`),
        apiFetch<any>(`/students?branch_id=${currentBranch?.id || ''}`)
      ]);
      setOptions(optRes);
      setStudents(stdRes.students || []);

      if (isStudentOrParent) {
        const myRes = await apiFetch<any>('/students/me/profile');
        setMyProfileData(myRes);
      }
    } catch (err: any) {
      console.error('Failed to load students data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentBranch, user]);

  // Load Student 360 Detail
  const handleViewStudent = async (id: string) => {
    setSelectedStudentId(id);
    setDetailLoading(true);
    try {
      const res = await apiFetch<any>(`/students/${id}`);
      setStudentDetail(res);
    } catch (err: any) {
      alert('Failed to load student profile: ' + err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  // Submit New Student Enrollment
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/students', {
        method: 'POST',
        body: JSON.stringify(createForm)
      });
      setShowCreateModal(false);
      setNotification({ type: 'success', message: 'Student and guardian successfully enrolled.' });
      setTimeout(() => setNotification(null), 4000);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filter Logic
  const filteredStudents = students.filter((s) => {
    const matchClass = selectedClass === 'ALL' || s.class_id === selectedClass;
    const matchSec = selectedSection === 'ALL' || s.section_id === selectedSection;
    const matchBatch = selectedBatch === 'ALL' || s.batch_id === selectedBatch;
    const matchRes = selectedResStatus === 'ALL' || s.residential_status === selectedResStatus;
    const matchSearch =
      searchQuery === '' ||
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admission_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.roll_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parent_phone?.includes(searchQuery);
    return matchClass && matchSec && matchBatch && matchRes && matchSearch;
  });

  const totalEnrolled = students.length;
  const hostellerCount = students.filter((s) => s.residential_status === 'HOSTELLER').length;
  const dayScholarCount = totalEnrolled - hostellerCount;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Card */}
      <div className="bg-[#fdfcfb] rounded-3xl p-6 sm:p-8 border border-[#ded9cf] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#e0f2fe] border border-[#bae6fd] flex items-center justify-center p-2.5 shrink-0">
            <IconStudents className="w-10 h-10 text-sky-800" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">
                Students & Academic Enrollment
              </h1>
              <span className="bg-[#e0f2fe] text-sky-900 text-xs px-2.5 py-0.5 rounded-full font-bold border border-[#bae6fd]">
                {totalEnrolled} Enrolled
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Comprehensive student registry, class section allocations, parent linkages, and residential tracking.
            </p>
          </div>
        </div>

        {/* Quick Metrics & Registration */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-3">
            <div className="bg-[#ede9df] px-3.5 py-2 rounded-2xl text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Hostellers</div>
              <div className="text-sm font-extrabold text-slate-900 font-heading">{hostellerCount}</div>
            </div>
            <div className="bg-[#ede9df] px-3.5 py-2 rounded-2xl text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Day Scholars</div>
              <div className="text-sm font-extrabold text-slate-900 font-heading">{dayScholarCount}</div>
            </div>
          </div>

          {isManagement && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Enroll Student
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
          <CheckCheck className="w-4 h-4 text-emerald-600" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* PERSONAL PROFILE BANNER FOR STUDENT/PARENT ROLE */}
      {isStudentOrParent && myProfileData && (
        <div className="bg-white rounded-3xl p-6 border border-[#ded9cf] shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-base font-heading">
                {myProfileData.profile.name
                  ?.split(' ')
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 font-heading">
                  {myProfileData.profile.name}
                </h2>
                <div className="text-xs text-slate-500">
                  Adm: <span className="font-mono font-bold text-slate-800">{myProfileData.profile.admission_number}</span> •{' '}
                  {myProfileData.profile.class_name} Section {myProfileData.profile.section_name} ({myProfileData.profile.batch_name})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
                Attendance: {myProfileData.attendanceStats?.percentage || 100}%
              </span>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">
                {myProfileData.profile.residential_status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Guardian</span>
              <span className="font-bold text-slate-800">{myProfileData.profile.father_name || 'Parent'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Emergency Phone</span>
              <span className="font-bold text-slate-800">{myProfileData.profile.parent_phone}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Blood Group</span>
              <span className="font-bold text-slate-800">{myProfileData.profile.blood_group}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Hostel Info</span>
              <span className="font-bold text-slate-800">
                {myProfileData.hostelInfo
                  ? `${myProfileData.hostelInfo.block_name} (Rm ${myProfileData.hostelInfo.room_number})`
                  : 'Day Scholar'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-[#fdfcfb] p-4 rounded-2xl border border-[#ded9cf] flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-white border border-[#ded9cf] rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold outline-none"
          >
            <option value="ALL">All Classes</option>
            {options.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Section Filter */}
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="bg-white border border-[#ded9cf] rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold outline-none"
          >
            <option value="ALL">All Sections</option>
            {options.sections.map((s) => (
              <option key={s.id} value={s.id}>
                Section {s.name}
              </option>
            ))}
          </select>

          {/* Batch Filter */}
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="bg-white border border-[#ded9cf] rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold outline-none"
          >
            <option value="ALL">All Batches</option>
            {options.batches.map((b) => (
              <option key={b.id} value={b.id}>
                Batch {b.name}
              </option>
            ))}
          </select>

          {/* Residence Filter */}
          <select
            value={selectedResStatus}
            onChange={(e) => setSelectedResStatus(e.target.value)}
            className="bg-white border border-[#ded9cf] rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold outline-none"
          >
            <option value="ALL">All Residencies</option>
            <option value="DAY_SCHOLAR">Day Scholar</option>
            <option value="HOSTELLER">Hosteller</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student, roll, parent..."
            className="w-full pl-9 pr-4 py-1.5 bg-white border border-[#ded9cf] rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Students Grid / Table */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="p-12 text-center bg-[#fdfcfb] rounded-3xl border border-[#ded9cf] text-slate-400 text-sm">
          No students found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((s) => (
            <div
              key={s.id}
              onClick={() => handleViewStudent(s.id)}
              className="bg-[#fdfcfb] hover:bg-white rounded-3xl p-5 border border-[#ded9cf] hover:border-blue-300 transition-all duration-150 shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-800 font-bold text-sm font-heading shrink-0">
                      {s.name
                        ?.split(' ')
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition">
                        {s.name}
                      </h3>
                      <div className="text-[11px] font-semibold text-slate-500">
                        Roll: <span className="font-mono text-slate-800 font-bold">{s.roll_number}</span> •{' '}
                        {s.class_name} {s.section_name}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      s.residential_status === 'HOSTELLER'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {s.residential_status === 'HOSTELLER' ? 'Hostel' : 'Day Scholar'}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-[#f2eee6] space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Admission No:</span>
                    <span className="font-mono font-bold text-slate-800">{s.admission_number}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Batch Stream:</span>
                    <span className="font-semibold text-blue-700">{s.batch_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Parent / Phone:</span>
                    <span className="font-medium text-slate-700">
                      {s.father_name || 'Parent'} ({s.parent_phone || 'N/A'})
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#f2eee6] flex items-center justify-between text-xs font-semibold text-blue-700">
                <span className="flex items-center gap-1 group-hover:underline">
                  View Student 360° Profile
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {s.hostel_room_number ? `Rm ${s.hostel_room_number}` : 'Day'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: STUDENT 360° PROFILE */}
      {/* ========================================================================= */}
      {selectedStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-[#ded9cf] my-8">
            <div className="bg-[#fdfcfb] p-6 border-b border-[#ded9cf] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-900 font-heading">
                  {studentDetail?.student?.name || 'Student Profile'}
                </h3>
                <p className="text-xs text-slate-500">
                  {studentDetail?.student?.class_name} Section {studentDetail?.student?.section_name} •{' '}
                  Batch {studentDetail?.student?.batch_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentId(null)}
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
                {/* 1. Academic & Personal Highlights */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#fdfcfb] border border-[#ded9cf] text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Admission No</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {studentDetail?.student?.admission_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Roll Number</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {studentDetail?.student?.roll_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Gender / Blood</span>
                    <span className="font-bold text-slate-800">
                      {studentDetail?.student?.gender} • {studentDetail?.student?.blood_group}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Residency</span>
                    <span className="font-bold text-slate-800">
                      {studentDetail?.student?.residential_status}
                    </span>
                  </div>
                </div>

                {/* 2. Guardian Details */}
                <div className="p-4 rounded-2xl border border-[#ded9cf] bg-white space-y-2 text-xs">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Parent / Guardian Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <span className="text-slate-400 block">Father Name</span>
                      <span className="font-semibold text-slate-800">
                        {studentDetail?.student?.father_name || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Primary Contact</span>
                      <span className="font-semibold text-slate-800">
                        {studentDetail?.student?.parent_phone || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Residential Address</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {studentDetail?.student?.parent_address || 'Davangere, Karnataka'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Hostel Room Allocation (If Hosteller) */}
                {studentDetail?.student?.residential_status === 'HOSTELLER' && (
                  <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-2 text-xs">
                    <h4 className="font-bold text-amber-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5 text-amber-700" />
                      Hostel Room Allocation
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <span className="text-amber-700 block">Hostel Block</span>
                        <span className="font-bold text-slate-900">
                          {studentDetail?.student?.hostel_block_name || 'Cauvery Boys Hostel'}
                        </span>
                      </div>
                      <div>
                        <span className="text-amber-700 block">Room Number</span>
                        <span className="font-bold text-slate-900">
                          Room {studentDetail?.student?.hostel_room_number} (Floor {studentDetail?.student?.hostel_floor_number || 1})
                        </span>
                      </div>
                      <div>
                        <span className="text-amber-700 block">Bed Assignment</span>
                        <span className="font-bold text-slate-900">
                          Bed {studentDetail?.student?.bed_number || 'A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Enrolled Subjects */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                    Enrolled Academic Subjects ({studentDetail?.enrolledSubjects?.length || 0})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {studentDetail?.enrolledSubjects?.map((subj: any) => (
                      <div
                        key={subj.id}
                        className="p-2.5 rounded-xl border border-[#ded9cf] bg-[#fdfcfb] text-xs font-semibold text-slate-800 flex items-center justify-between"
                      >
                        <span>{subj.subject_name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{subj.subject_code}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Recent Exam Performance */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                    Recent Examination Scores
                  </h4>
                  {(!studentDetail?.marks || studentDetail.marks.length === 0) ? (
                    <p className="text-slate-400 text-xs">No exam records uploaded yet.</p>
                  ) : (
                    <div className="border border-[#ded9cf] rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#fdfcfb] text-slate-600 font-bold border-b border-[#ded9cf]">
                          <tr>
                            <th className="py-2.5 px-3">Exam</th>
                            <th className="py-2.5 px-3">Subject</th>
                            <th className="py-2.5 px-3">Marks Obtained</th>
                            <th className="py-2.5 px-3">Percentage</th>
                            <th className="py-2.5 px-3">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f2eee6]">
                          {studentDetail.marks.map((m: any) => {
                            const pct = Math.round((m.marks_obtained / m.max_marks) * 100);
                            return (
                              <tr key={m.id} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-bold text-slate-900">{m.exam_name}</td>
                                <td className="py-2.5 px-3">{m.subject_name}</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                                  {m.marks_obtained} / {m.max_marks}
                                </td>
                                <td className="py-2.5 px-3 font-semibold">{pct}%</td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                                    {m.grade || 'A+'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ENROLL NEW STUDENT */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-[#ded9cf] my-8">
            <div className="bg-[#fdfcfb] p-5 border-b border-[#ded9cf] flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 font-heading flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                Student Enrollment & Guardian Registration
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Student Academic Details
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Student Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Kulkarni"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Admission Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SIRMV-2026-088"
                    value={createForm.admission_number}
                    onChange={(e) => setCreateForm({ ...createForm, admission_number: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Class</label>
                  <select
                    required
                    value={createForm.class_id}
                    onChange={(e) => setCreateForm({ ...createForm, class_id: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  >
                    <option value="">-- Select Class --</option>
                    {options.classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Section</label>
                  <select
                    required
                    value={createForm.section_id}
                    onChange={(e) => setCreateForm({ ...createForm, section_id: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  >
                    <option value="">-- Select Section --</option>
                    {options.sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        Section {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Competitive Batch</label>
                  <select
                    required
                    value={createForm.batch_id}
                    onChange={(e) => setCreateForm({ ...createForm, batch_id: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  >
                    <option value="">-- Select Batch --</option>
                    {options.batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        Batch {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Residential Status</label>
                  <select
                    value={createForm.residential_status}
                    onChange={(e) => setCreateForm({ ...createForm, residential_status: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  >
                    <option value="DAY_SCHOLAR">Day Scholar</option>
                    <option value="HOSTELLER">Hosteller</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                  <input
                    type="text"
                    value={createForm.blood_group}
                    onChange={(e) => setCreateForm({ ...createForm, blood_group: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Roll Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 24"
                    value={createForm.roll_number}
                    onChange={(e) => setCreateForm({ ...createForm, roll_number: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>

              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider pt-2 border-t border-slate-100">
                Parent / Guardian Details
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Father's Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Kulkarni"
                    value={createForm.father_name}
                    onChange={(e) => setCreateForm({ ...createForm, father_name: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mother's Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sunita Kulkarni"
                    value={createForm.mother_name}
                    onChange={(e) => setCreateForm({ ...createForm, mother_name: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Primary Phone (SMS/OTP)</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98450 67890"
                    value={createForm.parent_phone}
                    onChange={(e) => setCreateForm({ ...createForm, parent_phone: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Residential Address</label>
                  <input
                    type="text"
                    placeholder="e.g. MCC B Block, Davangere"
                    value={createForm.parent_address}
                    onChange={(e) => setCreateForm({ ...createForm, parent_address: e.target.value })}
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
                  Confirm Student Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
