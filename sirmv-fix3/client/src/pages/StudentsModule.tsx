import React, { useState, useEffect } from 'react';
import { showToast } from '../utils/toast';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Plus,
  Phone,
  Home,
  ChevronRight,
  CheckCheck,
  Eye,
  UploadCloud,
  FileCheck2,
  FileX2,
  X
} from 'lucide-react';
import { IconStudents } from '../components/ModuleIcons';
import { INITIAL_STUDENTS } from '../data/mockInstitutionalData';

const DOC_TYPES = ['AADHAR', 'STUDY_CERTIFICATE', 'SSLC_MARKS_CARD', 'TC', 'CASTE_INCOME_CERTIFICATE', 'EWS', 'PWD'];
const DOC_LABELS: Record<string, string> = {
  AADHAR: 'Aadhar Card',
  STUDY_CERTIFICATE: 'Study Certificate',
  SSLC_MARKS_CARD: 'SSLC Marks Card',
  TC: 'Transfer Certificate (TC)',
  CASTE_INCOME_CERTIFICATE: 'Caste & Income Certificate',
  EWS: 'EWS Certificate',
  PWD: 'PWD Certificate'
};
const RESIDENCE_LABELS: Record<string, string> = {
  RESIDENT: 'Resident (Hostel)',
  NON_RESIDENT: 'Non-Resident (Day Scholar)'
};
const ADMISSION_TYPE_LABELS: Record<string, string> = {
  '1ST_PU': '1st PU',
  '2ND_PU': '2nd PU',
  LONG_TERM: 'Long Term'
};

// Compatibility shim: real records use residence_status (RESIDENT/NON_RESIDENT);
// the offline demo dataset only has the older residential_status
// (HOSTELLER/DAY_SCHOLAR) field, so derive one from the other when needed.
const residenceOf = (s: any): string =>
  s?.residence_status || (s?.residential_status === 'HOSTELLER' ? 'RESIDENT' : 'NON_RESIDENT');

