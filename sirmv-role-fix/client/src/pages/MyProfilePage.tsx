import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserCircle, Mail, Phone, Building2, Briefcase } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  FLOOR_ATTENDER: 'Floor In-Charge',
  NON_TEACHING_STAFF: 'Non-Teaching Staff',
  GATE_STAFF: 'Gate Security Staff',
  WARDEN: 'Hostel Warden',
  HEAD_WARDEN: 'Head Warden',
  TEACHER: 'Teacher',
  HOD: 'Head of Department',
  ADMIN: 'Administrator',
  PRINCIPAL: 'Principal'
};

// A simple read-only "My Profile" view for staff roles that don't have a
// richer role-specific profile page of their own (e.g. Floor In-Charge).
// Pulls straight from the already-loaded auth session — no extra fetch.
export const MyProfilePage: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xl">
            {initials || <UserCircle className="w-8 h-8" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{user.name}</h2>
            <p className="text-xs text-slate-500 font-semibold">
              {ROLE_LABELS[user.role] || user.role}
              {user.staff_category ? ` • ${user.staff_category}` : ''}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-slate-400 block">Email</span>
              <span className="font-semibold text-slate-800">{user.email || 'N/A'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-slate-400 block">Phone</span>
              <span className="font-semibold text-slate-800">{user.phone || 'N/A'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-slate-400 block">Branch</span>
              <span className="font-semibold text-slate-800">{user.branch_name || 'N/A'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-slate-400 block">Role</span>
              <span className="font-semibold text-slate-800">{ROLE_LABELS[user.role] || user.role}</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-400">
          To update these details, contact your administrator.
        </p>
      </div>
    </div>
  );
};
