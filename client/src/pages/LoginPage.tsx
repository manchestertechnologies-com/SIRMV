import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, LogIn, AlertCircle, Eye, EyeOff, Shield } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('admin@sirmv.edu.in');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(identifier, password);
    } catch (err: any) {
      setError(err.message || 'Invalid institutional credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f2eb] flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Top Header spacer */}
      <div />

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-[#ded8cb] overflow-hidden">
          
          {/* Official Institution Brand Header */}
          <div className="bg-gradient-to-b from-[#faf8f3] to-white p-8 border-b border-[#eae4d5] text-center">
            <div className="flex justify-center mb-4">
              <div className="p-2.5 bg-white rounded-2xl shadow-xs border border-[#ded8cb]">
                <img
                  src="/logo.png"
                  alt="SIR MV PU College Logo"
                  className="w-16 h-16 object-contain"
                />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ede8dc] text-[11px] font-bold text-slate-700 tracking-wider uppercase mb-2 border border-[#ded8cb]">
              <Shield className="w-3 h-3 text-blue-700" />
              <span>Shivamogga Campus</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-heading">
              SIR MV PU COLLEGE
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Integrated Campus ERP & Academic Management System
            </p>
          </div>

          {/* Form Content */}
          <div className="p-7 sm:p-8 space-y-5">
            
            {/* Error Notification */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Institutional Email / Username */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Institutional Email / User ID
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. admin@sirmv.edu.in"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Password
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">
                    Default: <strong className="text-blue-700 font-bold">123456</strong>
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-600 font-medium">Remember on this device</span>
                </label>
                <span className="text-xs text-slate-400 font-medium hover:text-blue-600 cursor-pointer">
                  Help / Support
                </span>
              </div>

              {/* Sign In Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition duration-150 flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-60 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Authenticating...' : 'Sign In to Campus ERP'}</span>
              </button>
            </form>

            {/* Discreet Role Quick-Selector for Testing */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Institutional Role Presets
              </label>
              <select
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setPassword('123456');
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition cursor-pointer"
              >
                <option value="admin@sirmv.edu.in">Administrator (admin@sirmv.edu.in)</option>
                <option value="principal@sirmv.edu.in">Principal Office (principal@sirmv.edu.in)</option>
                <option value="hod.physics@sirmv.edu.in">HOD Physics (hod.physics@sirmv.edu.in)</option>
                <option value="lecturer@sirmv.edu.in">Teaching Faculty (lecturer@sirmv.edu.in)</option>
                <option value="attender@sirmv.edu.in">Floor Attender (attender@sirmv.edu.in)</option>
                <option value="staff@sirmv.edu.in">Office Staff (staff@sirmv.edu.in)</option>
                <option value="warden@sirmv.edu.in">Hostel Warden (warden@sirmv.edu.in)</option>
                <option value="student@sirmv.edu.in">Student Account (student@sirmv.edu.in)</option>
                <option value="parent@sirmv.edu.in">Parent Portal (parent@sirmv.edu.in)</option>
              </select>
            </div>

          </div>
        </div>
      </div>

      {/* Institutional Footer */}
      <footer className="w-full text-center mt-6">
        <p className="text-xs text-slate-500 font-medium">
          © 2026-2027 SIR MV PU College, Shivamogga Campus. All rights reserved.
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          Secured Institutional ERP • Authorized Access Only
        </p>
      </footer>

    </div>
  );
};

export default LoginPage;
