import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardHome } from './pages/DashboardHome';
import { TeacherPortal } from './pages/TeacherPortal';
import { SubstitutionCenter } from './pages/SubstitutionCenter';
import { FloorAttenderDashboard } from './pages/FloorAttenderDashboard';
import { OnePageLectureRecord } from './pages/OnePageLectureRecord';
import { AttendanceTaking } from './pages/AttendanceTaking';
import { MissedRecordingsPage } from './pages/MissedRecordingsPage';
import { EveningStudyDashboard } from './pages/EveningStudyDashboard';
import { HostelDashboard } from './pages/HostelDashboard';
import { OutpassSystem } from './pages/OutpassSystem';
import { ReportCardGenerator } from './pages/ReportCardGenerator';
import { AuditLogsPage } from './pages/AuditLogsPage';

const MainLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard-home');
  const [selectedLectureSessionId, setSelectedLectureSessionId] = useState<string>('lec-session-101');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f6f2] text-slate-800">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-slate-600 font-mono tracking-wider uppercase">Loading SIR MV PU College...</span>
        </div>
      </div>
    );
  }

  // Inter-page navigations
  const handleOpenAttendance = (sessionId: string) => {
    setSelectedLectureSessionId(sessionId);
    setActiveTab('class-attendance');
  };

  const handleOpenOnePageRecord = (sessionId: string) => {
    setSelectedLectureSessionId(sessionId);
    setActiveTab('lecture-records');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f6f2] text-slate-800">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard-home' && (
            <DashboardHome onNavigateTab={(tab) => setActiveTab(tab)} />
          )}
          {activeTab === 'teacher-portal' && <TeacherPortal />}
          {activeTab === 'substitution-center' && <SubstitutionCenter />}
          {activeTab === 'floor-attender' && (
            <FloorAttenderDashboard
              onOpenAttendance={handleOpenAttendance}
              onOpenOnePageRecord={handleOpenOnePageRecord}
            />
          )}
          {activeTab === 'lecture-records' && (
            <OnePageLectureRecord
              lectureSessionId={selectedLectureSessionId}
              onBack={() => setActiveTab('floor-attender')}
            />
          )}
          {activeTab === 'class-attendance' && (
            <AttendanceTaking lectureSessionId={selectedLectureSessionId} />
          )}
          {activeTab === 'missed-recordings' && <MissedRecordingsPage />}
          {activeTab === 'evening-study' && <EveningStudyDashboard />}
          {activeTab === 'hostel-attendance' && <HostelDashboard />}
          {activeTab === 'outpass-system' && <OutpassSystem />}
          {activeTab === 'report-cards' && <ReportCardGenerator />}
          {activeTab === 'audit-logs' && <AuditLogsPage />}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

export default App;
