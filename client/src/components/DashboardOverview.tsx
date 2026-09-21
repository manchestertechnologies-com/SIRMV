import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Clock,
  Sparkles,
  Users,
  ShieldAlert,
  Layers,
  FileCheck2,
  Calendar,
  Building2,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  BellRing,
  Activity,
  UserCheck
} from 'lucide-react';

interface DashboardOverviewProps {
  onNavigateTab: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigateTab }) => {
  const { user, currentBranch } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const dateString = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 sm:p-8 text-white mb-8">
      {/* Background Mesh Lighting & Grid Accents */}
      <div className="absolute -right-20 -top-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute right-1/3 -bottom-20 w-80 h-80 bg-sky-500/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute left-10 -bottom-10 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 space-y-6">
        {/* Top Bar: Campus Badge + Live Period Countdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-live-dot"></div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-300 font-mono">
                  {currentBranch?.code || 'SIRMV-DVG'} • LIVE OPERATIONAL TERMINAL
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  SYSTEM ONLINE
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-300">
                {currentBranch?.name || 'SIR MV PU College, Davangere'} • Principal: {currentBranch?.principal_name}
              </p>
            </div>
          </div>

          {/* Live Clock HUD */}
          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 self-start sm:self-auto">
            <Clock className="w-5 h-5 text-sky-400 shrink-0" />
            <div>
              <div className="font-mono font-extrabold text-base tracking-wider text-white">
                {timeString}
              </div>
              <div className="text-[10px] text-slate-400">{dateString}</div>
            </div>
          </div>
        </div>

        {/* Hero Welcome & Role Mission */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-heading">
                Welcome back, {user?.name?.split(' ')[0] || 'Faculty'}
              </h2>
              <span className="text-xs font-bold px-3 py-1 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-sm shadow-indigo-500/30">
                {user?.role}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time synchronization active across classrooms, floor supervisors, security gate, hostel residences, and examination assessment cells.
            </p>
          </div>

          {/* Quick Action Buttons Grid */}
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              onClick={() => onNavigateTab('floor-attender')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition hover:scale-105 active:scale-95"
            >
              <Layers className="w-4 h-4" />
              Floor Operations
            </button>

            <button
              onClick={() => onNavigateTab('outpass-system')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-600/30 transition hover:scale-105 active:scale-95"
            >
              <ShieldAlert className="w-4 h-4" />
              Security Gate
            </button>

            <button
              onClick={() => onNavigateTab('report-cards')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 backdrop-blur-md transition hover:scale-105 active:scale-95"
            >
              <FileCheck2 className="w-4 h-4" />
              Report Cards
            </button>
          </div>
        </div>

        {/* Live Operational Metric Telemetry */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
          <div
            onClick={() => onNavigateTab('teacher-portal')}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-indigo-300 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Faculty Schedule</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
            </div>
            <div className="text-xl font-extrabold text-white font-mono">6 Periods</div>
            <div className="text-[10px] text-slate-400 mt-0.5">NEET & JEE Batches active</div>
          </div>

          <div
            onClick={() => onNavigateTab('substitution-center')}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-amber-300 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Proxy Sub Center</span>
              <BellRing className="w-3.5 h-3.5 group-hover:rotate-12 transition" />
            </div>
            <div className="text-xl font-extrabold text-amber-400 font-mono">1 Duty Active</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Automated conflict check</div>
          </div>

          <div
            onClick={() => onNavigateTab('class-attendance')}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-emerald-300 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Student Attendance</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-emerald-400 font-mono">94.8% Present</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Manual + Photo Assisted</div>
          </div>

          <div
            onClick={() => onNavigateTab('outpass-system')}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-sky-300 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Gate Clearance</span>
              <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-xl font-extrabold text-sky-400 font-mono">1 Outpass Out</div>
            <div className="text-[10px] text-slate-400 mt-0.5">OTP + Principal Signed</div>
          </div>
        </div>
      </div>
    </div>
  );
};
