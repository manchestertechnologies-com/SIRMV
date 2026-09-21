import React from 'react';
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
  IconReportCard
} from './ModuleIcons';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: IconDashboard, targetTab: 'dashboard-home' },
    { id: 'staffs', label: 'Staffs', icon: IconStaffs, targetTab: 'staffs' },
    { id: 'students', label: 'Students', icon: IconStudents, targetTab: 'students' },
    { id: 'classes', label: 'Classes', icon: IconClasses, targetTab: 'classes' },
    { id: 'batches', label: 'Batches', icon: IconBatches, targetTab: 'batches' },
    { id: 'tests', label: 'Tests', icon: IconTests, targetTab: 'tests' },
    { id: 'board-marks', label: 'Board Marks', icon: IconBoardMarks, targetTab: 'board-marks' },
    { id: 'questions', label: 'Questions', icon: IconQuestions, targetTab: 'questions' },
    { id: 'reports', label: 'Reports', icon: IconReports, targetTab: 'reports' },
    { id: 'attendance', label: 'Attendance', icon: IconAttendance, targetTab: 'attendance' },
    { id: 'fee', label: 'Fee', icon: IconFee, targetTab: 'fee' },
    { id: 'timetable', label: 'Timetable', icon: IconTimetable, targetTab: 'timetable' },
    { id: 'live-class', label: 'Live Class', icon: IconLiveClass, targetTab: 'live-class' },
    { id: 'sms', label: 'Sms', icon: IconSms, targetTab: 'sms' },
    { id: 'noticeboard', label: 'Noticeboard', icon: IconNoticeboard, targetTab: 'noticeboard' },
    { id: 'counsellings', label: 'Counsellings', icon: IconCounsellings, targetTab: 'counsellings' },
    { id: 'hostel', label: 'Hostel', icon: IconHostel, targetTab: 'hostel' },
    { id: 'gate-pass', label: 'Gate Pass', icon: IconGatePass, targetTab: 'gate-pass' },
    { id: 'admission', label: 'Admission', icon: IconAdmission, targetTab: 'admission' },
    { id: 'leaderboard', label: 'Leaderboard', icon: IconLeaderboard, targetTab: 'leaderboard' },
    { id: 'settings', label: 'Settings', icon: IconSettings, targetTab: 'settings' },
  ];

  const otherTools = [
    { id: 'report-card', label: 'Report Card', icon: IconReportCard, targetTab: 'report-card' },
  ];

  return (
    <aside className="w-56 shrink-0 bg-[#ebe7de] border-r border-[#ded9cf] min-h-screen flex flex-col select-none">
      {/* Top Brand / Official Logo */}
      <div className="p-3.5 flex items-center gap-3 border-b border-[#ded9cf]/60">
        <img
          src="/logo.png"
          alt="SIR MV Logo"
          className="w-11 h-11 object-contain drop-shadow-xs shrink-0"
        />
        <div className="min-w-0">
          <div className="font-extrabold text-slate-900 text-[15px] tracking-tight font-heading leading-tight truncate">
            SIR MV
          </div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">
            PU COLLEGE
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="py-2 px-2 flex-1 overflow-y-auto space-y-0.5 custom-scrollbar">
        <nav className="space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.targetTab ||
              (item.id === 'dashboard' && activeTab === 'dashboard-home');

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.targetTab)}
                className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] transition-all duration-100 ${
                  isActive
                    ? 'bg-[#dfdbd2] text-slate-900 font-semibold'
                    : 'text-slate-700 hover:bg-[#e4dfd6] hover:text-slate-900'
                }`}
              >
                <div className="shrink-0 flex items-center justify-center">
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Other Tools Section */}
        <div className="pt-3 mt-2 border-t border-[#ded9cf]">
          <div className="px-3 pb-1 text-[11px] font-bold text-slate-500">
            Other Tools
          </div>
          <nav className="space-y-0.5">
            {otherTools.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.targetTab;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.targetTab)}
                  className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] transition-all duration-100 ${
                    isActive
                      ? 'bg-[#dfdbd2] text-slate-900 font-semibold'
                      : 'text-slate-700 hover:bg-[#e4dfd6] hover:text-slate-900'
                  }`}
                >
                  <div className="shrink-0 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
};
