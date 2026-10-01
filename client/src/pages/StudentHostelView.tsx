import React, { useEffect, useState } from 'react';
import { showToast } from '../utils/toast';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Bed,
  Users,
  Building,
  CalendarDays,
  Wrench,
  Plus,
  X,
  Phone,
  ClipboardList
} from 'lucide-react';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'PLUMBING', label: 'Plumbing' },
  { value: 'FURNITURE', label: 'Furniture' },
  { value: 'OTHER', label: 'Other' }
];

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-amber-100 text-amber-900 border border-amber-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-900 border border-blue-200',
  RESOLVED: 'bg-emerald-100 text-emerald-900 border border-emerald-200'
};

interface RoomInfo {
  bed_id: string;
  bed_number: string;
  room_id: string;
  room_number: string;
  floor: number;
  capacity: number;
  block_id: string;
  block_name: string;
  hostel_id: string;
  hostel_name: string;
  hostel_type: string;
}

interface Roommate {
  bed_number: string;
  student_id: string;
  name: string;
  register_number: string;
  photo_url?: string | null;
  phone?: string | null;
}

interface CleaningEntry {
  day_of_week: string;
  task: string;
  time_slot: string;
}

interface MaintenanceRequest {
  id: string;
  branch_id?: string;
  student_id: string;
  room_id: string;
  room_number?: string;
  category: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  resolved_at?: string | null;
  created_at: string;
}

