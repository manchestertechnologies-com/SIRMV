import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CameraModal } from '../components/CameraModal';
import {
  ShieldAlert,
  Camera,
  KeyRound,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Search,
  UserCheck,
  Building,
  User,
  Phone,
  FileText,
  AlertTriangle,
  ArrowRight,
  CheckCheck,
  Sparkles,
  QrCode
} from 'lucide-react';

export const OutpassSystem: React.FC = () => {
  const { user, currentBranch } = useAuth();
  const [activeTab, setActiveTab] = useState<'request' | 'pending-principal' | 'gate-verify' | 'register' | 'printable'>('register');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [reason, setReason] = useState('');
  const [pickupName, setPickupName] = useState('');
  const [pickupPhone, setPickupPhone] = useState('');
  const [relationship, setRelationship] = useState('Father');
  const [idType, setIdType] = useState('Aadhaar Card');
  const [idNumber, setIdNumber] = useState('');
  const [pickupPhotoUrl, setPickupPhotoUrl] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOutpassId, setCreatedOutpassId] = useState<string | null>(null);

  // OTP Verification State
  const [otpCode, setOtpCode] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [parentVerified, setParentVerified] = useState(false);

  // Principal Pending Queue State
  const [pendingOutpasses, setPendingOutpasses] = useState<any[]>([]);
  const [rejectionReason, setRejectionReason] = useState('');

  // Gate Verification State
  const [gateSearchQuery, setGateSearchQuery] = useState('');
  const [verifiedOutpass, setVerifiedOutpass] = useState<any | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);

  // Principal Register State
  const [registerData, setRegisterData] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  // Printable Pass State
  const [printableOutpassId, setPrintableOutpassId] = useState<string>('op-1001');
  const [printableData, setPrintableData] = useState<any | null>(null);

  // Camera Modal State
  const [showCamera, setShowCamera] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load Initial Data
  useEffect(() => {
    async function loadMeta() {
      try {
        const branchId = currentBranch?.id || '';
        const bMeta = await apiFetch<any>(`/branches/${branchId}/meta`);
        // load student profiles
        const resReg = await apiFetch<any>(`/outpass/register?branch_id=${branchId}`);
        setRegisterData(resReg);
      } catch (err: any) {
        console.error('Failed to load initial outpass data', err);
      }
    }
    loadMeta();
  }, [currentBranch]);

  // Load Students for request dropdown
  useEffect(() => {
    async function loadStudents() {
      try {
        const res = await apiFetch<any>(`/evening-study/session?branch_id=${currentBranch?.id || ''}`);
        setStudents(res.students || []);
        if (res.students?.length > 0) {
          setSelectedStudentId(res.students[0].id);
          setParentPhone(res.students[0].parent_phone || '9845012345');
        }
      } catch (err: any) {}
    }
    loadStudents();
  }, [currentBranch]);

  // Load Pending for Principal
  const loadPendingPrincipal = async () => {
    try {
      const res = await apiFetch<any>(`/outpass/pending-principal?branch_id=${currentBranch?.id || ''}`);
      setPendingOutpasses(res.pendingOutpasses || []);
    } catch (err: any) {
      console.error('Failed to load pending outpasses', err);
    }
  };

  // Load Register
  const loadRegister = async () => {
    try {
      const res = await apiFetch<any>(
        `/outpass/register?branch_id=${currentBranch?.id || ''}&status=${statusFilter}&search=${encodeURIComponent(searchFilter)}`
      );
      setRegisterData(res);
    } catch (err: any) {
      console.error('Failed to load outpass register', err);
    }
  };

  // Load Printable Pass
  const loadPrintable = async (opId: string) => {
    try {
      const res = await apiFetch<any>(`/outpass/${opId}/print`);
      setPrintableData(res.outpass);
      setPrintableOutpassId(opId);
      setActiveTab('printable');
    } catch (err: any) {
      alert('Failed to load printable pass: ' + err.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'pending-principal') loadPendingPrincipal();
    if (activeTab === 'register') loadRegister();
    if (activeTab === 'printable' && printableOutpassId) loadPrintable(printableOutpassId);
  }, [activeTab, currentBranch, statusFilter, searchFilter]);

  // When student selection changes, prefill parent phone
  const handleStudentSelect = (sId: string) => {
    setSelectedStudentId(sId);
    const found = students.find((s) => s.id === sId);
    if (found) {
      setParentPhone(found.parent_phone);
      if (found.parent_name) setPickupName(found.parent_name);
    }
  };

  // Step 1: Create Outpass Request
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await apiFetch<any>('/outpass/request', {
        method: 'POST',
        body: JSON.stringify({
          student_id: selectedStudentId,
          reason,
          pickup_person_name: pickupName,
          pickup_person_phone: pickupPhone,
          relationship,
          id_type: idType,
          id_number: idNumber,
          pickup_photo_url: pickupPhotoUrl,
          parent_phone: parentPhone
        })
      });

      setCreatedOutpassId(res.outpassId);
      setSuccessMessage(res.message);

      // Auto-trigger OTP send
      const otpRes = await apiFetch<any>(`/outpass/${res.outpassId}/send-otp`, { method: 'POST' });
      setSimulatedOtp(otpRes.simulatedOtp);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify Parent OTP
  const handleVerifyOtp = async () => {
    if (!createdOutpassId || !otpCode) return;
    setIsVerifyingOtp(true);
    try {
      const res = await apiFetch<any>(`/outpass/${createdOutpassId}/verify-otp`, {
        method: 'POST',
        body: JSON.stringify({ otp: otpCode })
      });

      setParentVerified(true);
      setSuccessMessage(res.message);
      setTimeout(() => {
        setActiveTab('pending-principal');
        loadPendingPrincipal();
      }, 2000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Principal Approval
  const handleApproveOutpass = async (outpassId: string) => {
    try {
      const res = await apiFetch<any>(`/outpass/${outpassId}/approve`, { method: 'POST' });
      setSuccessMessage(res.message);
      setTimeout(() => setSuccessMessage(null), 5000);
      loadPendingPrincipal();
      loadPrintable(outpassId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Principal Rejection
  const handleRejectOutpass = async (outpassId: string) => {
    const reasonPrompt = window.prompt('Enter rejection reason for security audit:', 'Incomplete verification');
    if (!reasonPrompt) return;

    try {
      const res = await apiFetch<any>(`/outpass/${outpassId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reasonPrompt })
      });
      setSuccessMessage(res.message);
      setTimeout(() => setSuccessMessage(null), 4000);
      loadPendingPrincipal();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Gate Search & Verification
  const handleGateSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gateSearchQuery.trim()) return;
    setGateError(null);
    setVerifiedOutpass(null);

    try {
      const res = await apiFetch<any>(
        `/outpass/gate-verify/${encodeURIComponent(gateSearchQuery.trim())}?branch_id=${currentBranch?.id || ''}`
      );
      setVerifiedOutpass(res.outpass);
    } catch (err: any) {
      setGateError(err.message);
    }
  };

  // Gate Record Exit
  const handleGateRecordExit = async (outpassId: string) => {
    try {
      const res = await apiFetch<any>(`/outpass/${outpassId}/record-exit`, { method: 'POST' });
      setSuccessMessage(res.message);
      // Reload verified outpass
      const fresh = await apiFetch<any>(`/outpass/gate-verify/${outpassId}?branch_id=${currentBranch?.id || ''}`);
      setVerifiedOutpass(fresh.outpass);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Gate Record Return
  const handleGateRecordReturn = async (outpassId: string) => {
    try {
      const res = await apiFetch<any>(`/outpass/${outpassId}/record-return`, { method: 'POST' });
      setSuccessMessage(res.message);
      // Reload verified outpass
      const fresh = await apiFetch<any>(`/outpass/gate-verify/${outpassId}?branch_id=${currentBranch?.id || ''}`);
      setVerifiedOutpass(fresh.outpass);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">Student Outpass & Campus Gate Pass System</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pickup camera verification ➔ Parent OTP verification ➔ Principal digital signature ➔ 4-digit Gate verification code.
          </p>
        </div>

        {/* Workflow Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('request')}
            className={`px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'request' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. New Outpass
          </button>
          <button
            onClick={() => setActiveTab('pending-principal')}
            className={`px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'pending-principal' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Principal Queue
          </button>
          <button
            onClick={() => setActiveTab('gate-verify')}
            className={`px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'gate-verify' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Gate Fast Verify
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'register' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            4. Outpass Register
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-sm no-print">
          <CheckCheck className="w-5 h-5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* TAB 1: NEW OUTPASS REQUEST + PICKUP CAMERA CAPTURE + PARENT OTP */}
      {activeTab === 'request' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Request Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
            <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              Student Outpass Request & Pickup Verification
            </h3>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Student</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.register_number}) - {s.class_name} {s.section_name} ({s.batch_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Leaving Campus</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Attending sister wedding reception / Doctor appointment"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                />
              </div>

              {/* Pickup Person Details Grid */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-600" />
                  Pickup Person Details & Identity
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Pickup Person Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={pickupName}
                      onChange={(e) => setPickupName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Relationship to Student</label>
                    <select
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 outline-none"
                    >
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Brother">Brother</option>
                      <option value="Sister">Sister</option>
                      <option value="Guardian">Local Guardian</option>
                      <option value="Relative">Uncle / Relative</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Pickup Person Mobile</label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile number"
                      value={pickupPhone}
                      onChange={(e) => setPickupPhone(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Govt ID Type & Number</label>
                    <div className="flex gap-2">
                      <select
                        value={idType}
                        onChange={(e) => setIdType(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl p-2 text-[11px] outline-none w-1/2"
                      >
                        <option value="Aadhaar Card">Aadhaar</option>
                        <option value="Driving License">DL</option>
                        <option value="Voter ID">Voter ID</option>
                        <option value="PAN Card">PAN</option>
                      </select>
                      <input
                        type="text"
                        placeholder="ID Number"
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        className="w-1/2 bg-white border border-slate-200 rounded-xl p-2 outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Pickup Person Camera Photo Capture */}
                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Pickup Person Live Photograph (Mandatory Verification)
                  </label>
                  <div className="flex items-center gap-4">
                    {pickupPhotoUrl ? (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-300">
                        <img src={pickupPhotoUrl} alt="Pickup Person" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-400">
                        <Camera className="w-6 h-6 opacity-60" />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowCamera(true)}
                      className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl border border-indigo-200 transition flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      {pickupPhotoUrl ? 'Retake Photo' : 'Open Camera & Capture Photo'}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Registered Parent Mobile Number (For OTP)</label>
                <input
                  type="tel"
                  required
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-mono font-bold text-indigo-900"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || createdOutpassId !== null}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                {isSubmitting ? 'Creating Request...' : 'Generate Outpass & Send Parent OTP'}
              </button>
            </form>
          </div>

          {/* Right: Parent OTP Verification Step */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-600" />
              Parent OTP Verification
            </h3>

            {createdOutpassId ? (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-indigo-900">
                  <p className="font-bold">OTP Sent to Parent</p>
                  <p className="text-[11px] text-indigo-700 mt-0.5">Mobile: {parentPhone}</p>
                  {simulatedOtp && (
                    <div className="mt-2 p-2 bg-white rounded-lg border border-indigo-200 font-mono text-center">
                      <span className="text-[10px] text-slate-400 block">Simulated SMS Code (Dev Mode)</span>
                      <strong className="text-lg text-indigo-600 tracking-widest">{simulatedOtp}</strong>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Enter 6-digit OTP Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono font-bold text-center tracking-widest text-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={isVerifyingOtp || parentVerified}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
                    parentVerified
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {parentVerified ? 'PARENT VERIFIED' : isVerifyingOtp ? 'Verifying...' : 'Verify Parent OTP'}
                </button>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                Complete student and pickup details on the left and click "Generate Outpass" to dispatch parent verification OTP.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PRINCIPAL APPROVAL QUEUE */}
      {activeTab === 'pending-principal' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Principal Outpass Authorization Queue</h3>
              <p className="text-xs text-slate-500">
                Pending requests requiring institutional sign-off and 4-digit gate code issuance.
              </p>
            </div>
            <span className="px-3 py-1 bg-amber-100 text-amber-900 font-bold rounded-full text-xs">
              {pendingOutpasses.length} Pending
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {pendingOutpasses.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                No pending outpasses in the queue.
              </div>
            ) : (
              pendingOutpasses.map((op) => (
                <div key={op.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50/70 transition">
                  <div className="flex items-start gap-4">
                    {/* Pickup Photo */}
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {op.pickup_photo_url ? (
                        <img src={op.pickup_photo_url} alt="Pickup" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-slate-400" />
                      )}
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{op.student_name}</span>
                        <span className="font-mono text-slate-500">({op.register_number})</span>
                        <span className="bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded">
                          {op.class_name} {op.section_name} ({op.batch_name})
                        </span>
                      </div>

                      <div className="text-slate-600">
                        Pickup: <strong>{op.pickup_person_name}</strong> ({op.relationship}) • Ph: {op.pickup_person_phone}
                      </div>

                      <div className="text-slate-500 italic">
                        Reason: {op.reason}
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          op.parent_otp_verified === 1
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {op.parent_otp_verified === 1 ? 'PARENT OTP VERIFIED' : 'OTP PENDING'}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">Req: {op.requested_at}</span>
                      </div>
                    </div>
                  </div>

                  {/* Principal Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRejectOutpass(op.id)}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 transition"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproveOutpass(op.id)}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve & Issue 4-Digit Code
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GATE STAFF RAPID SEARCH & VERIFICATION */}
      {activeTab === 'gate-verify' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs max-w-xl mx-auto space-y-4">
            <h3 className="font-bold text-slate-900 text-base text-center flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-indigo-600" />
              Gate Staff Instant Outpass Verification
            </h3>

            <form onSubmit={handleGateSearch} className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Enter Outpass # (e.g. OP-2026...) or 4-digit Code (e.g. 4827)"
                value={gateSearchQuery}
                onChange={(e) => setGateSearchQuery(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono font-bold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition"
              >
                Verify
              </button>
            </form>

            {gateError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs text-center font-medium">
                {gateError}
              </div>
            )}
          </div>

          {/* Verification Card */}
          {verifiedOutpass && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-2xl mx-auto p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                    VERIFIED CAMPUS GATE PASS
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-900">{verifiedOutpass.outpass_number}</h2>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black font-mono text-indigo-600">{verifiedOutpass.verification_code}</div>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                    verifiedOutpass.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                    verifiedOutpass.status === 'OUT' ? 'bg-amber-100 text-amber-800' :
                    verifiedOutpass.status === 'RETURNED' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    STATUS: {verifiedOutpass.status}
                  </span>
                </div>
              </div>

              {/* Photos Comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 block">Enrolled Student</span>
                  <div className="w-24 h-24 mx-auto rounded-2xl bg-white border border-slate-200 overflow-hidden">
                    <img src={verifiedOutpass.student_photo || '/avatars/student_rahul.png'} alt="Student" className="w-full h-full object-cover" />
                  </div>
                  <div className="font-bold text-slate-900 text-xs">{verifiedOutpass.student_name}</div>
                  <div className="font-mono text-[10px] text-slate-400">{verifiedOutpass.register_number}</div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 block">Verified Pickup Person</span>
                  <div className="w-24 h-24 mx-auto rounded-2xl bg-white border border-slate-200 overflow-hidden">
                    {verifiedOutpass.pickup_photo_url ? (
                      <img src={verifiedOutpass.pickup_photo_url} alt="Pickup Person" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 mx-auto mt-6 text-slate-400" />
                    )}
                  </div>
                  <div className="font-bold text-slate-900 text-xs">{verifiedOutpass.pickup_person_name}</div>
                  <div className="text-[10px] text-indigo-600 font-semibold">{verifiedOutpass.relationship}</div>
                </div>
              </div>

              {/* Gate Actions */}
              <div className="pt-2 flex gap-3">
                {verifiedOutpass.status === 'APPROVED' && (
                  <button
                    onClick={() => handleGateRecordExit(verifiedOutpass.id)}
                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                  >
                    RECORD STUDENT EXIT
                  </button>
                )}

                {verifiedOutpass.status === 'OUT' && (
                  <button
                    onClick={() => handleGateRecordReturn(verifiedOutpass.id)}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                  >
                    RECORD STUDENT RETURN
                  </button>
                )}

                <button
                  onClick={() => loadPrintable(verifiedOutpass.id)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  View Printable Pass
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PRINCIPAL OUTPASS REGISTER */}
      {activeTab === 'register' && (
        <div className="space-y-6">
          {/* KPI Register Metrics */}
          {registerData?.counts && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                <span className="text-xs text-slate-400 block font-medium">Total Passes</span>
                <span className="text-xl font-bold text-slate-900">{registerData.counts.total}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                <span className="text-xs text-slate-400 block font-medium">Currently OUT</span>
                <span className="text-xl font-bold text-amber-600">{registerData.counts.out}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                <span className="text-xs text-slate-400 block font-medium">Safely Returned</span>
                <span className="text-xl font-bold text-emerald-600">{registerData.counts.returned}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                <span className="text-xs text-slate-400 block font-medium">Approved / Pending Exit</span>
                <span className="text-xl font-bold text-indigo-600">{registerData.counts.approved}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                <span className="text-xs text-slate-400 block font-medium">Pending Approval</span>
                <span className="text-xl font-bold text-purple-600">{registerData.counts.pending}</span>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student, reg number, or outpass #..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="OUT">OUT (Outside Campus)</option>
              <option value="RETURNED">RETURNED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          {/* Register Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Outpass #</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Pickup Person</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Exit / Return</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(registerData?.outpasses || []).map((op: any) => (
                    <tr key={op.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-900">{op.outpass_number}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {op.student_name}
                        <span className="block font-mono text-[10px] text-slate-400 font-normal">{op.register_number}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{op.class_name} {op.section_name}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{op.pickup_person_name}</span>
                        <span className="text-[10px] text-slate-400 block">({op.relationship})</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">{op.verification_code || '----'}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {op.exit_time ? `Out: ${op.exit_time.slice(11, 16)}` : '--:--'}
                        <br />
                        {op.return_time ? `Ret: ${op.return_time.slice(11, 16)}` : '--:--'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          op.status === 'APPROVED' ? 'bg-indigo-100 text-indigo-800' :
                          op.status === 'OUT' ? 'bg-amber-100 text-amber-800' :
                          op.status === 'RETURNED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {op.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => loadPrintable(op.id)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                        >
                          Print Pass
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PRINTABLE A4 OUTPASS VIEW */}
      {activeTab === 'printable' && printableData && (
        <div className="space-y-6">
          <div className="no-print flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <button
              onClick={() => setActiveTab('register')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              Back to Register
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              Print Official A4 Outpass
            </button>
          </div>

          {/* OFFICIAL A4 PRINTABLE DOCUMENT */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-12 space-y-6 max-w-3xl mx-auto print:border-none print:shadow-none print:p-0">
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-6 text-center space-y-1">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {printableData.college_name}
              </h2>
              <p className="text-xs text-slate-600">
                {printableData.college_address} • Phone: {printableData.college_phone}
              </p>
              <div className="inline-block mt-2 bg-slate-900 text-white px-4 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase">
                OFFICIAL STUDENT OUTPASS / GATE PASS
              </div>
            </div>

            {/* Pass Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block">Outpass Number</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{printableData.outpass_number}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Date Issued</span>
                <span className="font-bold text-slate-900 text-sm">{printableData.requested_at?.slice(0, 10)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">4-Digit Gate Code</span>
                <span className="font-mono font-black text-indigo-700 text-lg">{printableData.verification_code}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Parent Verification</span>
                <span className="font-bold text-emerald-700">OTP VERIFIED</span>
              </div>
            </div>

            {/* Student & Pickup Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              {/* Student */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                  Student Information
                </div>
                <div><span className="text-slate-400">Name:</span> <strong className="text-slate-900">{printableData.student_name}</strong></div>
                <div><span className="text-slate-400">Register Number:</span> <span className="font-mono font-bold">{printableData.register_number}</span></div>
                <div><span className="text-slate-400">Class & Section:</span> <span>{printableData.class_name} {printableData.section_name}</span></div>
                <div><span className="text-slate-400">Competitive Batch:</span> <span className="font-semibold text-indigo-700">{printableData.batch_name}</span></div>
                <div><span className="text-slate-400">Reason:</span> <span className="italic">{printableData.reason}</span></div>
              </div>

              {/* Pickup Person */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center justify-between">
                  <span>Pickup Person Verification</span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">{printableData.relationship}</span>
                </div>
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                    {printableData.pickup_photo_url ? (
                      <img src={printableData.pickup_photo_url} alt="Pickup" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 mx-auto mt-5 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div><span className="text-slate-400">Name:</span> <strong>{printableData.pickup_person_name}</strong></div>
                    <div><span className="text-slate-400">Mobile:</span> <span className="font-mono">{printableData.pickup_person_phone}</span></div>
                    <div><span className="text-slate-400">Govt ID:</span> <span>{printableData.id_type || 'Aadhaar'}</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timestamps & Signatures */}
            <div className="pt-6 border-t border-slate-200 text-xs space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Gate Exit Recorded</span>
                  <span className="font-mono font-bold text-slate-800">{printableData.exit_time || 'Awaiting Gate Exit'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Gate Return Recorded</span>
                  <span className="font-mono font-bold text-slate-800">{printableData.return_time || 'Awaiting Gate Return'}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 text-center pt-6">
                <div className="border-t border-slate-300 pt-2 text-slate-600">
                  Parent / Guardian Sign
                </div>
                <div className="border-t border-slate-300 pt-2 text-slate-600">
                  Campus Security Gate
                </div>
                <div className="border-t border-slate-300 pt-2">
                  <div className="font-bold text-slate-900">{printableData.principal_name || printableData.branch_principal}</div>
                  <span className="text-[10px] text-emerald-700 font-bold block">✓ DIGITALLY SIGNED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        title="Capture Pickup Person Live Photograph"
        uploadEndpoint="/outpass/upload-photo"
        onPhotoCaptured={(url) => setPickupPhotoUrl(url)}
      />
    </div>
  );
};
