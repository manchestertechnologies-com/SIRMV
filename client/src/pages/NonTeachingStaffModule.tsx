import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Search,
  Plus,
  Shield,
  Phone,
  Mail,
  Building,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  CheckCheck
} from 'lucide-react';
import { IconStaffs } from '../components/ModuleIcons';

export const NonTeachingStaffModule: React.FC = () => {
  const { user, currentBranch } = useAuth();
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    role: 'FLOOR_ATTENDER',
    password: ''
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isManagement = ['ADMIN', 'PRINCIPAL'].includes(user?.role || '');

  const loadStaff = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<any>(`/staff?branch_id=${currentBranch?.id || ''}`);
      setStaffMembers(res.staffMembers || []);
    } catch (err: any) {
      console.error('Failed to load non-teaching staff', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [currentBranch]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<any>('/staff', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setShowCreateModal(false);
      setFormData({
        name: '',
        username: '',
        email: '',
        phone: '',
        role: 'FLOOR_ATTENDER',
        password: ''
      });
      setNotification({ type: 'success', message: res.message || 'Staff account created successfully.' });
      setTimeout(() => setNotification(null), 4000);
      loadStaff();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredStaff = staffMembers.filter((s) => {
    const matchesRole = selectedRole === 'ALL' || s.role === selectedRole;
    const matchesSearch =
      searchQuery === '' ||
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone?.includes(searchQuery);
    return matchesRole && matchesSearch;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'FLOOR_ATTENDER':
        return <span className="px-2 py-0.5 bg-orange-100 text-orange-900 rounded-lg text-[10px] font-bold">Floor Attender</span>;
      case 'WARDEN':
        return <span className="px-2 py-0.5 bg-teal-100 text-teal-900 rounded-lg text-[10px] font-bold">Hostel Warden</span>;
      case 'HEAD_WARDEN':
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-lg text-[10px] font-bold">Head Warden</span>;
      case 'GATE_STAFF':
        return <span className="px-2 py-0.5 bg-slate-200 text-slate-900 rounded-lg text-[10px] font-bold">Gate & Security</span>;
      default:
        return <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded-lg text-[10px] font-bold">Non-Teaching</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Card */}
      <div className="bg-[#fdfcfb] rounded-3xl p-6 sm:p-8 border border-[#ded9cf] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#fef3c7] border border-[#fde68a] flex items-center justify-center p-2.5 shrink-0">
            <IconStaffs className="w-10 h-10 text-amber-800" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">
                Non-Teaching & Operational Staff
              </h1>
              <span className="bg-[#fef3c7] text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-bold border border-[#fde68a]">
                {staffMembers.length} Staff Personnel
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Floor attenders, hostel wardens, gate security personnel, and administrative support staff.
            </p>
          </div>
        </div>

        {isManagement && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Register Staff Member
          </button>
        )}
      </div>

      {/* Notification */}
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

      {/* Filters Toolbar */}
      <div className="bg-[#fdfcfb] p-4 rounded-2xl border border-[#ded9cf] flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700">Role Designation:</span>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-white border border-[#ded9cf] rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold outline-none"
          >
            <option value="ALL">All Roles</option>
            <option value="FLOOR_ATTENDER">Floor Attenders</option>
            <option value="WARDEN">Hostel Wardens</option>
            <option value="HEAD_WARDEN">Head Wardens</option>
            <option value="GATE_STAFF">Gate Staff / Security</option>
            <option value="NON_TEACHING_STAFF">Non-Teaching Administrative</option>
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff by name, phone..."
            className="w-full pl-9 pr-4 py-1.5 bg-white border border-[#ded9cf] rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Staff Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="p-12 text-center bg-[#fdfcfb] rounded-3xl border border-[#ded9cf] text-slate-400 text-sm">
          No non-teaching staff found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((s) => (
            <div
              key={s.id}
              className="bg-[#fdfcfb] rounded-3xl p-5 border border-[#ded9cf] shadow-2xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-900 font-bold text-base font-heading shrink-0">
                      {s.name
                        ?.split(' ')
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{s.name}</h3>
                      <div className="mt-1">{getRoleBadge(s.role)}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-[#ede9df] text-slate-700 px-2 py-0.5 rounded-lg">
                    {s.username}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-[#f2eee6] space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{s.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{s.phone || '+91 98450 11223'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>{s.branch_name} ({s.branch_city})</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#f2eee6] flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active Staff
                </span>
                <span className="text-slate-400 font-mono text-[10px]">
                  Institutional ERP
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Registration Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-[#ded9cf]">
            <div className="bg-[#fdfcfb] p-5 border-b border-[#ded9cf] flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 font-heading flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                Register Non-Teaching Personnel
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role / Department</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                >
                  <option value="FLOOR_ATTENDER">Floor Attender</option>
                  <option value="WARDEN">Hostel Warden</option>
                  <option value="HEAD_WARDEN">Head Warden</option>
                  <option value="GATE_STAFF">Gate Security Personnel</option>
                  <option value="NON_TEACHING_STAFF">Non-Teaching Office Staff</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98450 11223"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-[#ded9cf] rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="ramesh@college.test"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
