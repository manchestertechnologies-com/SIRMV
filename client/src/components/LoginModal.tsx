import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Sparkles, LogIn, AlertCircle } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { login, quickSwitchUser } = useAuth();
  const [identifier, setIdentifier] = useState('admin.demo@college.test');
  const [password, setPassword] = useState('Demo@12345');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    { email: 'admin.demo@college.test', role: 'ADMIN', label: 'Admin', color: 'bg-purple-100 text-purple-800' },
    { email: 'principal.demo@college.test', role: 'PRINCIPAL', label: 'Principal', color: 'bg-emerald-100 text-emerald-800' },
    { email: 'hod.demo@college.test', role: 'HOD', label: 'HOD Physics', color: 'bg-blue-100 text-blue-800' },
    { email: 'teacher.demo@college.test', role: 'TEACHER', label: 'Teacher', color: 'bg-amber-100 text-amber-800' },
    { email: 'floor.demo@college.test', role: 'FLOOR_ATTENDER', label: 'Floor Attender', color: 'bg-orange-100 text-orange-800' },
    { email: 'staff.demo@college.test', role: 'NON_TEACHING_STAFF', label: 'Non-Teaching', color: 'bg-indigo-100 text-indigo-800' },
    { email: 'warden.demo@college.test', role: 'WARDEN', label: 'Hostel Warden', color: 'bg-teal-100 text-teal-800' },
    { email: 'headwarden.demo@college.test', role: 'HEAD_WARDEN', label: 'Head Warden', color: 'bg-emerald-100 text-emerald-900' },
    { email: 'student.demo@college.test', role: 'STUDENT', label: 'Student', color: 'bg-cyan-100 text-cyan-800' },
    { email: 'parent.demo@college.test', role: 'PARENT', label: 'Parent', color: 'bg-pink-100 text-pink-800' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(identifier, password);
    } catch (err: any) {
      setError(err.message || 'Invalid login credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (email: string) => {
    setError(null);
    setLoading(true);
    try {
      await quickSwitchUser(email);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with demo account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#ded8cb] w-full max-w-lg overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-b from-[#f8f6f0] to-white p-6 border-b border-[#ded8cb] text-center">
          <div className="inline-flex items-center gap-1.5 bg-[#f2efe8] px-3 py-1 rounded-full border border-[#ded8cb] mb-3">
            <div className="w-2 h-4 rounded-full bg-[#2563EB]"></div>
            <div className="w-2 h-5 rounded-full bg-[#3B82F6]"></div>
            <div className="w-2 h-6 rounded-full bg-[#0284C7]"></div>
            <div className="w-2 h-4 rounded-full bg-[#0EA5E9]"></div>
            <span className="text-[11px] font-bold text-slate-700 ml-1">SIR MV PU COLLEGE</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 font-heading">Sign In to Campus ERP</h2>
          <p className="text-xs text-slate-500 mt-1">Enter your institutional credentials or choose a demo persona below</p>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email or Username</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. admin.demo@college.test"
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </form>

          {/* Quick Demo Personas */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Instant Demo Personas (1-Click)
              </span>
              <span className="text-[10px] font-mono text-slate-400">Demo@12345</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => handleQuickLogin(account.email)}
                  disabled={loading}
                  className="p-2 text-left rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition flex items-center justify-between group"
                >
                  <div className="truncate mr-2">
                    <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate">{account.label}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{account.email.split('@')[0]}</div>
                  </div>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${account.color}`}>
                    {account.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
