import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardHome } from './pages/DashboardHome';
import { ArrowLeft } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard-home');

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

  return (
    <div className="min-h-screen flex bg-[#ebe7de] text-slate-800 font-sans">
      {/* Left Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-10">
        {activeTab === 'dashboard-home' ? (
          <DashboardHome onNavigateTab={(tab) => setActiveTab(tab)} />
        ) : (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Top Bar for Module */}
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

            {/* Clean Empty Workspace */}
            <div className="bg-[#fdfcfb] border border-[#ded9cf] rounded-2xl p-12 text-center text-slate-400">
              <div className="max-w-md mx-auto space-y-2">
                <p className="text-sm font-semibold text-slate-700">
                  {moduleTitles[activeTab] || activeTab} Module
                </p>
                <p className="text-xs text-slate-400">
                  Clean canvas ready for implementation.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
