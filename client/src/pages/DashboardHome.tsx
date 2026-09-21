import React from 'react';
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
  IconReportCard
} from '../components/ModuleIcons';

interface DashboardHomeProps {
  onNavigateTab: (tab: string) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ onNavigateTab }) => {
  // Exact 20 tiles in 5 rows of 4 columns matching the reference photo
  const mainTiles = [
    { id: 'staffs', name: 'Staffs', icon: IconStaffs, targetTab: 'staffs' },
    { id: 'students', name: 'Students', icon: IconStudents, targetTab: 'students' },
    { id: 'classes', name: 'Classes', icon: IconClasses, targetTab: 'classes' },
    { id: 'batches', name: 'Batches', icon: IconBatches, targetTab: 'batches' },

    { id: 'tests', name: 'Tests', icon: IconTests, targetTab: 'tests' },
    { id: 'board-marks', name: 'Board Marks', icon: IconBoardMarks, targetTab: 'board-marks' },
    { id: 'questions', name: 'Questions', icon: IconQuestions, targetTab: 'questions' },
    { id: 'reports', name: 'Reports', icon: IconReports, targetTab: 'reports' },

    { id: 'attendance', name: 'Attendance', icon: IconAttendance, targetTab: 'attendance' },
    { id: 'fee', name: 'Fee', icon: IconFee, targetTab: 'fee' },
    { id: 'timetable', name: 'Timetable', icon: IconTimetable, targetTab: 'timetable' },
    { id: 'live-class', name: 'Live Class', icon: IconLiveClass, targetTab: 'live-class' },

    { id: 'sms', name: 'Sms', icon: IconSms, targetTab: 'sms' },
    { id: 'noticeboard', name: 'Noticeboard', icon: IconNoticeboard, targetTab: 'noticeboard' },
    { id: 'counsellings', name: 'Counsellings', icon: IconCounsellings, targetTab: 'counsellings' },
    { id: 'hostel', name: 'Hostel', icon: IconHostel, targetTab: 'hostel' },

    { id: 'gate-pass', name: 'Gate Pass', icon: IconGatePass, targetTab: 'gate-pass' },
    { id: 'admission', name: 'Admission', icon: IconAdmission, targetTab: 'admission' },
    { id: 'leaderboard', name: 'Leaderboard', icon: IconLeaderboard, targetTab: 'leaderboard' },
    { id: 'settings', name: 'Settings', icon: IconSettings, targetTab: 'settings' },
  ];

  const otherTools = [
    { id: 'report-card', name: 'Report Card', icon: IconReportCard, targetTab: 'report-card' },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2 select-none">
      {/* 20 Main Tiles Grid (4 Columns) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-5">
        {mainTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.id}
              onClick={() => onNavigateTab(tile.targetTab)}
              className="group bg-[#fdfcfb] hover:bg-white border border-[#ded9cf] hover:border-[#cfc9be] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-2xs hover:shadow-sm transition-all duration-150 active:scale-[0.98] min-h-[135px]"
            >
              <div className="shrink-0 mb-3 group-hover:scale-105 transition-transform duration-150">
                <Icon className="w-13 h-13 sm:w-14 sm:h-14" />
              </div>
              <span className="text-[13px] font-semibold text-slate-800 tracking-tight">
                {tile.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Other Tools Section */}
      <div className="space-y-4 pt-2">
        <h2 className="text-[13px] font-bold text-slate-800">
          Other Tools
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-5">
          {otherTools.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.id}
                onClick={() => onNavigateTab(tile.targetTab)}
                className="group bg-[#fdfcfb] hover:bg-white border border-[#ded9cf] hover:border-[#cfc9be] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-2xs hover:shadow-sm transition-all duration-150 active:scale-[0.98] min-h-[135px]"
              >
                <div className="shrink-0 mb-3 group-hover:scale-105 transition-transform duration-150">
                  <Icon className="w-13 h-13 sm:w-14 sm:h-14" />
                </div>
                <span className="text-[13px] font-semibold text-slate-800 tracking-tight">
                  {tile.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