export const StudentHostelView: React.FC = () => {
  const { user } = useAuth();

  const [profileLoading, setProfileLoading] = useState(true);
  const [residenceStatus, setResidenceStatus] = useState<string | null>(null);

  const [roomLoading, setRoomLoading] = useState(true);
  const [allotted, setAllotted] = useState(false);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [roommates, setRoommates] = useState<Roommate[]>([]);
  const [cleaningSchedule, setCleaningSchedule] = useState<CleaningEntry[]>([]);

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState('MAINTENANCE');
  const [reportDescription, setReportDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const studentId = user?.student_id;

  const loadProfile = async () => {
    setProfileLoading(true);
    try {
      const res = await apiFetch<any>('/students/me/profile');
      setResidenceStatus(res?.profile?.residence_status || null);
    } catch (err: any) {
      console.error('Failed to load student profile', err);
      showToast(err.message || 'Failed to load your profile', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const loadMyRoom = async () => {
    if (!studentId) {
      setRoomLoading(false);
      return;
    }
    setRoomLoading(true);
    try {
      const res = await apiFetch<any>(`/hostel/my-room?student_id=${studentId}`);
      setAllotted(!!res.allotted);
      setRoom(res.room || null);
      setRoommates(res.roommates || []);
      setCleaningSchedule(res.cleaningSchedule || []);
    } catch (err: any) {
      console.error('Failed to load hostel room info', err);
      showToast(err.message || 'Failed to load your room information', 'error');
    } finally {
      setRoomLoading(false);
    }
  };

  const loadMyRequests = async () => {
    if (!studentId) {
      setRequestsLoading(false);
      return;
    }
    setRequestsLoading(true);
    try {
      const res = await apiFetch<any>(`/hostel/maintenance/mine?student_id=${studentId}`);
      const list: MaintenanceRequest[] = res.requests || [];
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRequests(list);
    } catch (err: any) {
      console.error('Failed to load maintenance requests', err);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (residenceStatus === 'RESIDENT') {
      loadMyRoom();
      loadMyRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residenceStatus, studentId]);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDescription.trim()) {
      showToast('Please describe the issue.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/hostel/maintenance', {
        method: 'POST',
        body: JSON.stringify({ category: reportCategory, description: reportDescription.trim() })
      });
      setShowReportModal(false);
      setReportCategory('MAINTENANCE');
      setReportDescription('');
      showToast('Your maintenance request has been filed.', 'success');
      loadMyRequests();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit your request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const scheduleByDay = DAY_ORDER.map((day) => ({
    day,
    entries: cleaningSchedule.filter((c) => c.day_of_week === day)
  })).filter((d) => d.entries.length > 0);

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (residenceStatus !== 'RESIDENT') {
    return (
      <div className="bg-[#fdfcfb] rounded-3xl p-8 border border-[#ded9cf] shadow-xs text-center">
        <Home className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">
          You are not currently allotted a hostel room — this page is for hostel residents.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {roomLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : !allotted || !room ? (
        <div className="bg-[#fdfcfb] rounded-3xl p-8 border border-[#ded9cf] shadow-xs text-center">
          <Bed className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            You haven&apos;t been allotted a hostel room yet. Contact your Warden.
          </p>
        </div>
      ) : (
        <>
          {/* My Room */}
          <div className="bg-[#fdfcfb] rounded-3xl p-6 border border-[#ded9cf] shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-[#e0f2fe] border border-[#bae6fd] flex items-center justify-center shrink-0">
                <Home className="w-6 h-6 text-sky-800" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-heading">My Room</h2>
                <p className="text-xs text-slate-500">
                  {room.hostel_name} • {room.hostel_type === 'BOYS' ? "Boys' Hostel" : room.hostel_type === 'GIRLS' ? "Girls' Hostel" : room.hostel_type}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium flex items-center gap-1">
                  <Building className="w-3 h-3" /> Block
                </span>
                <span className="font-bold text-slate-800">{room.block_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Floor</span>
                <span className="font-bold text-slate-800">{room.floor}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Room Number</span>
                <span className="font-bold text-slate-800 font-mono">{room.room_number}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium flex items-center gap-1">
                  <Bed className="w-3 h-3" /> Bed
                </span>
                <span className="font-bold text-slate-800">
                  Bed {room.bed_number} of {room.capacity}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#f2eee6] text-xs text-slate-500">
              Room {room.room_number} • Bed {room.bed_number} of {room.capacity}
            </div>
          </div>

          {/* Roommates */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-indigo-600" />
              Roommates
            </h3>
            {roommates.length === 0 ? (
              <p className="text-slate-400 text-xs">No roommates yet — you have the room to yourself.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {roommates.map((rm) => (
                  <div
                    key={rm.student_id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60"
                  >
                    <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-800 font-bold text-xs shrink-0 overflow-hidden">
                      {rm.photo_url ? (
                        <img src={rm.photo_url} alt={rm.name} className="w-full h-full object-cover" />
                      ) : (
                        rm.name
                          ?.split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-xs truncate">{rm.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{rm.register_number}</div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[10px] text-slate-400">Bed {rm.bed_number}</span>
                        {rm.phone && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5" /> {rm.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weekly Cleaning Schedule */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                Weekly Cleaning Schedule
              </h3>
            </div>
            {scheduleByDay.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">Cleaning schedule not available yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-3 px-4">Day</th>
                      <th className="py-3 px-4">Task</th>
                      <th className="py-3 px-4">Time Slot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scheduleByDay.map((d) =>
                      d.entries.map((entry, idx) => (
                        <tr key={`${d.day}-${idx}`} className="hover:bg-slate-50/70 transition">
                          {idx === 0 ? (
                            <td
                              className="py-3 px-4 font-bold text-indigo-950 align-top"
                              rowSpan={d.entries.length}
                            >
                              {d.day}
                            </td>
                          ) : null}
                          <td className="py-3 px-4 text-slate-800 font-semibold">{entry.task}</td>
                          <td className="py-3 px-4 text-slate-500">{entry.time_slot}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Report an Issue */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Wrench className="w-4 h-4" />
              Report an Issue
            </button>
          </div>

          {/* My Maintenance Requests */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-indigo-600" />
                My Maintenance Requests
              </h3>
            </div>
            {requestsLoading ? (
              <div className="p-8 text-center text-slate-400 text-xs">Loading your requests...</div>
            ) : requests.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No maintenance requests filed yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <div key={req.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-900">
                          {CATEGORY_OPTIONS.find((c) => c.value === req.category)?.label || req.category}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            STATUS_BADGE[req.status] || 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {req.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{req.description}</p>
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ============================ */}
      {/* MODAL: REPORT AN ISSUE       */}
      {/* ============================ */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-[#ded9cf]">
            <div className="bg-[#fdfcfb] p-5 border-b border-[#ded9cf] flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 font-heading flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                Report an Issue
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the issue in your room..."
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
