import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { DashboardHome } from './pages/DashboardHome';
import { TeachersModule } from './pages/TeachersModule';
import { StudentsModule } from './pages/StudentsModule';
import { NonTeachingStaffModule } from './pages/NonTeachingStaffModule';
import { AttendanceModule } from './pages/AttendanceModule';
import { HostelDashboard } from './pages/HostelDashboard';
import { OutpassSystem } from './pages/OutpassSystem';
import { ReportCardGenerator } from './pages/ReportCardGenerator';
import { ReportsModule } from './pages/ReportsModule';
import { useAuth } from './context/AuthContext';
import { ArrowLeft } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard-home');
  const [staffSubTab, setStaffSubTab] = useState<'teaching' | 'non-teaching'>('teaching');
  const { user, isLoading } = useAuth();

  const moduleTitles: Record<string, string> = {
    staffs: 'Staffs',
    students: 'Students',
    classes: 'Classes',
    batches: 'Batches',
    tests: 'Tests',
    'board-marks': 'Board Marks',
    questions: 'Questions',
    reports: 'Reports',
    attendance: 'Attendance',
    fee: 'Fee',
    timetable: 'Timetable',
    'live-class': 'Live Class',
    sms: 'Sms',
    noticeboard: 'Noticeboard',
    counsellings: 'Counsellings',
    hostel: 'Hostel',
    'gate-pass': 'Gate Pass',
    admission: 'Admission',
    leaderboard: 'Leaderboard',
    settings: 'Settings',
    'report-card': 'Report Card'
  };

  // Show Login Page if unauthenticated
  if (!user && !isLoading) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen flex bg-[#ebe7de] text-slate-800 font-sans">
      {/* Left Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Right Column: Navbar + Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Navbar />

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          {activeTab === 'dashboard-home' ? (
            <DashboardHome onNavigateTab={(tab) => setActiveTab(tab)} />
          ) : activeTab === 'staffs' ? (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#ded9cf]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab('dashboard-home')}
                    className="p-2 bg-[#fdfcfb] hover:bg-white border border-[#ded9cf] rounded-xl text-slate-600 transition"
                    title="Back to Dashboard"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h1 className="text-lg font-bold text-slate-900 font-heading">
                      Staff & Faculty Directory
                    </h1>
                    <p className="text-xs text-slate-500">
                      SIR MV PU College • Academic & Operational Personnel
                    </p>
                  </div>
                </div>

                {/* Sub Tab Switcher: Teaching vs Non-Teaching */}
                <div className="flex items-center gap-1 bg-[#ded9cf]/60 p-1 rounded-2xl self-start sm:self-auto">
                  <button
                    onClick={() => setStaffSubTab('teaching')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      staffSubTab === 'teaching'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Teaching Faculty
                  </button>
                  <button
                    onClick={() => setStaffSubTab('non-teaching')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      staffSubTab === 'non-teaching'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Non-Teaching Staff
                  </button>
                </div>
              </div>

              {staffSubTab === 'teaching' ? <TeachersModule /> : <NonTeachingStaffModule />}
            </div>
          ) : activeTab === 'students' ? (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center gap-3 pb-2 border-b border-[#ded9cf]">
                <button
                  onClick={() => setActiveTab('dashboard-home')}
                  className="p-2 bg-[#fdfcfb] hover:bg-white border border-[#ded9cf] rounded-xl text-slate-600 transition"
                  title="Back to Dashboard"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 font-heading">
                    Students & Academic Registry
                  </h1>
                  <p className="text-xs text-slate-500">
                    SIR MV PU College • Student Profiles & Batches
                  </p>
                </div>
              </div>
              <StudentsModule />
            </div>
          ) : activeTab === 'attendance' ? (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center gap-3 pb-2 border-b border-[#ded9cf]">
                <button
                  onClick={() => setActiveTab('dashboard-home')}
                  className="p-2 bg-[#fdfcfb] hover:bg-white border border-[#ded9cf] rounded-xl text-slate-600 transition"
                  title="Back to Dashboard"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 font-heading">
                    Attendance Center
                  </h1>
                  <p className="text-xs text-slate-500">
                    SIR MV PU College • Manual & Verified Attendance
                  </p>
                </div>
              </div>
              <AttendanceModule />
            </div>
          ) : activeTab === 'hostel' ? (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center gap-3 pb-2 border-b border-[#ded9cf]">
                <button
                  onClick={() => setActiveTab('dashboard-home')}
                  className="p-2 bg-[#fdfcfb] hover:bg-white border border-[#ded9cf] rounded-xl text-slate-600 transition"
                  title="Back to Dashboard"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 font-heading">
                    Hostel & Residential Management
                  </h1>
                  <p className="text-xs text-slate-500">
                    SIR MV PU College • Blocks, Floors & Night Roll-Call
                  </p>
                </div>
              </div>
              <HostelDashboard />
            </div>
          ) : activeTab === 'gate-pass' ? (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center gap-3 pb-2 border-b border-[#ded9cf]">
                <button
                  onClick={() => setActiveTab('dashboard-home')}
                  className="p-2 bg-[#fdfcfb] hover:bg-white border border-[#ded9cf] rounded-xl text-slate-600 transition"
                  title="Back to Dashboard"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 font-heading">
                    Gate Pass & Student Outpass
                  </h1>
                  <p className="text-xs text-slate-500">
                    SIR MV PU College • 6-Factor Secure Gate Control System
                  </p>
                </div>
              </div>
              <OutpassSystem />
            </div>
          ) : activeTab === 'report-card' ? (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center gap-3 pb-2 border-b border-[#ded9cf]">
                <button
                  onClick={() => setActiveTab('dashboard-home')}
                  className="p-2 bg-[#fdfcfb] hover:bg-white border border-[#ded9cf] rounded-xl text-slate-600 transition"
                  title="Back to Dashboard"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 font-heading">
                    Report Card Generator
                  </h1>
                  <p className="text-xs text-slate-500">
                    SIR MV PU College • Examination Reports & Performance Sheets
                  </p>
                </div>
              </div>
              <ReportCardGenerator />
            </div>
          ) : activeTab === 'reports' ? (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center gap-3 pb-2 border-b border-[#ded9cf]">
                <button
                  onClick={() => setActiveTab('dashboard-home')}
                  className="p-2 bg-[#fdfcfb] hover:bg-white border border-[#ded9cf] rounded-xl text-slate-600 transition"
                  title="Back to Dashboard"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 font-heading">
                    Executive Reports & Analytics
                  </h1>
                  <p className="text-xs text-slate-500">
                    SIR MV PU College • Academic & Operational Intelligence
                  </p>
                </div>
              </div>
              <ReportsModule />
            </div>
          ) : activeTab === 'timetable' ? (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center gap-3 pb-2 border-b border-[#ded9cf]">
                <button
                  onClick={() => setActiveTab('dashboard-home')}
                  className="p-2 bg-[#fdfcfb] hover:bg-white border border-[#ded9cf] rounded-xl text-slate-600 transition"
                  title="Back to Dashboard"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 font-heading">
                    Institutional Timetable & Substitutions
                  </h1>
                  <p className="text-xs text-slate-500">
                    SIR MV PU College • Daily Lecture Matrices
                  </p>
                </div>
              </div>
              <TeachersModule />
            </div>
          ) : (
            <div className="space-y-6 max-w-5xl mx-auto">
              {/* Top Bar for Placeholder Modules */}
              <div className="flex items-center gap-3 pb-4 border-b border-[#ded9cf]">
                <button
                  onClick={() => setActiveTab('dashboard-home')}
                  className="p-2 bg-[#fdfcfb] hover:bg-white border border-[#ded9cf] rounded-xl text-slate-600 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    {moduleTitles[activeTab] || activeTab}
                  </h1>
                  <p className="text-xs text-slate-500">
                    SIR MV PU College • Module Workspace
                  </p>
                </div>
              </div>

              {/* Clean Workspace Placeholder */}
              <div className="bg-[#fdfcfb] border border-[#ded9cf] rounded-2xl p-12 text-center text-slate-400">
                <div className="max-w-md mx-auto space-y-2">
                  <p className="text-sm font-semibold text-slate-700">
                    {moduleTitles[activeTab] || activeTab} Module
                  </p>
                  <p className="text-xs text-slate-400">
                    Ready for institutional workflow.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
