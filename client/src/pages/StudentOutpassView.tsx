import React, { useState, useEffect } from 'react';
import { showToast } from '../utils/toast';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, DoorOpen, MessageSquareWarning, Home, X } from 'lucide-react';

type OutpassStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'OUT' | 'RETURNED' | 'EXPIRED';
type GrievanceStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
type GrievanceCategory = 'GENERAL' | 'ROOMMATE' | 'MESS_FOOD' | 'SAFETY' | 'STAFF_BEHAVIOUR' | 'OTHER';

interface OutpassRecord {
  id: string;
  outpass_number: string;
  branch_id: string;
  student_id: string;
  reason: string;
  pickup_person_name: string;
  pickup_person_phone: string;
  relationship: string;
  status: OutpassStatus;
  requested_at: string;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  rejection_reason?: string;
  exit_time?: string;
  exit_staff_name?: string;
  return_time?: string;
  return_staff_name?: string;
  verification_code?: string;
  parent_otp_verified?: number | boolean;
}

interface GrievanceRecord {
  id: string;
  branch_id: string;
  student_id: string;
  category: GrievanceCategory;
  subject: string;
  description: string;
  status: GrievanceStatus;
  response?: string;
  responded_by?: string;
  responded_by_name?: string;
  responded_at?: string;
  created_at: string;
}

const OUTPASS_STATUS_STYLES: Record<OutpassStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-900',
  APPROVED: 'bg-blue-100 text-blue-900',
  OUT: 'bg-purple-100 text-purple-900',
  RETURNED: 'bg-emerald-100 text-emerald-900',
  REJECTED: 'bg-rose-100 text-rose-900',
  EXPIRED: 'bg-slate-100 text-slate-700'
};

const GRIEVANCE_STATUS_STYLES: Record<GrievanceStatus, string> = {
  OPEN: 'bg-amber-100 text-amber-900',
  IN_PROGRESS: 'bg-blue-100 text-blue-900',
  RESOLVED: 'bg-emerald-100 text-emerald-900'
};

const GRIEVANCE_CATEGORY_LABELS: Record<GrievanceCategory, string> = {
  GENERAL: 'General',
  ROOMMATE: 'Roommate',
  MESS_FOOD: 'Mess / Food',
  SAFETY: 'Safety',
  STAFF_BEHAVIOUR: 'Staff Behaviour',
  OTHER: 'Other'
};

const EMPTY_OUTPASS_FORM = {
  reason: '',
  pickup_person_name: '',
  pickup_person_phone: '',
  relationship: '',
  parent_phone: '',
  id_type: '',
  id_number: ''
};

const EMPTY_GRIEVANCE_FORM = {
  category: 'GENERAL' as GrievanceCategory,
  subject: '',
  description: ''
};

const formatDateTime = (value?: string) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

