import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  IconStaffs,
  IconStudents,
  IconClasses,
  IconBatches,
  IconTests,
  IconBoardMarks,
  IconQuestions,
  IconReports,
  IconAttendance,
  IconFee,
  IconTimetable,
  IconLiveClass,
  IconSms,
  IconNoticeboard,
  IconCounsellings,
  IconHostel,
  IconGatePass,
  IconAdmission,
  IconLeaderboard,
  IconSettings,
  IconReportCard,
  IconSubstitution,
  IconFloorAttender,
  IconLectureDossier,
  IconMissedClass,
  IconEveningStudy,
  IconAuditLogs
} from '../components/ModuleIcons';
import { Search, Sparkles, Building2, ChevronRight, Users, Award, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';

interface DashboardHomeProps {
  onNavigateTab: (tab: string) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ onNavigateTab }) => {
  const { user, currentBranch } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalInfo, setActiveModalInfo] = useState<string | null>(null);

  // Main 20 Tiles matching exact Tardigrade grid
  const mainTardigradeTiles = [
    { id: 'staffs', name: 'Staffs', icon: IconStaffs, targetTab: 'teacher-portal', badge: 'Active Faculty' },
    { id: 'students', name: 'Students', icon: IconStudents, targetTab: 'class-attendance', badge: 'Enrolled' },
    { id: 'classes', name: 'Classes', icon: IconClasses, targetTab: 'floor-attender', badge: '1 & 2 PUC' },
    { id: 'batches', name: 'Batches', icon: IconBatches, targetTab: 'teacher-portal', badge: 'NEET / JEE' },
    { id: 'tests', name: 'Tests', icon: IconTests, targetTab: 'report-cards', badge: 'Unit & Midterm' },
    { id: 'board-marks', name: 'Board Marks', icon: IconBoardMarks, targetTab: 'report-cards', badge: 'Marks Ledger' },
    { id: 'questions', name: 'Questions', icon: IconQuestions, targetTab: 'report-cards', badge: 'MCQ Bank' },
    { id: 'reports', name: 'Reports', icon: IconReports, targetTab: 'report-cards', badge: 'Analytics' },
    { id: 'attendance', name: 'Attendance', icon: IconAttendance, targetTab: 'class-attendance', badge: 'Realtime CV' },
    { id: 'fee', name: 'Fee', icon: IconFee, targetTab: 'dashboard-home', badge: 'Accounts' },
    { id: 'timetable', name: 'Timetable', icon: IconTimetable, targetTab: 'teacher-portal', badge: 'Weekly Grid' },
    { id: 'live-class', name: 'Live Class', icon: IconLiveClass, targetTab: 'missed-recordings', badge: 'Lecture Feeds' },
    { id: 'sms', name: 'Sms', icon: IconSms, targetTab: 'outpass-system', badge: 'Parent OTP' },
    { id: 'noticeboard', name: 'Noticeboard', icon: IconNoticeboard, targetTab: 'dashboard-home', badge: 'Circulars' },
    { id: 'counsellings', name: 'Counsellings', icon: IconCounsellings, targetTab: 'evening-study', badge: 'Mentorship' },
    { id: 'hostel', name: 'Hostel', icon: IconHostel, targetTab: 'hostel-attendance', badge: 'Night Roll Call' },
    { id: 'gate-pass', name: 'Gate Pass', icon: IconGatePass, targetTab: 'outpass-system', badge: 'Secure OTP' },
    { id: 'admission', name: 'Admission', icon: IconAdmission, targetTab: 'dashboard-home', badge: 'Admissions 2026' },
    { id: 'leaderboard', name: 'Leaderboard', icon: IconLeaderboard, targetTab: 'report-cards', badge: 'Rankings' },
    { id: 'settings', name: 'Settings', icon: IconSettings, targetTab: 'dashboard-home', badge: 'Config' },
  ];

  // Other Tools / Specialized College Operations
  const otherToolsTiles = [
    { id: 'report-cards', name: 'Report Card', icon: IconReportCard, targetTab: 'report-cards', badge: 'A4 Printable' },
    { id: 'substitution-center', name: 'Substitution Radar', icon: IconSubstitution, targetTab: 'substitution-center', badge: 'Proxy Faculty' },
    { id: 'floor-attender', name: 'Floor Attender Ops', icon: IconFloorAttender, targetTab: 'floor-attender', badge: 'Floors 1-3' },
    { id: 'lecture-records', name: '1-Page Lecture Record', icon: IconLectureDossier, targetTab: 'lecture-records', badge: 'Consolidated' },
    { id: 'missed-recordings', name: 'Missed Class Videos', icon: IconMissedClass, targetTab: 'missed-recordings', badge: 'Absent Portal' },
    { id: 'evening-study', name: 'Evening Study Hall', icon: IconEveningStudy, targetTab: 'evening-study', badge: '6:30 - 9:00 PM' },
    { id: 'audit-logs', name: 'Security Audit Logs', icon: IconAuditLogs, targetTab: 'audit-logs', badge: 'Immutable' },
  ];

  const filteredMain = mainTardigradeTiles.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOther = otherToolsTiles.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTileClick = (tile: any) => {
    if (tile.targetTab && tile.targetTab !== 'dashboard-home') {
      onNavigateTab(tile.targetTab);
    } else {
      setActiveModalInfo(tile.name);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-2">
      {/* Top Banner with Search & Branch Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#ded8cb]/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight font-heading">
              SIR MV PU COLLEGE
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {currentBranch?.name || 'Davangere Campus'}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Integrated Academic, Safety, Attendance, Hostel & Examination Platform.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search modules & tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#ded8cb] rounded-2xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs font-medium"
          />
        </div>
      </div>

      {/* Main 4-Column Tardigrade Grid */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredMain.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.id}
                onClick={() => handleTileClick(tile)}
                className="group relative bg-[#fdfcf9] hover:bg-white border border-[#ded8cb] rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-center text-center shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-1 active:translate-y-0 min-h-[140px]"
              >
                {/* Micro Badge */}
                {tile.badge && (
                  <span className="absolute top-3 right-3 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#f2efe8] text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-700 transition">
                    {tile.badge}
                  </span>
                )}

                {/* Illustrated Centered Icon */}
                <div className="shrink-0 mb-3 group-hover:scale-110 transition-transform duration-200">
                  <Icon className="w-12 h-12 sm:w-14 sm:h-14" />
                </div>

                {/* Module Title */}
                <span className="text-sm font-bold text-slate-800 tracking-tight font-heading group-hover:text-blue-600 transition">
                  {tile.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Other Tools Section matching Tardigrade layout */}
      <div className="space-y-4 pt-4 border-t border-[#ded8cb]/80">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider font-heading">
            Other Tools
          </h2>
          <span className="text-[10px] text-slate-500 font-semibold bg-[#eae5db] px-2 py-0.5 rounded-full">
            Specialized PU Workflows
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredOther.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.id}
                onClick={() => handleTileClick(tile)}
                className="group relative bg-[#fdfcf9] hover:bg-white border border-[#ded8cb] rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-center text-center shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-1 active:translate-y-0 min-h-[140px]"
              >
                {/* Badge */}
                {tile.badge && (
                  <span className="absolute top-3 right-3 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#f2efe8] text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition">
                    {tile.badge}
                  </span>
                )}

                {/* Illustrated Icon */}
                <div className="shrink-0 mb-3 group-hover:scale-110 transition-transform duration-200">
                  <Icon className="w-12 h-12 sm:w-14 sm:h-14" />
                </div>

                {/* Title */}
                <span className="text-sm font-bold text-slate-800 tracking-tight font-heading group-hover:text-indigo-600 transition">
                  {tile.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generic Modal for Secondary Info tiles */}
      {activeModalInfo && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#ded8cb] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-slate-900 text-base">{activeModalInfo} Module</h3>
              </div>
              <button
                onClick={() => setActiveModalInfo(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {activeModalInfo} records are fully integrated with <strong>SIR MV PU College ({currentBranch?.name})</strong> database.
              Use the top-left navigation or dedicated action bars to manage operational items.
            </p>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveModalInfo(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
