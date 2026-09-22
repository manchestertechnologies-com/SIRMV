import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  ChevronDown,
  LogOut,
  Sparkles,
  Check,
  UserCheck
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, branches, currentBranch, switchBranch, quickSwitchUser, logout } = useAuth();
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  const demoRoles = [
    { email: 'admin.demo@college.test', label: 'Admin (Aarav Kulkarni)', role: 'ADMIN', color: 'bg-purple-100 text-purple-800' },
    { email: 'principal.demo@college.test', label: 'Principal (Dr. B. N. Vishwanath)', role: 'PRINCIPAL', color: 'bg-emerald-100 text-emerald-800' },
    { email: 'hod.demo@college.test', label: 'HOD Physics (Dr. A. S. Patil)', role: 'HOD', color: 'bg-blue-100 text-blue-800' },
    { email: 'teacher.demo@college.test', label: 'Teacher (Mr. Anand Kumar)', role: 'TEACHER', color: 'bg-amber-100 text-amber-800' },
    { email: 'floor.demo@college.test', label: 'Floor Attender (Ramesh Kumar)', role: 'FLOOR_ATTENDER', color: 'bg-orange-100 text-orange-800' },
    { email: 'staff.demo@college.test', label: 'Non-Teaching Staff (Basavarajappa K)', role: 'NON_TEACHING_STAFF', color: 'bg-indigo-100 text-indigo-800' },
    { email: 'warden.demo@college.test', label: 'Hostel Warden (Chandrashekhar M)', role: 'WARDEN', color: 'bg-teal-100 text-teal-800' },
    { email: 'headwarden.demo@college.test', label: 'Head Warden (Dr. M. S. Siddalingaiah)', role: 'HEAD_WARDEN', color: 'bg-emerald-100 text-emerald-900' },
    { email: 'student.demo@college.test', label: 'Student (Rahul Sharma - 2PUC)', role: 'STUDENT', color: 'bg-cyan-100 text-cyan-800' },
    { email: 'parent.demo@college.test', label: 'Parent (Mr. Rakesh Sharma)', role: 'PARENT', color: 'bg-pink-100 text-pink-800' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#fdfcf9] border-b border-[#ded8cb] shadow-2xs">
      <div className="px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="flex items-center gap-1 bg-[#f2efe8] p-1.5 rounded-xl border border-[#ded8cb]">
            <div className="w-2 h-5 rounded-full bg-[#2563EB]"></div>
            <div className="w-2 h-6 rounded-full bg-[#3B82F6]"></div>
            <div className="w-2 h-7 rounded-full bg-[#0284C7]"></div>
            <div className="w-2 h-5 rounded-full bg-[#0EA5E9]"></div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-base tracking-tight font-heading">
                SIR MV <span className="text-blue-600">PU COLLEGE</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-[#ebe7df] text-slate-700 border border-[#ded8cb]">
                CAMPUS ERP
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-semibold">
              {currentBranch?.name || 'Davangere Main Campus'}
            </div>
          </div>
        </div>

        {/* Center: Campus Selector */}
        <div className="relative">
          <button
            onClick={() => setShowBranchDropdown(!showBranchDropdown)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-[#ded8cb] bg-white hover:bg-[#f8f6f0] text-xs font-bold text-slate-800 shadow-2xs transition"
          >
            <Building2 className="w-4 h-4 text-slate-500" />
            <span className="font-heading font-bold text-slate-800">
              {currentBranch?.city || 'Davangere'} Campus
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#f2efe8] rounded text-slate-600 font-bold border border-[#ded8cb]">
              {currentBranch?.code}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showBranchDropdown && (
            <div className="absolute top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-[#ded8cb] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Select Campus
              </div>
              {branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    switchBranch(b.id);
                    setShowBranchDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs flex items-center justify-between hover:bg-[#fbfaf8] transition ${
                    currentBranch?.id === b.id ? 'bg-[#f4f1ea] font-bold text-slate-900' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-900">{b.name}</div>
                    <div className="text-[10px] text-slate-400">{b.city} • {b.code}</div>
                  </div>
                  {currentBranch?.id === b.id && <Check className="w-4 h-4 text-emerald-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Quick Role Switcher + User Profile */}
        <div className="flex items-center gap-3">
          {/* Quick Role Switcher Button */}
          <div className="relative">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#ded8cb] bg-white hover:bg-[#f8f6f0] text-xs font-bold text-slate-700 shadow-2xs transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Role:</span>
              <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                {user?.role}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showRoleSwitcher && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#ded8cb] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Switch Role Persona</span>
                  <span className="text-[9px] text-slate-400 font-mono">Demo@12345</span>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {demoRoles.map((r) => (
                    <button
                      key={r.email}
                      onClick={() => {
                        quickSwitchUser(r.email);
                        setShowRoleSwitcher(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs flex items-center justify-between hover:bg-[#fbfaf8] transition ${
                        user?.role === r.role ? 'bg-blue-50/50 font-bold' : ''
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900">{r.label}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{r.email}</div>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${r.color}`}>
                        {r.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Current User Pill & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#ded8cb]">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-slate-900 leading-tight">{user?.name}</div>
              <div className="text-[10px] text-slate-500 font-semibold">{user?.role}</div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