export const StudentOutpassView: React.FC = () => {
  const { user } = useAuth();

  const [residenceStatus, setResidenceStatus] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'OUTPASS' | 'GRIEVANCE'>('OUTPASS');

  // Outpass state
  const [outpassHistory, setOutpassHistory] = useState<OutpassRecord[]>([]);
  const [outpassLoading, setOutpassLoading] = useState(true);
  const [showOutpassModal, setShowOutpassModal] = useState(false);
  const [outpassForm, setOutpassForm] = useState(EMPTY_OUTPASS_FORM);
  const [submittingOutpass, setSubmittingOutpass] = useState(false);

  // Grievance state
  const [grievances, setGrievances] = useState<GrievanceRecord[]>([]);
  const [grievanceLoading, setGrievanceLoading] = useState(true);
  const [showGrievanceModal, setShowGrievanceModal] = useState(false);
  const [grievanceForm, setGrievanceForm] = useState(EMPTY_GRIEVANCE_FORM);
  const [submittingGrievance, setSubmittingGrievance] = useState(false);

  const loadProfile = async () => {
    setProfileLoading(true);
    try {
      const res = await apiFetch<any>('/students/me/profile');
      setResidenceStatus(res?.profile?.residence_status || null);
    } catch (err: any) {
      showToast(err.message || 'Failed to load your profile.', 'error');
      setResidenceStatus(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const loadOutpassHistory = async () => {
    if (!user?.student_id) return;
    setOutpassLoading(true);
    try {
      const res = await apiFetch<{ history: OutpassRecord[] }>(`/outpass/student/${user.student_id}`);
      setOutpassHistory(res.history || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load outpass history.', 'error');
    } finally {
      setOutpassLoading(false);
    }
  };

  const loadGrievances = async () => {
    setGrievanceLoading(true);
    try {
      const res = await apiFetch<{ grievances: GrievanceRecord[] }>('/grievances/mine');
      setGrievances(res.grievances || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load grievances.', 'error');
    } finally {
      setGrievanceLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (residenceStatus === 'RESIDENT') {
      loadOutpassHistory();
      loadGrievances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residenceStatus, user]);

  const handleSubmitOutpass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.student_id) {
      showToast('Could not identify your student record.', 'error');
      return;
    }
    setSubmittingOutpass(true);
    try {
      const payload: Record<string, any> = {
        student_id: user.student_id,
        reason: outpassForm.reason,
        pickup_person_name: outpassForm.pickup_person_name,
        pickup_person_phone: outpassForm.pickup_person_phone,
        relationship: outpassForm.relationship
      };
      if (outpassForm.parent_phone) payload.parent_phone = outpassForm.parent_phone;
      if (outpassForm.id_type) payload.id_type = outpassForm.id_type;
      if (outpassForm.id_number) payload.id_number = outpassForm.id_number;

      const res = await apiFetch<{ success: boolean; message: string; outpassNumber: string }>('/outpass/request', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setShowOutpassModal(false);
      setOutpassForm(EMPTY_OUTPASS_FORM);
      showToast(res.message || `Outpass ${res.outpassNumber} requested successfully.`, 'success');
      loadOutpassHistory();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit outpass request.', 'error');
    } finally {
      setSubmittingOutpass(false);
    }
  };

  const handleSubmitGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingGrievance(true);
    try {
      const res = await apiFetch<{ success: boolean; id: string; message: string }>('/grievances', {
        method: 'POST',
        body: JSON.stringify({
          category: grievanceForm.category,
          subject: grievanceForm.subject,
          description: grievanceForm.description
        })
      });
      setShowGrievanceModal(false);
      setGrievanceForm(EMPTY_GRIEVANCE_FORM);
      showToast(res.message || 'Grievance submitted to the Warden.', 'success');
      loadGrievances();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit grievance.', 'error');
    } finally {
      setSubmittingGrievance(false);
    }
  };

  const sortedOutpass = [...outpassHistory].sort(
    (a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()
  );
  const sortedGrievances = [...grievances].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (residenceStatus !== 'RESIDENT') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-[#fdfcfb] rounded-3xl p-8 border border-[#ded9cf] shadow-xs text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto">
            <Home className="w-7 h-7 text-slate-400" />
          </div>
          <h2 className="text-base font-bold text-slate-900 font-heading">Hostel Residents Only</h2>
          <p className="text-sm text-slate-500">
            Outpass requests and grievances are available to hostel residents only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Tab Pills */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('OUTPASS')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'OUTPASS' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DoorOpen className="w-3.5 h-3.5" />
          My Outpass
        </button>
        <button
          onClick={() => setActiveTab('GRIEVANCE')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'GRIEVANCE' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageSquareWarning className="w-3.5 h-3.5" />
          Grievances
        </button>
      </div>

      {/* ============================= OUTPASS TAB ============================= */}
      {activeTab === 'OUTPASS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-heading">My Outpass Requests</h2>
              <p className="text-xs text-slate-500 mt-0.5">Request a gate pass and track its status end-to-end.</p>
            </div>
            <button
              onClick={() => setShowOutpassModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Request Outpass
            </button>
          </div>

          {outpassLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : sortedOutpass.length === 0 ? (
            <div className="p-12 text-center bg-[#fdfcfb] rounded-3xl border border-[#ded9cf] text-slate-400 text-sm">
              No outpass requests yet.
            </div>
          ) : (
            <div className="space-y-3">
              {sortedOutpass.map((o) => (
                <div
                  key={o.id}
                  className="bg-[#fdfcfb] rounded-2xl p-5 border border-[#ded9cf] shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">{o.outpass_number}</span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${OUTPASS_STATUS_STYLES[o.status]}`}
                        >
                          {o.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{o.reason}</p>
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      Requested {formatDateTime(o.requested_at)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-3 border-t border-[#f2eee6]">
                    <div>
                      <span className="text-slate-400 block font-medium">Pickup Person</span>
                      <span className="font-semibold text-slate-800">{o.pickup_person_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Pickup Phone</span>
                      <span className="font-semibold text-slate-800">{o.pickup_person_phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Relationship</span>
                      <span className="font-semibold text-slate-800">{o.relationship}</span>
                    </div>
                  </div>

                  {/* Status timeline */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] pt-2 border-t border-[#f2eee6]">
                    {o.approved_at && (
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-100">
                        Approved by {o.approved_by_name || 'Staff'} • {formatDateTime(o.approved_at)}
                      </span>
                    )}
                    {o.exit_time && (
                      <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-100">
                        Exited {formatDateTime(o.exit_time)}
                        {o.exit_staff_name ? ` (verified by ${o.exit_staff_name})` : ''}
                      </span>
                    )}
                    {o.return_time && (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100">
                        Returned {formatDateTime(o.return_time)}
                        {o.return_staff_name ? ` (verified by ${o.return_staff_name})` : ''}
                      </span>
                    )}
                    {o.status === 'REJECTED' && o.rejection_reason && (
                      <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-100">
                        Rejected: {o.rejection_reason}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================= GRIEVANCE TAB ============================= */}
      {activeTab === 'GRIEVANCE' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-heading">My Grievances</h2>
              <p className="text-xs text-slate-500 mt-0.5">File a grievance that reaches the Warden directly.</p>
            </div>
            <button
              onClick={() => setShowGrievanceModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              File a Grievance
            </button>
          </div>

          {grievanceLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : sortedGrievances.length === 0 ? (
            <div className="p-12 text-center bg-[#fdfcfb] rounded-3xl border border-[#ded9cf] text-slate-400 text-sm">
              No grievances filed yet.
            </div>
          ) : (
            <div className="space-y-3">
              {sortedGrievances.map((g) => (
                <div
                  key={g.id}
                  className="bg-[#fdfcfb] rounded-2xl p-5 border border-[#ded9cf] shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{g.subject}</span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${GRIEVANCE_STATUS_STYLES[g.status]}`}
                        >
                          {g.status.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {GRIEVANCE_CATEGORY_LABELS[g.category] || g.category}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      Filed {formatDateTime(g.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 pt-2 border-t border-[#f2eee6]">{g.description}</p>

                  {g.response && (
                    <div className="pt-2 border-t border-[#f2eee6] bg-sky-50/60 -mx-5 -mb-5 px-5 py-3 rounded-b-2xl">
                      <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block mb-1">
                        Warden's Response
                      </span>
                      <p className="text-xs text-slate-700">{g.response}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {g.responded_by_name ? `${g.responded_by_name} • ` : ''}
                        {formatDateTime(g.responded_at)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REQUEST OUTPASS */}
      {/* ========================================================================= */}
      {showOutpassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#ded9cf] my-8">
            <div className="bg-[#fdfcfb] p-5 border-b border-[#ded9cf] flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 font-heading flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-blue-600" />
                Request Outpass
              </h3>
              <button
                onClick={() => setShowOutpassModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOutpass} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Visiting home for the weekend"
                  value={outpassForm.reason}
                  onChange={(e) => setOutpassForm({ ...outpassForm, reason: e.target.value })}
                  className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pickup Person Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Kulkarni"
                    value={outpassForm.pickup_person_name}
                    onChange={(e) => setOutpassForm({ ...outpassForm, pickup_person_name: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pickup Person Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98450 67890"
                    value={outpassForm.pickup_person_phone}
                    onChange={(e) => setOutpassForm({ ...outpassForm, pickup_person_phone: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Relationship</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Father, Mother, Guardian"
                  value={outpassForm.relationship}
                  onChange={(e) => setOutpassForm({ ...outpassForm, relationship: e.target.value })}
                  className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Parent Phone (Optional)</label>
                <input
                  type="text"
                  placeholder="For OTP verification, if different"
                  value={outpassForm.parent_phone}
                  onChange={(e) => setOutpassForm({ ...outpassForm, parent_phone: e.target.value })}
                  className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ID Type (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Aadhaar Card"
                    value={outpassForm.id_type}
                    onChange={(e) => setOutpassForm({ ...outpassForm, id_type: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ID Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. XXXX-XXXX-XXXX"
                    value={outpassForm.id_number}
                    onChange={(e) => setOutpassForm({ ...outpassForm, id_number: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOutpassModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOutpass}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {submittingOutpass ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FILE GRIEVANCE */}
      {/* ========================================================================= */}
      {showGrievanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#ded9cf] my-8">
            <div className="bg-[#fdfcfb] p-5 border-b border-[#ded9cf] flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 font-heading flex items-center gap-2">
                <MessageSquareWarning className="w-4 h-4 text-blue-600" />
                File a Grievance
              </h3>
              <button
                onClick={() => setShowGrievanceModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSubmitGrievance} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={grievanceForm.category}
                  onChange={(e) =>
                    setGrievanceForm({ ...grievanceForm, category: e.target.value as GrievanceCategory })
                  }
                  className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                >
                  {(Object.keys(GRIEVANCE_CATEGORY_LABELS) as GrievanceCategory[]).map((c) => (
                    <option key={c} value={c}>
                      {GRIEVANCE_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Water leakage in Room 204"
                  value={grievanceForm.subject}
                  onChange={(e) => setGrievanceForm({ ...grievanceForm, subject: e.target.value })}
                  className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the issue in detail..."
                  value={grievanceForm.description}
                  onChange={(e) => setGrievanceForm({ ...grievanceForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGrievanceModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingGrievance}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {submittingGrievance ? 'Submitting...' : 'Submit Grievance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
