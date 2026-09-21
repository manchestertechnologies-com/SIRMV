import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  IconDashboard,
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
} from './ModuleIcons';
import { LogOut, Sparkles, GraduationCap } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();

  // Core Tardigrade Navigation Modules
  const mainMenuItems = [
    { id: 'dashboard-home', label: 'Dashboard', icon: IconDashboard, targetTab: 'dashboard-home' },
    { id: 'staffs', label: 'Staffs', icon: IconStaffs, targetTab: 'teacher-portal' },
    { id: 'students', label: 'Students', icon: IconStudents, targetTab: 'class-attendance' },
    { id: 'classes', label: 'Classes', icon: IconClasses, targetTab: 'floor-attender' },
    { id: 'batches', label: 'Batches', icon: IconBatches, targetTab: 'teacher-portal' },
    { id: 'tests', label: 'Tests', icon: IconTests, targetTab: 'report-cards' },
    { id: 'board-marks', label: 'Board Marks', icon: IconBoardMarks, targetTab: 'report-cards' },
    { id: 'questions', label: 'Questions', icon: IconQuestions, targetTab: 'report-cards' },
    { id: 'reports', label: 'Reports', icon: IconReports, targetTab: 'report-cards' },
    { id: 'attendance', label: 'Attendance', icon: IconAttendance, targetTab: 'class-attendance' },
    { id: 'fee', label: 'Fee', icon: IconFee, targetTab: 'dashboard-home' },
    { id: 'timetable', label: 'Timetable', icon: IconTimetable, targetTab: 'teacher-portal' },
    { id: 'live-class', label: 'Live Class', icon: IconLiveClass, targetTab: 'missed-recordings' },
    { id: 'sms', label: 'Sms', icon: IconSms, targetTab: 'outpass-system' },
    { id: 'noticeboard', label: 'Noticeboard', icon: IconNoticeboard, targetTab: 'dashboard-home' },
    { id: 'counsellings', label: 'Counsellings', icon: IconCounsellings, targetTab: 'evening-study' },
    { id: 'hostel', label: 'Hostel', icon: IconHostel, targetTab: 'hostel-attendance' },
    { id: 'gate-pass', label: 'Gate Pass', icon: IconGatePass, targetTab: 'outpass-system' },
    { id: 'admission', label: 'Admission', icon: IconAdmission, targetTab: 'dashboard-home' },
    { id: 'leaderboard', label: 'Leaderboard', icon: IconLeaderboard, targetTab: 'report-cards' },
    { id: 'settings', label: 'Settings', icon: IconSettings, targetTab: 'dashboard-home' },
  ];

  // Specialized SIR MV PU College Operations
  const specializedTools = [
    { id: 'report-cards', label: 'Report Card', icon: IconReportCard, targetTab: 'report-cards' },
    { id: 'substitution-center', label: 'Substitution Radar', icon: IconSubstitution, targetTab: 'substitution-center' },
    { id: 'floor-attender', label: 'Floor Attender Ops', icon: IconFloorAttender, targetTab: 'floor-attender' },
    { id: 'lecture-records', label: '1-Page Lecture Dossier', icon: IconLectureDossier, targetTab: 'lecture-records' },
    { id: 'missed-recordings', label: 'Missed Class Videos', icon: IconMissedClass, targetTab: 'missed-recordings' },
    { id: 'evening-study', label: 'Evening Study Hall', icon: IconEveningStudy, targetTab: 'evening-study' },
    { id: 'audit-logs', label: 'Security Audit Logs', icon: IconAuditLogs, targetTab: 'audit-logs' },
  ];

  return (
    <aside className="w-60 shrink-0 bg-[#ebe7df] border-r border-[#ded8cb] min-h-[calc(100vh-4.5rem)] flex flex-col justify-between select-none">
      <div className="py-3 px-3 space-y-4 overflow-y-auto max-h-[calc(100vh-8rem)] custom-scrollbar">
        {/* Tardigrade Style Brand Header inside Sidebar */}
        <div className="px-2 py-1 flex items-center gap-2">
          {/* Tardigrade 4-pill Caterpillar Logo */}
          <div className="flex items-center gap-0.5">
            <div className="w-2.5 h-6 rounded-full bg-[#2563EB]"></div>
            <div className="w-2.5 h-7 rounded-full bg-[#3B82F6]"></div>
            <div className="w-2.5 h-8 rounded-full bg-[#0284C7]"></div>
            <div className="w-2.5 h-6 rounded-full bg-[#0EA5E9]"></div>
          </div>
          <div>
            <div className="font-extrabold text-slate-900 text-base tracking-tight font-heading leading-tight">
              tardigrade<span className="text-rose-500 font-bold text-xs ml-0.5">•</span>
            </div>
            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
              SIR MV PU COLLEGE
            </div>
          </div>
        </div>

        {/* Main Navigation List */}
        <nav className="space-y-0.5">
          {mainMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.targetTab || (item.id === 'dashboard-home' && activeTab === 'dashboard-home');

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.targetTab)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs border border-[#ded8cb]/60 font-bold'
                    : 'text-slate-700 hover:bg-[#e4dfd5] hover:text-slate-900'
                }`}
              >
                <div className="shrink-0 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Specialized Tools Group */}
        <div className="pt-2 border-t border-[#ded8cb]">
          <div className="px-3 pb-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Other Tools
          </div>
          <nav className="space-y-0.5">
            {specializedTools.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.targetTab;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.targetTab)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs border border-[#ded8cb]/60 font-bold'
                      : 'text-slate-700 hover:bg-[#e4dfd5] hover:text-slate-900'
                  }`}
                >
                  <div className="shrink-0 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User Footer badge */}
      <div className="p-3 border-t border-[#ded8cb] bg-[#e6e2da]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs shadow-xs">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-900 truncate">{user?.name}</div>
            <div className="text-[10px] font-semibold text-slate-600 truncate">{user?.role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