export const StudentsModule: React.FC = () => {
  const { user, currentBranch } = useAuth();

  // State
  const [students, setStudents] = useState<any[]>(INITIAL_STUDENTS);
  const [options, setOptions] = useState<{ classes: any[]; sections: any[]; batches: any[] }>({
    classes: [],
    sections: [],
    batches: []
  });

  // Filters
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [selectedBatch, setSelectedBatch] = useState<string>('ALL');
  const [selectedResStatus, setSelectedResStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Student 360 Modal
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetail, setStudentDetail] = useState<any | null>(null);
  const [theoryMarks, setTheoryMarks] = useState<any[]>([]);
  const [competitiveMarks, setCompetitiveMarks] = useState<any[]>([]);
  const [boardMarks, setBoardMarks] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  // Marks card (the "view" drill-down on a single exam)
  const [marksCard, setMarksCard] = useState<{ type: 'theory' | 'competitive' | 'board'; examId: string } | null>(null);
  const [marksCardData, setMarksCardData] = useState<any | null>(null);
  const [marksCardLoading, setMarksCardLoading] = useState(false);

  // Personal Profile View for Student/Parent
  const [myProfileData, setMyProfileData] = useState<any | null>(null);
  const [myBoardMarks, setMyBoardMarks] = useState<any[]>([]);

  // Register Student Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    register_number: '',
    class_id: '',
    section_id: '',
    batch_id: '',
    admission_type: '1ST_PU',
    residence_status: 'NON_RESIDENT',
    category: '',
    sslc_result: '',
    date_of_birth: '',
    gender: 'Male',
    phone: '',
    email: '',
    address: '',
    parent_name: '',
    parent_phone: '',
    parent_email: ''
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isManagement = ['ADMIN', 'PRINCIPAL', 'HOD'].includes(user?.role || '');
  const isStudentOrParent = user?.role === 'STUDENT' || user?.role === 'PARENT';

  // Load Metadata Options & Student Roster
  const loadData = async () => {
    try {
      const [optRes, stdRes] = await Promise.all([
        apiFetch<any>(`/students/options/classes-batches?branch_id=${currentBranch?.id || ''}`).catch(() => null),
        apiFetch<any>(`/students?branch_id=${currentBranch?.id || ''}`).catch(() => null)
      ]);
      if (optRes && optRes.classes) {
        setOptions(optRes);
      }
      if (stdRes && stdRes.students && stdRes.students.length > 0) {
        setStudents(stdRes.students);
      } else {
        setStudents(INITIAL_STUDENTS);
      }

      if (isStudentOrParent) {
        try {
          const myRes = await apiFetch<any>('/students/me/profile');
          setMyProfileData(myRes);
          if (myRes?.profile?.id) {
            try {
              const boardRes = await apiFetch<any>(`/students/${myRes.profile.id}/marks/board`);
              setMyBoardMarks(boardRes.exams || []);
            } catch (_) {
              setMyBoardMarks([]);
            }
          }
        } catch (_) {
          setMyProfileData({ profile: INITIAL_STUDENTS[0] });
        }
      }
    } catch (err: any) {
      console.error('Using institutional student records', err);
      setStudents(INITIAL_STUDENTS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBranch, user]);

  // Load Student 360 Detail — profile, documents, and both marks lists
  const handleViewStudent = async (id: string) => {
    setSelectedStudentId(id);
    setDetailLoading(true);
    setTheoryMarks([]);
    setCompetitiveMarks([]);
    setBoardMarks([]);
    try {
      const [detailRes, theoryRes, competitiveRes, boardRes] = await Promise.all([
        apiFetch<any>(`/students/${id}`),
        apiFetch<any>(`/students/${id}/marks/theory`).catch(() => ({ exams: [] })),
        apiFetch<any>(`/students/${id}/marks/competitive`).catch(() => ({ exams: [] })),
        apiFetch<any>(`/students/${id}/marks/board`).catch(() => ({ exams: [] }))
      ]);
      setStudentDetail(detailRes);
      setTheoryMarks(theoryRes.exams || []);
      setCompetitiveMarks(competitiveRes.exams || []);
      setBoardMarks(boardRes.exams || []);
    } catch (err: any) {
      const found = students.find((s) => s.id === id) || INITIAL_STUDENTS.find((s) => s.id === id);
      setStudentDetail({ profile: found || null, documents: [] });
    } finally {
      setDetailLoading(false);
    }
  };

  const closeStudentDetail = () => {
    setSelectedStudentId(null);
    setStudentDetail(null);
    setTheoryMarks([]);
    setCompetitiveMarks([]);
    setBoardMarks([]);
  };

  // Open the subject-wise marks card for one exam. Used both from the admin's
  // Student 360 view (selectedStudentId) and the student/parent's own
  // "My Profile" board marks list (myProfileData.profile.id).
  const handleOpenMarksCard = async (type: 'theory' | 'competitive' | 'board', examId: string) => {
    const studentId = selectedStudentId || myProfileData?.profile?.id;
    setMarksCard({ type, examId });
    setMarksCardLoading(true);
    try {
      const res = await apiFetch<any>(`/students/${studentId}/marks/${type}/${examId}`);
      setMarksCardData(res);
    } catch (err: any) {
      showToast(err.message, 'error');
      setMarksCard(null);
    } finally {
      setMarksCardLoading(false);
    }
  };

  // Upload / replace one of the admission-department documents
  const handleUploadDocument = async (docType: string, file: File) => {
    if (!selectedStudentId) return;
    setUploadingDoc(docType);
    try {
      const form = new FormData();
      form.append('document', file);
      form.append('doc_type', docType);
      await apiFetch(`/students/${selectedStudentId}/documents/upload`, { method: 'POST', body: form });
      const detailRes = await apiFetch<any>(`/students/${selectedStudentId}`);
      setStudentDetail(detailRes);
      showToast('Document uploaded successfully.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUploadingDoc(null);
    }
  };

  // Submit New Student Enrollment
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/students', {
        method: 'POST',
        body: JSON.stringify({ ...createForm, branch_id: currentBranch?.id })
      });
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        register_number: '',
        class_id: '',
        section_id: '',
        batch_id: '',
        admission_type: '1ST_PU',
        residence_status: 'NON_RESIDENT',
        category: '',
        sslc_result: '',
        date_of_birth: '',
        gender: 'Male',
        phone: '',
        email: '',
        address: '',
        parent_name: '',
        parent_phone: '',
        parent_email: ''
      });
      setNotification({ type: 'success', message: 'Student and guardian successfully enrolled.' });
      setTimeout(() => setNotification(null), 4000);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Sections belonging to the currently selected class (cascading dropdown)
  const sectionsForClass = (classId: string) => options.sections.filter((s: any) => !classId || s.class_id === classId);

  // Filter Logic
  const filteredStudents = students.filter((s) => {
    const matchClass = selectedClass === 'ALL' || s.class_id === selectedClass;
    const matchSec = selectedSection === 'ALL' || s.section_id === selectedSection;
    const matchBatch = selectedBatch === 'ALL' || s.batch_id === selectedBatch;
    const matchRes = selectedResStatus === 'ALL' || residenceOf(s) === selectedResStatus;
    const matchSearch =
      searchQuery === '' ||
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.register_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone?.includes(searchQuery);
    return matchClass && matchSec && matchBatch && matchRes && matchSearch;
  });

  const totalEnrolled = students.length;
  const residentCount = students.filter((s) => residenceOf(s) === 'RESIDENT').length;
  const nonResidentCount = totalEnrolled - residentCount;

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
              <div className="text-[10px] text-slate-500 font-bold uppercase">Residents</div>
              <div className="text-sm font-extrabold text-slate-900 font-heading">{residentCount}</div>
            </div>
            <div className="bg-[#ede9df] px-3.5 py-2 rounded-2xl text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Non-Residents</div>
              <div className="text-sm font-extrabold text-slate-900 font-heading">{nonResidentCount}</div>
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
      {isStudentOrParent && myProfileData?.profile && (
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
                <h2 className="text-base font-bold text-slate-900 font-heading">{myProfileData.profile.name}</h2>
                <div className="text-xs text-slate-500">
                  Reg No: <span className="font-mono font-bold text-slate-800">{myProfileData.profile.register_number}</span>{' '}
                  • {myProfileData.profile.class_name} Section {myProfileData.profile.section_name} ({myProfileData.profile.batch_name})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">
                {RESIDENCE_LABELS[residenceOf(myProfileData.profile)]}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Guardian</span>
              <span className="font-bold text-slate-800">{myProfileData.profile.parent_name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Guardian Phone</span>
              <span className="font-bold text-slate-800">{myProfileData.profile.parent_phone || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Category</span>
              <span className="font-bold text-slate-800">{myProfileData.profile.category || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Admission Type</span>
              <span className="font-bold text-slate-800">
                {ADMISSION_TYPE_LABELS[myProfileData.profile.admission_type] || myProfileData.profile.admission_type}
              </span>
            </div>
          </div>

          {/* Board Marks — percentage, section rank & overall rank per cycle */}
          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              Board Marks ({myBoardMarks.length})
            </h4>
            {myBoardMarks.length === 0 ? (
              <p className="text-slate-400 text-xs">No board exam cycle results published yet.</p>
            ) : (
              <div className="border border-[#ded9cf] rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#fdfcfb] text-slate-600 font-bold border-b border-[#ded9cf]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Cycle</th>
                      <th className="py-2.5 px-3">Total Marks</th>
                      <th className="py-2.5 px-3">Percentage</th>
                      <th className="py-2.5 px-3">Section Rank</th>
                      <th className="py-2.5 px-3">Overall Rank</th>
                      <th className="py-2.5 px-3 text-right">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2eee6]">
                    {myBoardMarks.map((e: any) => (
                      <tr key={e.exam_id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-slate-600">{e.start_date}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{e.exam_name}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                          {e.total_obtained} / {e.total_max}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-700">{e.percentage}%</td>
                        <td className="py-2.5 px-3">{e.section_rank ?? '—'}</td>
                        <td className="py-2.5 px-3">{e.overall_rank ?? '—'}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleOpenMarksCard('board', e.exam_id)}
                            className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-[#fdfcfb] p-4 rounded-2xl border border-[#ded9cf] flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedSection('ALL');
            }}
            className="bg-white border border-[#ded9cf] rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold outline-none"
          >
            <option value="ALL">All Classes</option>
            {options.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Section Filter — cascades from the selected class */}
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="bg-white border border-[#ded9cf] rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold outline-none"
          >
            <option value="ALL">All Sections</option>
            {sectionsForClass(selectedClass === 'ALL' ? '' : selectedClass).map((s) => (
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
                {b.name}
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
            <option value="RESIDENT">Resident</option>
            <option value="NON_RESIDENT">Non-Resident</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search register no., phone, name..."
            className="w-full pl-9 pr-4 py-1.5 bg-white border border-[#ded9cf] rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Students Grid */}
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
          {filteredStudents.map((s) => {
            const residence = residenceOf(s);
            return (
              <div
                key={s.id}
                onClick={() => handleViewStudent(s.id)}
                className="bg-[#fdfcfb] hover:bg-white rounded-3xl p-5 border border-[#ded9cf] hover:border-blue-300 transition-all duration-150 shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-800 font-bold text-sm font-heading shrink-0 overflow-hidden">
                        {s.photo_url ? (
                          <img src={s.photo_url} alt={s.name} className="w-full h-full object-cover" />
                        ) : (
                          s.name
                            ?.split(' ')
                            .map((n: string) => n[0])
                            .slice(0, 2)
                            .join('')
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition">
                          {s.name}
                        </h3>
                        <div className="text-[11px] font-semibold text-slate-500">
                          {s.class_name} {s.section_name && `Section ${s.section_name}`} • {s.batch_name}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                        residence === 'RESIDENT' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {residence === 'RESIDENT' ? 'Resident' : 'Non-Resident'}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#f2eee6] space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Register No:</span>
                      <span className="font-mono font-bold text-slate-800">{s.register_number}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> Phone:
                      </span>
                      <span className="font-semibold text-slate-700">{s.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Admission:</span>
                      <span className="font-semibold text-blue-700">
                        {ADMISSION_TYPE_LABELS[s.admission_type] || s.admission_type || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#f2eee6] flex items-center justify-between text-xs font-semibold text-blue-700">
                  <span className="flex items-center gap-1 group-hover:underline">
                    View Student 360° Profile
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
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
                  {studentDetail?.profile?.name || 'Student Profile'}
                </h3>
                <p className="text-xs text-slate-500">
                  {studentDetail?.profile?.class_name} Section {studentDetail?.profile?.section_name} • Batch{' '}
                  {studentDetail?.profile?.batch_name}
                </p>
              </div>
              <button
                onClick={closeStudentDetail}
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
                {/* 1. Student Academic Details — photo / register number / address / SSLC result / category */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                    Student Academic Details
                  </h4>
                  <div className="p-4 rounded-2xl bg-[#fdfcfb] border border-[#ded9cf] flex flex-col sm:flex-row gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-800 font-bold text-xl font-heading shrink-0 overflow-hidden">
                      {studentDetail?.profile?.photo_url ? (
                        <img src={studentDetail.profile.photo_url} alt={studentDetail.profile.name} className="w-full h-full object-cover" />
                      ) : (
                        studentDetail?.profile?.name
                          ?.split(' ')
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join('')
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs flex-1">
                      <div>
                        <span className="text-slate-400 block font-medium">Register Number</span>
                        <span className="font-bold text-slate-800 font-mono">{studentDetail?.profile?.register_number}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">SSLC Result</span>
                        <span className="font-bold text-slate-800">{studentDetail?.profile?.sslc_result || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Category</span>
                        <span className="font-bold text-slate-800">{studentDetail?.profile?.category || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Gender / DOB</span>
                        <span className="font-bold text-slate-800">
                          {studentDetail?.profile?.gender || 'N/A'} • {studentDetail?.profile?.date_of_birth || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Admission Type</span>
                        <span className="font-bold text-slate-800">
                          {ADMISSION_TYPE_LABELS[studentDetail?.profile?.admission_type] || studentDetail?.profile?.admission_type}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Residency</span>
                        <span className="font-bold text-slate-800">
                          {RESIDENCE_LABELS[residenceOf(studentDetail?.profile)]}
                        </span>
                      </div>
                      <div className="col-span-2 sm:col-span-3">
                        <span className="text-slate-400 block font-medium">Address</span>
                        <span className="font-semibold text-slate-800">{studentDetail?.profile?.address || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Documents — Aadhar/Study Cert/SSLC Marks Card/TC/Caste & Income/EWS/PWD.
                    Combined into the same profile view alongside the academic details above,
                    since both describe the same student record even though the documents are
                    entered by the admission department. */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                    Admission Documents
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DOC_TYPES.map((docType) => {
                      const doc = studentDetail?.documents?.find((d: any) => d.doc_type === docType);
                      return (
                        <div
                          key={docType}
                          className="p-3 rounded-xl border border-[#ded9cf] bg-[#fdfcfb] flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {doc ? (
                              <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <FileX2 className="w-4 h-4 text-slate-300 shrink-0" />
                            )}
                            <span className="font-semibold text-slate-800 truncate">{DOC_LABELS[docType]}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {doc && (
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-bold text-blue-700 hover:underline"
                              >
                                View
                              </a>
                            )}
                            {isManagement && (
                              <label className="text-[10px] font-bold text-slate-500 hover:text-blue-700 cursor-pointer flex items-center gap-1">
                                {uploadingDoc === docType ? (
                                  <span className="animate-pulse">Uploading…</span>
                                ) : (
                                  <>
                                    <UploadCloud className="w-3 h-3" />
                                    {doc ? 'Replace' : 'Upload'}
                                  </>
                                )}
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadDocument(docType, file);
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Guardian Details */}
                <div className="p-4 rounded-2xl border border-[#ded9cf] bg-white space-y-2 text-xs">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Parent / Guardian Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <span className="text-slate-400 block">Guardian Name</span>
                      <span className="font-semibold text-slate-800">{studentDetail?.profile?.parent_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Primary Contact</span>
                      <span className="font-semibold text-slate-800">{studentDetail?.profile?.parent_phone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Guardian Email</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {studentDetail?.profile?.parent_email || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Hostel Allocation (If Resident) */}
                {studentDetail?.profile?.is_hostelite === 1 && (
                  <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-2 text-xs">
                    <h4 className="font-bold text-amber-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5 text-amber-700" />
                      Hostel Room Allocation
                    </h4>
                    <p className="text-amber-700">
                      This student is marked as a hostel resident. Room/bed allocation is managed from the Hostel module.
                    </p>
                  </div>
                )}

                {/* 5. Theory Marks — Date / Exam Name / Total Marks / Class Rank / Overall Rank / View */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                    Theory Marks ({theoryMarks.length})
                  </h4>
                  {theoryMarks.length === 0 ? (
                    <p className="text-slate-400 text-xs">No theory exam records uploaded yet.</p>
                  ) : (
                    <div className="border border-[#ded9cf] rounded-2xl overflow-hidden overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#fdfcfb] text-slate-600 font-bold border-b border-[#ded9cf]">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Exam Name</th>
                            <th className="py-2.5 px-3">Total Marks</th>
                            <th className="py-2.5 px-3">Class Rank</th>
                            <th className="py-2.5 px-3">Overall Rank</th>
                            <th className="py-2.5 px-3 text-right">View</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f2eee6]">
                          {theoryMarks.map((e: any) => (
                            <tr key={e.exam_id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 text-slate-600">{e.start_date}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">{e.exam_name}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                                {e.total_obtained} / {e.total_max}
                              </td>
                              <td className="py-2.5 px-3">{e.section_rank ?? '—'}</td>
                              <td className="py-2.5 px-3">{e.overall_rank ?? '—'}</td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={() => handleOpenMarksCard('theory', e.exam_id)}
                                  className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 5b. Board Marks — Cycle 1/2/3, with percentage/section rank/overall rank */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                    Board Marks ({boardMarks.length})
                  </h4>
                  {boardMarks.length === 0 ? (
                    <p className="text-slate-400 text-xs">No board exam cycle results published yet.</p>
                  ) : (
                    <div className="border border-[#ded9cf] rounded-2xl overflow-hidden overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#fdfcfb] text-slate-600 font-bold border-b border-[#ded9cf]">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Cycle</th>
                            <th className="py-2.5 px-3">Total Marks</th>
                            <th className="py-2.5 px-3">Percentage</th>
                            <th className="py-2.5 px-3">Section Rank</th>
                            <th className="py-2.5 px-3">Overall Rank</th>
                            <th className="py-2.5 px-3 text-right">View</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f2eee6]">
                          {boardMarks.map((e: any) => (
                            <tr key={e.exam_id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 text-slate-600">{e.start_date}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">{e.exam_name}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                                {e.total_obtained} / {e.total_max}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-emerald-700">{e.percentage}%</td>
                              <td className="py-2.5 px-3">{e.section_rank ?? '—'}</td>
                              <td className="py-2.5 px-3">{e.overall_rank ?? '—'}</td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={() => handleOpenMarksCard('board', e.exam_id)}
                                  className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 6. Competitive Marks — NEET/JEE/KCET, across 1st PU / 2nd PU / Long Term batches */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Competitive Exam Marks ({competitiveMarks.length})
                  </h4>
                  <p className="text-[10px] text-slate-400 mb-2.5">
                    NEET / JEE / CET — {ADMISSION_TYPE_LABELS[studentDetail?.profile?.admission_type] || 'N/A'} • Batch{' '}
                    {studentDetail?.profile?.batch_name}
                  </p>
                  {competitiveMarks.length === 0 ? (
                    <p className="text-slate-400 text-xs">No competitive exam records uploaded yet.</p>
                  ) : (
                    <div className="border border-[#ded9cf] rounded-2xl overflow-hidden overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#fdfcfb] text-slate-600 font-bold border-b border-[#ded9cf]">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Exam Name</th>
                            <th className="py-2.5 px-3">Total Marks</th>
                            <th className="py-2.5 px-3">Class Rank</th>
                            <th className="py-2.5 px-3">Overall Rank</th>
                            <th className="py-2.5 px-3 text-right">View</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f2eee6]">
                          {competitiveMarks.map((e: any) => (
                            <tr key={e.exam_id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 text-slate-600">{e.start_date}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">{e.exam_name}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                                {e.total_obtained} / {e.total_max}
                              </td>
                              <td className="py-2.5 px-3">{e.section_rank ?? '—'}</td>
                              <td className="py-2.5 px-3">{e.overall_rank ?? '—'}</td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={() => handleOpenMarksCard('competitive', e.exam_id)}
                                  className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
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
      {/* MODAL 1b: MARKS CARD (subject-wise breakdown for one exam) */}
      {/* ========================================================================= */}
      {marksCard && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#ded9cf] my-8">
            <div className="bg-[#fdfcfb] p-5 border-b border-[#ded9cf] flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 font-heading">
                {marksCardData?.exam?.name || 'Marks Card'}
              </h3>
              <button
                onClick={() => {
                  setMarksCard(null);
                  setMarksCardData(null);
                }}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {marksCardLoading ? (
              <div className="p-10 text-center">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div className="text-xs text-slate-500">
                  Exam Date: <span className="font-semibold text-slate-800">{marksCardData?.exam?.start_date}</span>
                </div>

                <div className="border border-[#ded9cf] rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#fdfcfb] text-slate-600 font-bold border-b border-[#ded9cf]">
                      <tr>
                        <th className="py-2 px-3">Subject</th>
                        <th className="py-2 px-3">Marks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f2eee6]">
                      {marksCardData?.subjectMarks?.map((m: any) => (
                        <tr key={m.id || m.subject_code}>
                          <td className="py-2 px-3 font-semibold text-slate-800">{m.subject_name}</td>
                          <td className="py-2 px-3 font-mono font-bold text-blue-700">
                            {m.marks_obtained} / {m.max_marks}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block font-medium">Total Marks</span>
                    <span className="font-bold text-slate-800">
                      {marksCardData?.totalObtained} / {marksCardData?.totalMarks}
                    </span>
                  </div>
                  {marksCard.type === 'theory' && (
                    <div>
                      <span className="text-slate-400 block font-medium">Percentage</span>
                      <span className="font-bold text-slate-800">{marksCardData?.percentage}%</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 block font-medium">Section Rank</span>
                    <span className="font-bold text-slate-800">{marksCardData?.sectionRank ?? '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Overall Rank</span>
                    <span className="font-bold text-slate-800">{marksCardData?.overallRank ?? '—'}</span>
                  </div>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Register Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2026PUC088"
                    value={createForm.register_number}
                    onChange={(e) => setCreateForm({ ...createForm, register_number: e.target.value })}
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
                    onChange={(e) => setCreateForm({ ...createForm, class_id: e.target.value, section_id: '' })}
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
                    onChange={(e) => {
                      const sectionId = e.target.value;
                      const sec = options.sections.find((s: any) => s.id === sectionId);
                      // Pre-fill the batch from the section's default (safety-net),
                      // but leave it editable — the admin can still override it.
                      setCreateForm({
                        ...createForm,
                        section_id: sectionId,
                        batch_id: (sec as any)?.default_batch_id || createForm.batch_id
                      });
                    }}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  >
                    <option value="">-- Select Section --</option>
                    {sectionsForClass(createForm.class_id).map((s) => (
                      <option key={s.id} value={s.id}>
                        Section {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Batch</label>
                  <select
                    required
                    value={createForm.batch_id}
                    onChange={(e) => setCreateForm({ ...createForm, batch_id: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  >
                    <option value="">-- Select Batch --</option>
                    {options.batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Admission Type</label>
                  <select
                    value={createForm.admission_type}
                    onChange={(e) => setCreateForm({ ...createForm, admission_type: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  >
                    <option value="1ST_PU">1st PU</option>
                    <option value="2ND_PU">2nd PU</option>
                    <option value="LONG_TERM">Long Term</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Residence Status</label>
                  <select
                    value={createForm.residence_status}
                    onChange={(e) => setCreateForm({ ...createForm, residence_status: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  >
                    <option value="NON_RESIDENT">Non-Resident (Day Scholar)</option>
                    <option value="RESIDENT">Resident (Hostel)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  >
                    <option value="">-- Select Category --</option>
                    <option value="General">General</option>
                    <option value="OBC">OBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="EWS">EWS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SSLC Result</label>
                  <input
                    type="text"
                    placeholder="e.g. 92%"
                    value={createForm.sslc_result}
                    onChange={(e) => setCreateForm({ ...createForm, sslc_result: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={createForm.date_of_birth}
                    onChange={(e) => setCreateForm({ ...createForm, date_of_birth: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={createForm.gender}
                    onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Student Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98450 12345"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Residential Address</label>
                  <input
                    type="text"
                    placeholder="e.g. MCC B Block, Davangere"
                    value={createForm.address}
                    onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>

              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider pt-2 border-t border-slate-100">
                Parent / Guardian Details
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Guardian Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Kulkarni"
                    value={createForm.parent_name}
                    onChange={(e) => setCreateForm({ ...createForm, parent_name: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Guardian Phone (SMS/OTP)</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98450 67890"
                    value={createForm.parent_phone}
                    onChange={(e) => setCreateForm({ ...createForm, parent_phone: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Guardian Email (Optional)</label>
                <input
                  type="email"
                  placeholder="guardian@example.com"
                  value={createForm.parent_email}
                  onChange={(e) => setCreateForm({ ...createForm, parent_email: e.target.value })}
                  className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                />
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
