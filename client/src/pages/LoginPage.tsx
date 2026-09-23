import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Sparkles, LogIn, AlertCircle, ShieldCheck, Building2, User, KeyRound, Play } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';

interface LoginPageProps {
  onReplayIntro?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onReplayIntro }) => {
  const { login, quickSwitchUser } = useAuth();
  const [identifier, setIdentifier] = useState('admin@sirmv.edu.in');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const institutionalRoles = [
    { email: 'admin@sirmv.edu.in', role: 'ADMIN', label: 'Administrator', desc: 'Full System & Campus Control', color: 'bg-purple-100 text-purple-900 border-purple-200' },
    { email: 'principal@sirmv.edu.in', role: 'PRINCIPAL', label: 'Principal Office', desc: 'Academic Oversight & Approvals', color: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
    { email: 'hod.physics@sirmv.edu.in', role: 'HOD', label: 'HOD Physics', desc: 'Substitutions & Faculty Schedules', color: 'bg-blue-100 text-blue-900 border-blue-200' },
    { email: 'lecturer@sirmv.edu.in', role: 'TEACHER', label: 'Faculty Lecturer', desc: 'Timetables & Academic Records', color: 'bg-amber-100 text-amber-900 border-amber-200' },
    { email: 'attender@sirmv.edu.in', role: 'FLOOR_ATTENDER', label: 'Floor Attender', desc: 'Daily Classroom Records', color: 'bg-orange-100 text-orange-900 border-orange-200' },
    { email: 'staff@sirmv.edu.in', role: 'NON_TEACHING_STAFF', label: 'Office Staff', desc: 'Institutional Administration', color: 'bg-indigo-100 text-indigo-900 border-indigo-200' },
    { email: 'warden@sirmv.edu.in', role: 'WARDEN', label: 'Hostel Warden', desc: 'Night Roll-Call & Outpasses', color: 'bg-teal-100 text-teal-900 border-teal-200' },
    { email: 'student@sirmv.edu.in', role: 'STUDENT', label: 'Student Portal', desc: '2PUC Academic Attendance', color: 'bg-cyan-100 text-cyan-900 border-cyan-200' },
    { email: 'parent@sirmv.edu.in', role: 'PARENT', label: 'Parent Portal', desc: 'Guardian Progress & Reports', color: 'bg-pink-100 text-pink-900 border-pink-200' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(identifier, password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Use testing password 123456.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRole = async (roleEmail: string) => {
    setIdentifier(roleEmail);
    setPassword('123456');
    setError(null);
    setLoading(true);
    try {
      await quickSwitchUser(roleEmail);
    } catch (err: any) {
      setError(err.message || 'Could not sign in with this role account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Subtle Accent Radiance */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-blue-600/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        
        {/* Main Card Container */}
        <div className="bg-white rounded-3xl shadow-xl border border-[#ded8cb] overflow-hidden">
          
          {/* Institution Header */}
          <div className="bg-gradient-to-b from-[#fbf9f4] to-white p-6 sm:p-8 border-b border-[#ded8cb] text-center">
            
            {/* Crest Emblem */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-900 to-blue-900 mx-auto flex items-center justify-center p-3 shadow-md ring-4 ring-amber-400/20 mb-3">
              <Building2 className="w-8 h-8 text-amber-400" />
            </div>

            <div className="inline-block px-3 py-0.5 rounded-full bg-[#f2efe8] border border-[#ded8cb] text-[11px] font-bold text-slate-700 tracking-wider uppercase mb-1">
              Shivamogga PU Campus
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-heading">
              SIR MV PU COLLEGE
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Institutional ERP & Academic Management Portal
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Standard Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Institutional Email or Username
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. admin@sirmv.edu.in"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Password
                  </label>
                  <span className="text-[11px] font-mono text-blue-700 font-bold">
                    Test Password: 123456
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Authenticating...' : 'Sign In to Campus ERP'}</span>
              </button>
            </form>

            {/* 1-Click Role Testing Badges */}
            <div className="pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                  Instant Testing Accounts (1-Click Fill)
                </span>
                <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                  Pass: 123456
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {institutionalRoles.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleQuickRole(acc.email)}
                    disabled={loading}
                    className="p-2.5 text-left rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${acc.color}`}>
                        {acc.role}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate">
                      {acc.label}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {acc.email}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Replay Sir MV Intro Animation */}
            {onReplayIntro && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={onReplayIntro}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
                >
                  <Play className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Replay Sir MV Brain Opening Intro</span>
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Footer info */}
        <p className="mt-4 text-center text-xs text-slate-400 font-medium">
          SIR MV PU College • Shivamogga Campus • Academic Session 2026-27
        </p>
      </div>
    </div>
  );
};
