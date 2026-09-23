import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  ChevronDown,
  LogOut,
  Sparkles,
  Check,
  UserCheck,
  GraduationCap
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, currentBranch, quickSwitchUser, logout } = useAuth();
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  const institutionalRoles = [
    { email: 'admin@sirmv.edu.in', label: 'Administrator', role: 'ADMIN', color: 'bg-purple-100 text-purple-900' },
    { email: 'principal@sirmv.edu.in', label: 'College Principal', role: 'PRINCIPAL', color: 'bg-emerald-100 text-emerald-900' },
    { email: 'hod.physics@sirmv.edu.in', label: 'HOD Physics', role: 'HOD', color: 'bg-blue-100 text-blue-900' },
    { email: 'lecturer@sirmv.edu.in', label: 'Teaching Faculty', role: 'TEACHER', color: 'bg-amber-100 text-amber-900' },
    { email: 'attender@sirmv.edu.in', label: 'Floor Operations', role: 'FLOOR_ATTENDER', color: 'bg-orange-100 text-orange-900' },
    { email: 'staff@sirmv.edu.in', label: 'Administrative Staff', role: 'NON_TEACHING_STAFF', color: 'bg-indigo-100 text-indigo-900' },
    { email: 'warden@sirmv.edu.in', label: 'Hostel Warden', role: 'WARDEN', color: 'bg-teal-100 text-teal-900' },
    { email: 'headwarden@sirmv.edu.in', label: 'Chief Warden', role: 'HEAD_WARDEN', color: 'bg-emerald-100 text-emerald-900' },
    { email: 'student@sirmv.edu.in', label: 'Student Account', role: 'STUDENT', color: 'bg-cyan-100 text-cyan-900' },
    { email: 'parent@sirmv.edu.in', label: 'Parent Portal', role: 'PARENT', color: 'bg-pink-100 text-pink-900' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#fdfcf9] border-b border-[#ded8cb] shadow-2xs">
      <div className="px-4 sm:px-6 flex items-center justify-between h-16">
        
        {/* Left: Brand & Campus Identification */}
        <div className="flex items-center gap-3">
          {/* Official Institution Logo */}
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1 shadow-2xs shrink-0 border border-[#ded8cb]">
            <img
              src="/logo.png"
              alt="SIR MV Logo"
              className="w-8 h-8 object-contain"
            />
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
            <div className="text-[11px] text-blue-700 font-bold flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-400" />
              <span>Shivamogga PU Campus</span>
            </div>
          </div>
        </div>

        {/* Right: Active Role Badge + 1-Click Role Switcher + Logout */}
        <div className="flex items-center gap-3">
          
          {/* Active User Role Badge & Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#ded8cb] bg-white hover:bg-slate-50 transition shadow-2xs"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-700 text-xs">
                {user?.role?.[0] || 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-800 leading-tight">
                  {user?.name || 'Administrator'}
                </div>
                <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                  {user?.role || 'ADMIN'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {/* Dropdown Menu */}
            {showRoleSwitcher && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-[#ded8cb] py-2 z-50 overflow-hidden">
                <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Switch Role Persona
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Pass: 123456</span>
                </div>

                <div className="max-h-80 overflow-y-auto py-1">
                  {institutionalRoles.map((roleItem) => {
                    const isCurrent = user?.role === roleItem.role;
                    return (
                      <button
                        key={roleItem.role}
                        onClick={() => {
                          quickSwitchUser(roleItem.email);
                          setShowRoleSwitcher(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between transition ${
                          isCurrent ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span>{roleItem.label}</span>
                            {isCurrent && <Check className="w-3.5 h-3.5 text-blue-600" />}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {roleItem.email}
                          </div>
                        </div>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${roleItem.color}`}>
                          {roleItem.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="p-2 rounded-xl border border-[#ded8cb] bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-700 transition shadow-2xs"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
