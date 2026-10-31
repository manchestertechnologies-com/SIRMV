import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Lock, Mail, LogIn, AlertCircle, Eye, EyeOff, Shield, GraduationCap, CalendarCheck2,
  BedDouble, FileBarChart2, Sparkles
} from 'lucide-react';

const FEATURES = [
  { icon: CalendarCheck2, title: 'Smart Attendance', text: 'Lecture, hostel & exam duty tracking' },
  { icon: GraduationCap, title: 'Exams & Marks', text: '3D seating, QR invigilation, report cards' },
  { icon: BedDouble, title: 'Hostel & Outpass', text: 'Rooms, roll-calls and gate control' },
  { icon: FileBarChart2, title: 'Live Reports', text: 'Insights for every role, in real time' }
];

const PRESETS = [
  { id: 'admin.demo@college.test', label: 'Administrator' },
  { id: 'principal.demo@college.test', label: 'Principal' },
  { id: 'hod.demo@college.test', label: 'HOD' },
  { id: 'teacher.demo@college.test', label: 'Faculty' },
  { id: 'floor.demo@college.test', label: 'Floor Attender' },
  { id: 'staff.demo@college.test', label: 'Office Staff' },
  { id: 'warden.demo@college.test', label: 'Warden' },
  { id: 'student.demo@college.test', label: 'Student' },
  { id: 'parent.demo@college.test', label: 'Parent' }
];

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
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr] font-sans selection:bg-[#e81f25] selection:text-white">

      {/* ------------------------- Brand panel ------------------------- */}
      <aside className="mt-login-bg hidden lg:flex flex-col justify-between p-12 text-white">
        <div className="mt-blob mt-blob-a" />
        <div className="mt-blob mt-blob-b" />
        <div className="mt-blob mt-blob-c" />
        <div className="mt-grid-lines" />
        <div className="mt-ring w-[520px] h-[520px] -right-40 top-24" />
        <div className="mt-ring w-[320px] h-[320px] left-10 bottom-10" style={{ animationDirection: 'reverse' }} />

        <div className="relative z-10 mt-slide flex items-center gap-3" style={{ ['--i' as any]: 0 }}>
          <img
            src="/logo.png"
            alt="Manchester Technologies Logo"
            className="w-14 h-14 rounded-2xl object-contain bg-white p-1 ring-1 ring-[#c28535]/70 shadow-xl shadow-black/50"
          />
          <div>
            <div className="font-heading font-black tracking-tight text-lg leading-none">MANCHESTER TECHNOLOGIES</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#e6c28f] mt-1">Davangere Campus</div>
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <div
            className="mt-reveal inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold tracking-wider uppercase text-[#e6c28f]"
            style={{ ['--i' as any]: 1 }}
          >
            <Sparkles className="w-3 h-3" /> Integrated Campus ERP
          </div>
          <h1
            className="mt-reveal font-heading font-black text-5xl xl:text-6xl leading-[1.05] tracking-tight mt-5"
            style={{ ['--i' as any]: 2 }}
          >
            Innovate.<br />
            Develop.<br />
            <span className="text-[#e6c28f]">Dominate.</span>
          </h1>
          <p className="mt-reveal text-white/65 text-sm mt-5 max-w-md leading-relaxed" style={{ ['--i' as any]: 3 }}>
            One secure workspace for academics, exams, hostel and administration &mdash; built for every role on campus.
          </p>

          <div className="grid grid-cols-2 gap-3 mt-9">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="mt-glass mt-pop rounded-2xl p-4" style={{ ['--i' as any]: i + 4 }}>
                  <div className="w-9 h-9 rounded-xl bg-[#d9a85a] flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-[#4a0709]" />
                  </div>
                  <div className="font-heading font-bold text-sm mt-3">{f.title}</div>
                  <div className="text-[11px] text-white/60 mt-0.5 leading-snug">{f.text}</div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="relative z-10 text-[11px] text-white/45">
          &copy; 2026-2027 Manchester Technologies, Davangere Campus. All rights reserved.
        </p>
      </aside>

      {/* -------------------------- Form panel -------------------------- */}
      <main data-static className="relative flex flex-col justify-start lg:justify-center items-center px-4 sm:px-8 pt-10 pb-10 min-h-screen lg:min-h-0 bg-white">
        {/* Mobile-only brand backdrop */}
        <div className="lg:hidden mt-login-bg inset-x-0 top-0 h-60 rounded-b-[2rem]" style={{ position: 'absolute' }}>
          <div className="mt-blob mt-blob-a" />
          <div className="mt-blob mt-blob-b" />
        </div>

        <div className="relative w-full max-w-md">
          <div className="lg:hidden mt-reveal flex flex-col items-center text-white mb-6" style={{ ['--i' as any]: 0 }}>
            <img
              src="/logo.png"
              alt="Manchester Technologies Logo"
              className="w-16 h-16 rounded-2xl object-contain bg-white p-1 ring-1 ring-[#c28535]/70 shadow-xl shadow-black/50"
            />
            <div className="font-heading font-black tracking-tight mt-3 text-lg">MANCHESTER TECHNOLOGIES</div>
          </div>

          <div className="mt-pop bg-white rounded-3xl border border-slate-200 shadow-xl shadow-[#4a0709]/10 overflow-hidden" style={{ ['--i' as any]: 1 }}>
            <div className="h-1 bg-[#c28535]" />

            <div className="p-7 sm:p-9 space-y-6">
              <div className="mt-reveal" style={{ ['--i' as any]: 2 }}>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fdf0f0] text-[11px] font-bold text-[#b3191f] tracking-wider uppercase border border-[#f1cfd1]">
                  <Shield className="w-3 h-3" />
                  <span>Davangere Campus</span>
                </div>
                <h2 className="font-heading font-black text-2xl text-[#4a0709] tracking-tight mt-3">Welcome Back!</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Sign in to your Campus ERP workspace
                </p>
              </div>

              {error && (
                <div className="mt-pop p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="mt-reveal" style={{ ['--i' as any]: 3 }}>
                  <div className="mt-field">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-4 z-10" />
                    <input
                      id="identifier"
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder=" "
                      className="w-full pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white"
                    />
                    <label htmlFor="identifier">Institutional Email / User ID</label>
                    <span className="mt-underline" />
                  </div>
                </div>

                <div className="mt-reveal" style={{ ['--i' as any]: 4 }}>
                  <div className="mt-field">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-4 z-10" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder=" "
                      className="w-full pl-10 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white"
                    />
                    <label htmlFor="password">Password</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-[#b3191f] transition z-10"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <span className="mt-underline" />
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-1.5 text-right">
                    Default: <strong className="text-[#b3191f] font-bold">123456</strong>
                  </div>
                </div>

                <div className="mt-reveal flex items-center justify-between" style={{ ['--i' as any]: 5 }}>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-xs text-slate-600 font-medium">Remember on this device</span>
                  </label>
                  <span className="text-xs text-slate-400 font-medium hover:text-[#b3191f] cursor-pointer transition">
                    Help / Support
                  </span>
                </div>

                <div className="mt-reveal" style={{ ['--i' as any]: 6 }}>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 mt-fill-btn bg-[#d9a85a] text-[#4a0709] rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{loading ? 'Authenticating...' : 'Sign In to Campus ERP'}</span>
                  </button>
                </div>
              </form>

              <div className="pt-5 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Quick Role Presets
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESETS.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      data-active={identifier === p.id}
                      onClick={() => {
                        setIdentifier(p.id);
                        setPassword('Demo@12345');
                      }}
                      className="mt-preset mt-pop px-2 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 cursor-pointer"
                      style={{ ['--i' as any]: i + 7 }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  Password for every preset: <span className="font-mono font-semibold text-slate-500">Demo@12345</span>
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-5 lg:hidden">
            &copy; 2026-2027 Manchester Technologies, Davangere Campus.
          </p>
          <p className="text-center text-[11px] text-slate-400 mt-5 hidden lg:block">
            Secured Institutional ERP &bull; Authorized Access Only
          </p>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
