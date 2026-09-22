import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Search, Plus, X, Phone, MapPin, ArrowLeft, GraduationCap,
  FileText, Upload, Eye, Home, Building2, Award, Trophy
} from 'lucide-react';

const ADMISSION_TABS = [
  { value: '1ST_PU', label: '1st PU' },
  { value: '2ND_PU', label: '2nd PU' },
  { value: 'LONG_TERM', label: 'Long Term' }
];

const DOC_TYPES = [
  { value: 'AADHAR', label: 'Aadhar Card' },
  { value: 'STUDY_CERTIFICATE', label: 'Study Certificate' },
  { value: 'SSLC_MARKS_CARD', label: 'SSLC Marks Card' },
  { value: 'TC', label: 'Transfer Certificate' },
  { value: 'CASTE_INCOME_CERTIFICATE', label: 'Caste & Income Certificate' },
  { value: 'EWS', label: 'EWS Certificate' },
  { value: 'PWD', label: 'PWD Certificate' }
];

export const StudentsPage: React.FC = () => {
  const { currentBranch } = useAuth();
  const [admissionType, setAdmissionType] = useState('1ST_PU');
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [residenceFilter, setResidenceFilter] = useState('');
  const [meta, setMeta] = useState<any>({ classes: [], sections: [], batches: [] });
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const branchId = currentBranch?.id || '';

  const loadStudents = async () => {
    try {
      const qs = new URLSearchParams({
        branch_id: branchId, admission_type: admissionType, search,
        ...(residenceFilter ? { residence_status: residenceFilter } : {})
      });
      const res = await apiFetch<any>(`/students?${qs.toString()}`);
      setStudents(res.students || []);
    } catch (err) { console.error(err); }
  };

  const loadMeta = async () => {
    try {
      const res = await apiFetch<any>(`/branches/${branchId}/meta`);
      setMeta(res);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (branchId) loadMeta(); }, [branchId]);
  useEffect(() => { if (branchId) loadStudents(); }, [branchId, admissionType, search, residenceFilter]);

  if (selectedStudentId) {
    return <StudentProfile studentId={selectedStudentId} onBack={() => { setSelectedStudentId(null); loadStudents(); }} />;
  }

  return (
    <div className="space-y-5">
      {message && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm">{message}</div>}

      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold w-fit">
          {ADMISSION_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setAdmissionType(t.value)}
              className={`px-3.5 py-1.5 rounded-xl transition ${admissionType === t.value ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-500'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search register no, phone, name..."
              className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none w-64"
            />
          </div>
          <select value={residenceFilter} onChange={(e) => setResidenceFilter(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none">
            <option value="">All Residence</option>
            <option value="RESIDENT">Resident</option>
            <option value="NON_RESIDENT">Non-Resident</option>
          </select>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add Student
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left p-3">Register No.</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Phone</th>
              <th className="text-left p-3">Class / Section</th>
              <th className="text-left p-3">Batch</th>
              <th className="text-left p-3">Residence</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr
                key={s.id}
                onClick={() => setSelectedStudentId(s.id)}
                className="border-t border-slate-50 hover:bg-indigo-50/40 cursor-pointer transition"
              >
                <td className="p-3 font-mono font-semibold">{s.register_number}</td>
                <td className="p-3 font-semibold text-slate-800">{s.name}</td>
                <td className="p-3">{s.phone || '—'}</td>
                <td className="p-3">{s.class_name}-{s.section_name}</td>
                <td className="p-3">{s.batch_name}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${s.residence_status === 'RESIDENT' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                    {s.residence_status === 'RESIDENT' ? 'Resident' : 'Non-Resident'}
                  </span>
                </td>
              </tr>
            ))}
            {students.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-slate-400">No students found.</td></tr>}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AddStudentModal
          branchId={branchId}
          meta={meta}
          defaultAdmissionType={admissionType}
          onClose={() => setShowAddModal(false)}
          onCreated={(msg) => {
            setShowAddModal(false);
            setMessage(msg);
            loadStudents();
            setTimeout(() => setMessage(null), 3500);
          }}
        />
      )}
    </div>
  );
};

/* ============================== ADD STUDENT MODAL ============================== */

const AddStudentModal: React.FC<{
  branchId: string; meta: any; defaultAdmissionType: string;
  onClose: () => void; onCreated: (msg: string) => void;
}> = ({ branchId, meta, defaultAdmissionType, onClose, onCreated }) => {
  const [form, setForm] = useState<any>({ admission_type: defaultAdmissionType, residence_status: 'NON_RESIDENT' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (field: string, value: any) => setForm((f: any) => ({ ...f, [field]: value }));
  const sectionsForClass = meta.sections?.filter((s: any) => s.class_id === form.class_id) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/students`, { method: 'POST', body: JSON.stringify({ ...form, branch_id: branchId }) });
      onCreated('Student added successfully.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[88vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Add Student</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Full Name *"><input required value={form.name || ''} onChange={(e) => update('name', e.target.value)} className="input" /></Field>
            <Field label="Register Number *"><input required value={form.register_number || ''} onChange={(e) => update('register_number', e.target.value)} className="input" /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Phone"><input value={form.phone || ''} onChange={(e) => update('phone', e.target.value)} className="input" /></Field>
            <Field label="Gender">
              <select value={form.gender || ''} onChange={(e) => update('gender', e.target.value)} className="input">
                <option value="">Select</option><option value="MALE">Male</option><option value="FEMALE">Female</option>
              </select>
            </Field>
            <Field label="Date of Birth"><input type="date" value={form.date_of_birth || ''} onChange={(e) => update('date_of_birth', e.target.value)} className="input" /></Field>
          </div>
          <Field label="Address"><input value={form.address || ''} onChange={(e) => update('address', e.target.value)} className="input" /></Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Class *">
              <select required value={form.class_id || ''} onChange={(e) => update('class_id', e.target.value)} className="input">
                <option value="">Select</option>
                {meta.classes?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Section *">
              <select required value={form.section_id || ''} onChange={(e) => update('section_id', e.target.value)} className="input">
                <option value="">Select</option>
                {sectionsForClass.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Batch *">
              <select required value={form.batch_id || ''} onChange={(e) => update('batch_id', e.target.value)} className="input">
                <option value="">Select</option>
                {meta.batches?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Admission Type">
              <select value={form.admission_type} onChange={(e) => update('admission_type', e.target.value)} className="input">
                {ADMISSION_TABS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Residence">
              <select value={form.residence_status} onChange={(e) => update('residence_status', e.target.value)} className="input">
                <option value="RESIDENT">Resident</option><option value="NON_RESIDENT">Non-Resident</option>
              </select>
            </Field>
            <Field label="Category">
              <input value={form.category || ''} onChange={(e) => update('category', e.target.value)} placeholder="General/OBC/SC/ST/EWS" className="input" />
            </Field>
          </div>
          <Field label="SSLC Result"><input value={form.sslc_result || ''} onChange={(e) => update('sslc_result', e.target.value)} placeholder="e.g. 92.4%" className="input" /></Field>

          <p className="text-[11px] font-bold text-slate-400 pt-1">Parent / Guardian Details</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Parent Name *"><input required value={form.parent_name || ''} onChange={(e) => update('parent_name', e.target.value)} className="input" /></Field>
            <Field label="Parent Phone *"><input required value={form.parent_phone || ''} onChange={(e) => update('parent_phone', e.target.value)} className="input" /></Field>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition disabled:opacity-50 mt-2">
            {isSubmitting ? 'Saving...' : 'Save Student'}
          </button>
        </form>
      </div>
      <style>{`.input { width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.55rem 0.75rem; font-size: 0.8rem; outline: none; }`}</style>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div><label className="block text-[11px] font-bold text-slate-500 mb-1">{label}</label>{children}</div>
);

/* ============================== STUDENT PROFILE ============================== */

const StudentProfile: React.FC<{ studentId: string; onBack: () => void }> = ({ studentId, onBack }) => {
  const [tab, setTab] = useState<'profile' | 'documents' | 'theory' | 'competitive'>('profile');
  const [data, setData] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [theoryExams, setTheoryExams] = useState<any[]>([]);
  const [competitiveExams, setCompetitiveExams] = useState<any[]>([]);
  const [marksCard, setMarksCard] = useState<any>(null);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await apiFetch<any>(`/students/${studentId}`);
      setData(res);
      setDocuments(res.documents || []);
    } catch (err) { console.error(err); }
  };
  useEffect(() => { load(); }, [studentId]);

  useEffect(() => {
    if (tab === 'theory') apiFetch<any>(`/students/${studentId}/marks/theory`).then((r) => setTheoryExams(r.exams || [])).catch(console.error);
    if (tab === 'competitive') apiFetch<any>(`/students/${studentId}/marks/competitive`).then((r) => setCompetitiveExams(r.exams || [])).catch(console.error);
    if (tab === 'documents') apiFetch<any>(`/students/${studentId}/documents`).then((r) => setDocuments(r.documents || [])).catch(console.error);
  }, [tab, studentId]);

  const openMarksCard = async (examId: string, isCompetitive: boolean) => {
    const path = isCompetitive ? 'competitive' : 'theory';
    const res = await apiFetch<any>(`/students/${studentId}/marks/${path}/${examId}`);
    setMarksCard(res);
  };

  const handleDocUpload = async (docType: string, file: File) => {
    setUploadingDocType(docType);
    try {
      const fd = new FormData();
      fd.append('document', file);
      fd.append('doc_type', docType);
      await apiFetch(`/students/${studentId}/documents/upload`, { method: 'POST', body: fd });
      const res = await apiFetch<any>(`/students/${studentId}/documents`);
      setDocuments(res.documents || []);
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploadingDocType(null);
    }
  };

  if (!data) return <div className="text-sm text-slate-400 text-center py-16">Loading profile...</div>;
  const { profile } = data;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Students
      </button>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center gap-5 flex-wrap">
        <div className="w-20 h-20 rounded-2xl bg-blue-100 overflow-hidden flex items-center justify-center shrink-0">
          {profile.photo_url ? <img src={profile.photo_url} className="w-full h-full object-cover" /> : <GraduationCap className="w-8 h-8 text-blue-600" />}
        </div>
        <div className="flex-1 min-w-[220px]">
          <h2 className="text-lg font-bold text-slate-900">{profile.name}</h2>
          <p className="text-xs text-slate-500">{profile.class_name}-{profile.section_name} • {profile.batch_name}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {profile.phone || '—'}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {profile.address || '—'}</span>
            <span className="flex items-center gap-1">{profile.residence_status === 'RESIDENT' ? <Building2 className="w-3 h-3" /> : <Home className="w-3 h-3" />} {profile.residence_status === 'RESIDENT' ? 'Resident' : 'Non-Resident'}</span>
          </div>
        </div>
        <span className="font-mono text-[11px] bg-slate-100 px-3 py-1.5 rounded-lg text-slate-600">{profile.register_number}</span>
      </div>

      <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold w-fit">
        {(['profile', 'documents', 'theory', 'competitive'] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setMarksCard(null); }} className={`px-4 py-1.5 rounded-xl transition capitalize ${tab === t ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-500'}`}>
            {t === 'theory' ? 'Theory Marks' : t === 'competitive' ? 'Competitive Marks' : t}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
          <ProfileRow label="SSLC Result" value={profile.sslc_result || '—'} />
          <ProfileRow label="Category" value={profile.category || '—'} />
          <ProfileRow label="Date of Birth" value={profile.date_of_birth || '—'} />
          <ProfileRow label="Gender" value={profile.gender || '—'} />
          <ProfileRow label="Admission Type" value={ADMISSION_TABS.find((t) => t.value === profile.admission_type)?.label || '—'} />
          <ProfileRow label="Hostelite" value={profile.is_hostelite ? 'Yes' : 'No'} />
          <ProfileRow label="Parent Name" value={profile.parent_name} />
          <ProfileRow label="Parent Phone" value={profile.parent_phone} />
          <ProfileRow label="Parent Email" value={profile.parent_email || '—'} />
          <ProfileRow label="Branch" value={profile.branch_name} />
        </div>
      )}

      {tab === 'documents' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DOC_TYPES.map((dt) => {
            const doc = documents.find((d) => d.doc_type === dt.value);
            return (
              <div key={dt.value} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{dt.label}</p>
                    <p className="text-[10px] text-slate-400">{doc ? 'Uploaded' : 'Not uploaded'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {doc && (
                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg"><Eye className="w-3.5 h-3.5 text-slate-600" /></a>
                  )}
                  <label className="p-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                    <input
                      type="file"
                      className="hidden"
                      disabled={uploadingDocType === dt.value}
                      onChange={(e) => e.target.files?.[0] && handleDocUpload(dt.value, e.target.files[0])}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(tab === 'theory' || tab === 'competitive') && !marksCard && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr><th className="text-left p-3">Date</th><th className="text-left p-3">Exam Name</th><th className="text-left p-3">Total Marks</th><th className="text-left p-3">Class Rank</th><th className="text-left p-3">Overall Rank</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {(tab === 'theory' ? theoryExams : competitiveExams).map((e) => (
                <tr key={e.exam_id} className="border-t border-slate-50">
                  <td className="p-3">{e.start_date}</td>
                  <td className="p-3 font-semibold">{e.exam_name} <span className="text-slate-400 font-normal">({e.exam_type})</span></td>
                  <td className="p-3">{e.total_obtained}/{e.total_max} ({e.percentage}%)</td>
                  <td className="p-3">{e.section_rank ?? '—'}</td>
                  <td className="p-3">{e.overall_rank ?? '—'}</td>
                  <td className="p-3">
                    <button onClick={() => openMarksCard(e.exam_id, tab === 'competitive')} className="p-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg"><Eye className="w-3.5 h-3.5 text-indigo-600" /></button>
                  </td>
                </tr>
              ))}
              {(tab === 'theory' ? theoryExams : competitiveExams).length === 0 && <tr><td colSpan={6} className="p-10 text-center text-slate-400">No exams recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {(tab === 'theory' || tab === 'competitive') && marksCard && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <button onClick={() => setMarksCard(null)} className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> Back to exam list</button>
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900">{marksCard.exam.name}</h4>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-bold"><Award className="w-3 h-3" /> Section Rank {marksCard.sectionRank ?? '—'}</span>
              <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-bold"><Trophy className="w-3 h-3" /> Overall Rank {marksCard.overallRank ?? '—'}</span>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr><th className="text-left p-2.5">Subject</th><th className="text-left p-2.5">Marks Obtained</th><th className="text-left p-2.5">Max Marks</th></tr>
            </thead>
            <tbody>
              {marksCard.subjectMarks.map((m: any) => (
                <tr key={m.id} className="border-t border-slate-50">
                  <td className="p-2.5 font-semibold">{m.subject_name}</td>
                  <td className="p-2.5">{m.marks_obtained}</td>
                  <td className="p-2.5">{m.max_marks}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-sm font-bold text-slate-800">
            <span>Total</span><span>{marksCard.totalObtained}/{marksCard.totalMarks} ({marksCard.percentage}%)</span>
          </div>
        </div>
      )}
    </div>
  );
};

const ProfileRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
    <span className="text-slate-400 font-semibold">{label}</span>
    <span className="text-slate-800 font-medium">{value}</span>
  </div>
);
