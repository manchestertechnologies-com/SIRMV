import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { ToastContainer } from './components/ToastContainer';
import { CommandPalette } from './components/CommandPalette';
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
import { LiveClassModule } from './pages/LiveClassModule';
import { TestsAndMarksModule } from './pages/TestsAndMarksModule';
import { ClassesPage } from './pages/ClassesPage';
import { BatchesPage } from './pages/BatchesPage';
import { TestsPage } from './pages/TestsPage';
import { BoardMarksPage } from './pages/BoardMarksPage';
import { NoticeboardModule } from './pages/NoticeboardModule';
import { FeeModule } from './pages/FeeModule';
import { TimetableGeneratorModule } from './pages/TimetableGeneratorModule';
// Lazy-loaded: pulls in three.js / @react-three (~1.1MB) for the 3D floor
// view, which most users (students, parents, teachers, staff) never open.
// Splitting it into its own chunk keeps that weight off everyone else's
// initial page load — this was making the whole app feel heavy/laggy on
// mobile, since previously every visitor downloaded and parsed it upfront.
const ExamManagementModule = lazyWithRetry(() =>
  import('./pages/ExamManagementModule').then((m) => ({ default: m.ExamManagementModule }))
);
import { MyExamDutiesPage } from './pages/MyExamDutiesPage';
import { InvigilatorRequestsPage } from './pages/InvigilatorRequestsPage';
import { InvigilationScanPage } from './pages/InvigilationScanPage';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { LazyLoadErrorBoundary } from './components/LazyLoadErrorBoundary';
import { ExamSeatingPage } from './pages/ExamSeatingPage';
import { SettingsPage } from './pages/SettingsPage';
import { CounsellingModule } from './pages/CounsellingModule';
import { CalendarPage } from './pages/CalendarPage';
import { FloorIssuesPage } from './pages/FloorIssuesPage';
import { StudentAttendanceView } from './pages/StudentAttendanceView';
import { StudentTimetableView } from './pages/StudentTimetableView';
import { AdminTimetableView } from './pages/AdminTimetableView';
import { SmsModule } from './pages/SmsModule';
import { StudentTestsView } from './pages/StudentTestsView';
import { StudentOutpassView } from './pages/StudentOutpassView';
import { StudentHostelView } from './pages/StudentHostelView';
import { DisciplineRecordsPage } from './pages/DisciplineRecordsPage';
import { MyProfilePage } from './pages/MyProfilePage';
import { QuestionPaperSuite } from './components/question-paper/QuestionPaperSuite';
import { useAuth } from './context/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { ScreenBoundary } from './components/ScreenBoundary';
import { clearAllState, clearTabState } from './academic/persist';
const StudentsAcademic = lazyWithRetry(() => import('./academic/StudentsAcademic').then((m) => ({ default: m.StudentsAcademic })));
const ClassesAcademic = lazyWithRetry(() => import('./academic/ClassesAcademic').then((m) => ({ default: m.ClassesAcademic })));
const StaffsAcademic = lazyWithRetry(() => import('./academic/StaffsAcademic').then((m) => ({ default: m.StaffsAcademic })));
const HostelAcademic = lazyWithRetry(() => import('./academic/HostelAcademic').then((m) => ({ default: m.HostelAcademic })));
const AttendanceAcademic = lazyWithRetry(() => import('./academic/AttendanceAcademic').then((m) => ({ default: m.AttendanceAcademic })));
const ExamAcademic = lazyWithRetry(() => import('./academic/ExamAcademic').then((m) => ({ default: m.ExamAcademic })));
const ReportsAcademic = lazyWithRetry(() => import('./academic/ReportsAcademic').then((m) => ({ default: m.ReportsAcademic })));
const TimetableAcademic = lazyWithRetry(() => import('./academic/TimetableAcademic').then((m) => ({ default: m.TimetableAcademic })));
const BlueprintModule = lazyWithRetry(() => import('./academic/BlueprintModule').then((m) => ({ default: m.BlueprintModule })));

const AcademicLoading = () => <div className="py-24 text-center text-sm text-slate-500">Loading…</div>;

export function App() {
  // the open screen survives a refresh (kept per logged-in user for this browser tab)
  const [activeTab, setActiveTabRaw] = useState<string>(() => { try { return JSON.parse(sessionStorage.getItem('mt-active-tab') || 'null')?.tab || 'dashboard-home'; } catch { return 'dashboard-home'; } });
  const activeUid = useRef<string | undefined>(undefined);
  const setActiveTab = (tab: string) => { setActiveTabRaw(tab); try { sessionStorage.setItem('mt-active-tab', JSON.stringify({ uid: activeUid.current, tab })); } catch { /* ignore */ } };
  const [staffSubTab, setStaffSubTab] = useState<'teaching' | 'non-teaching'>('teaching');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, isLoading } = useAuth();
  // Academic overview (icons -> class -> students) for leadership/teaching roles
  const academicRole = !!user && ['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER', 'EXAM_DEPARTMENT'].includes(user.role);
  const hostelRole = academicRole || user?.role === 'WARDEN' || user?.role === 'HEAD_WARDEN';
  // tapping a sidebar icon always returns to that module's first page
  const [navNonce, setNavNonce] = useState(0);
  const activeTabRef = useRef(activeTab); activeTabRef.current = activeTab;
  // a sidebar tap starts that module from its first page
  const selectTab = (tab: string) => { clearTabState(tab); try { sessionStorage.removeItem('mt-return'); } catch { /* ignore */ } setActiveTab(tab); setNavNonce((n) => n + 1); };
  activeUid.current = user?.id;

  // detail pages (faculty / student) opened from another screen, with a way back to the exact spot
  useEffect(() => {
    const go = (e: Event) => {
      const d = (e as CustomEvent).detail as { tab: string; key: string; id: string };
      const main = document.querySelector('main');
      try {
        sessionStorage.setItem('mt-return', JSON.stringify({ tab: activeTabRef.current, scroll: main?.scrollTop || 0 }));
        sessionStorage.setItem(d.key, d.id);
      } catch { /* ignore */ }
      setActiveTab(d.tab); setNavNonce((n) => n + 1);
    };
    const back = () => {
      let r: { tab: string; scroll: number } | null = null;
      try { r = JSON.parse(sessionStorage.getItem('mt-return') || 'null'); sessionStorage.removeItem('mt-return'); } catch { /* ignore */ }
      if (!r) return;
      setActiveTab(r.tab); setNavNonce((n) => n + 1);
      let n = 0; const t = window.setInterval(() => { const m = document.querySelector('main'); if (m) m.scrollTo({ top: r!.scroll, behavior: 'auto' }); if (++n > 12) window.clearInterval(t); }, 80);
    };
    window.addEventListener('mt-goto', go); window.addEventListener('mt-return', back);
    return () => { window.removeEventListener('mt-goto', go); window.removeEventListener('mt-return', back); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Switching accounts via the role-switcher (or logging in as someone else)
  // changes `user` but previously left `activeTab` pointing at whatever the
  // last role had open — e.g. still on "Timetable Generator" after switching
  // to a Teacher, who can't see that module and whose screen then looked
  // "stuck" on the old role's page. Reset to the dashboard home whenever the
  // logged-in user actually changes (not on every render/data refresh).
  const previousUserIdRef = useRef<string | undefined>(user?.id);
  useEffect(() => {
    if (user?.id !== previousUserIdRef.current) {
      const first = previousUserIdRef.current === undefined && !!user?.id; // page load: the user arrives after the first render
      previousUserIdRef.current = user?.id;
      let saved: { uid?: string; tab?: string } | null = null;
      try { saved = JSON.parse(sessionStorage.getItem('mt-active-tab') || 'null'); } catch { /* ignore */ }
      if (first && saved?.uid === user?.id && saved?.tab) { setActiveTabRaw(saved.tab); return; } // refresh: stay on the same screen
      if (!user?.id) clearAllState();
      clearAllState();
      setActiveTab('dashboard-home');
    }
  }, [user?.id]);

  // Push notification tap routing: the service worker either postMessages an
  // already-open tab (notificationclick focusing an existing window) or opens
  // a new window with ?openTab=... (no window was open) — both land here.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openTab = params.get('openTab');
    if (openTab) {
      setActiveTab(openTab);
      window.history.replaceState({}, '', window.location.pathname);
    }

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_NOTIFICATION_CLICK' && event.data.targetTab) {
        setActiveTab(event.data.targetTab);
      }
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
  }, []);

  const moduleTitles: Record<string, string> = {
    staffs: 'Staffs',
    students: 'Students',
    classes: 'Classes',
    batches: 'Batches',
    tests: 'Tests',
    'board-marks': 'Board Marks',
    questions: 'Questions Bank',
    'question-papers': 'Question Paper & 4-Set Suite',
    reports: 'Reports',
    attendance: 'Attendance',
    fee: 'Fee',
    timetable: 'Timetable',
    'timetable-generator': 'Timetable Generator',
    'exam-management': 'Exam Management',
    'my-exam-duty': 'My Exam Duties',
    'invigilator-requests': 'Invigilator Requests',
    'invigilation-scan': 'Exam Invigilation Attendance',
    'exam-seating': 'Exam Seating',
    'live-class': 'Live Class',
    sms: 'Sms',
    noticeboard: 'Noticeboard',
    counsellings: 'Counselling',
    'college-calendar': 'College Calendar',
    'floor-issues': 'Reporting Issues',
    discipline: 'Student Discipline',
    'my-profile': 'My Profile',
    hostel: 'Hostel',
    'gate-pass': 'Gate Pass',
    blueprint: 'Blueprint',
    admission: 'Admission',
    leaderboard: 'Leaderboard',
    settings: 'Settings',
    'report-card': 'Report Card'
  };

  // While the saved session is being checked, show a light splash instead of an empty app shell
  if (!user && isLoading) {
    return (
      <div className="mt-splash" role="status" aria-label="Loading">
        <img src="/logo.png" alt="" />
        <div className="mt-splash-bar" />
      </div>
    );
  }

  // Show Login Page if unauthenticated
  if (!user && !isLoading) {
    return <LoginPage />;
  }
  // signing the saved session back in on refresh: wait for the user before drawing any screen
  if (!user) {
    return <div className="h-[100dvh] flex items-center justify-center text-sm text-slate-500 bg-[#f6f2ec]">Opening your workspace…</div>;
  }

  return (
    <div className="h-[100dvh] overflow-hidden flex bg-transparent text-slate-800 font-sans">
      <ToastContainer />
      <CommandPalette onNavigate={(tab) => { selectTab(tab); setIsSidebarOpen(false); }} />
      {/* Left Sidebar — off-canvas drawer on mobile, static column from md: up */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={selectTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Right Column: Navbar + Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full">
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} onNavigate={(tab) => selectTab(tab)} />

        <main key={`${activeTab}-${navNonce}`} className="mt-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-10">
          <ScreenBoundary onHome={() => selectTab('dashboard-home')}>
          {activeTab === 'dashboard-home' ? (
            <DashboardHome onNavigateTab={(tab) => selectTab(tab)} />
          ) : activeTab === 'staffs' && academicRole ? (
            <Suspense fallback={<AcademicLoading />}><StaffsAcademic onExit={() => setActiveTab('dashboard-home')} /></Suspense>
          ) : activeTab === 'students' && academicRole ? (
            <Suspense fallback={<AcademicLoading />}><StudentsAcademic onExit={() => setActiveTab('dashboard-home')} /></Suspense>
          ) : activeTab === 'classes' && academicRole ? (
            <Suspense fallback={<AcademicLoading />}><ClassesAcademic onExit={() => setActiveTab('dashboard-home')} /></Suspense>
          ) : activeTab === 'attendance' && academicRole ? (
            <Suspense fallback={<AcademicLoading />}><AttendanceAcademic onExit={() => setActiveTab('dashboard-home')} /></Suspense>
          ) : activeTab === 'hostel' && hostelRole ? (
            <Suspense fallback={<AcademicLoading />}><HostelAcademic onExit={() => setActiveTab('dashboard-home')} /></Suspense>
          ) : activeTab === 'gate-pass' && hostelRole ? (
            <Suspense fallback={<AcademicLoading />}><HostelAcademic onExit={() => setActiveTab('dashboard-home')} initialTab="Outpass" /></Suspense>
          ) : activeTab === 'reports' && academicRole ? (
            <Suspense fallback={<AcademicLoading />}><ReportsAcademic onExit={() => setActiveTab('dashboard-home')} /></Suspense>
          ) : activeTab === 'timetable' && !!user && ['ADMIN', 'PRINCIPAL', 'HOD', 'EXAM_DEPARTMENT'].includes(user.role) ? (
            <Suspense fallback={<AcademicLoading />}><TimetableAcademic onExit={() => setActiveTab('dashboard-home')} /></Suspense>
          ) : activeTab === 'blueprint' && (hostelRole || user?.role === 'WARDEN') ? (
            <Suspense fallback={<AcademicLoading />}><BlueprintModule onExit={() => setActiveTab('dashboard-home')} /></Suspense>
          ) : activeTab === 'exam-management' && academicRole ? (
            <Suspense fallback={<AcademicLoading />}><ExamAcademic onExit={() => setActiveTab('dashboard-home')} onOpenBlueprint={() => selectTab('blueprint')} /></Suspense>
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${staffSubTab === 'teaching'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    Teaching Faculty
                  </button>
                  <button
                    onClick={() => setStaffSubTab('non-teaching')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${staffSubTab === 'non-teaching'
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
                    {user?.role === 'STUDENT' ? 'My Attendance' : 'Attendance Center'}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {user?.role === 'STUDENT'
                      ? 'SIR MV PU College • Calendar & Period-wise Record'
                      : 'SIR MV PU College • Manual & Verified Attendance'}
                  </p>
                </div>
              </div>
              {user?.role === 'STUDENT' ? <StudentAttendanceView /> : <AttendanceModule />}
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
                    {user?.role === 'STUDENT' ? 'Hostel Info' : 'Hostel & Residential Management'}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {user?.role === 'STUDENT'
                      ? 'SIR MV PU College • My Room, Roommates & Maintenance'
                      : 'SIR MV PU College • Blocks, Floors & Room Allotment'}
                  </p>
                </div>
              </div>
              {user?.role === 'STUDENT' ? <StudentHostelView /> : <HostelDashboard />}
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
                    {user?.role === 'STUDENT' ? 'My Outpass & Grievances' : 'Gate Pass & Student Outpass'}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {user?.role === 'STUDENT'
                      ? 'SIR MV PU College • Outpass Requests & Hostel Grievances'
                      : 'SIR MV PU College • 6-Factor Secure Gate Control System'}
                  </p>
                </div>
              </div>
              {user?.role === 'STUDENT' ? <StudentOutpassView /> : <OutpassSystem />}
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
                    {user?.role === 'STUDENT'
                      ? 'My Class Timetable'
                      : user?.role === 'ADMIN' || user?.role === 'PRINCIPAL'
                      ? 'Institutional Timetable — All Classes'
                      : 'Institutional Timetable & Substitutions'}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {user?.role === 'STUDENT'
                      ? 'SIR MV PU College • Your Weekly Lecture Schedule'
                      : user?.role === 'ADMIN' || user?.role === 'PRINCIPAL'
                      ? 'SIR MV PU College • Published Timetables for Every Class, Section & Batch'
                      : 'SIR MV PU College • Daily Lecture Matrices'}
                  </p>
                </div>
              </div>
              {user?.role === 'STUDENT' ? (
                <StudentTimetableView />
              ) : user?.role === 'ADMIN' || user?.role === 'PRINCIPAL' ? (
                <AdminTimetableView />
              ) : (
                <TeachersModule />
              )}
            </div>
          ) : activeTab === 'timetable-generator' ? (
            <div className="space-y-6 max-w-7xl mx-auto">
              <TimetableGeneratorModule />
            </div>
          ) : activeTab === 'exam-management' ? (
            <div className="space-y-6 max-w-7xl mx-auto">
              <LazyLoadErrorBoundary label="Exam Management">
                <Suspense fallback={<div className="text-center text-slate-400 text-sm py-10">Loading Exam Management… (this can take a moment on a slow connection)</div>}>
                  <ExamManagementModule />
                </Suspense>
              </LazyLoadErrorBoundary>
            </div>
          ) : activeTab === 'my-exam-duty' ? (
            <div className="space-y-6 max-w-7xl mx-auto">
              <MyExamDutiesPage />
            </div>
          ) : activeTab === 'invigilator-requests' ? (
            <div className="space-y-6 max-w-7xl mx-auto">
              <InvigilatorRequestsPage />
            </div>
          ) : activeTab === 'invigilation-scan' ? (
            <div className="space-y-6 max-w-7xl mx-auto">
              <InvigilationScanPage />
            </div>
          ) : activeTab === 'exam-seating' ? (
            <div className="space-y-6 max-w-7xl mx-auto">
              <ExamSeatingPage />
            </div>
          ) : activeTab === 'classes' ? (
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
                  <h1 className="text-lg font-bold text-slate-900 font-heading">{moduleTitles[activeTab]}</h1>
                  <p className="text-xs text-slate-500">SIR MV PU College • Classes & Sections</p>
                </div>
              </div>
              <ClassesPage />
            </div>
          ) : activeTab === 'batches' ? (
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
                  <h1 className="text-lg font-bold text-slate-900 font-heading">{moduleTitles[activeTab]}</h1>
                  <p className="text-xs text-slate-500">SIR MV PU College • NEET / JEE / KCET Batches</p>
                </div>
              </div>
              <BatchesPage />
            </div>
          ) : activeTab === 'tests' ? (
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
                  <h1 className="text-lg font-bold text-slate-900 font-heading">{moduleTitles[activeTab]}</h1>
                  <p className="text-xs text-slate-500">SIR MV PU College • Online & Offline Tests</p>
                </div>
              </div>
              {user?.role === 'STUDENT' ? <StudentTestsView /> : <TestsPage />}
            </div>
          ) : activeTab === 'board-marks' ? (
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
                  <h1 className="text-lg font-bold text-slate-900 font-heading">{moduleTitles[activeTab]}</h1>
                  <p className="text-xs text-slate-500">SIR MV PU College • Cycle 1 / 2 / 3 Board Marks</p>
                </div>
              </div>
              <BoardMarksPage />
            </div>
          ) : (activeTab === 'questions' || activeTab === 'question-papers') ? (
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
                    Question Paper Generator & 4-Set Examination Suite
                  </h1>
                  <p className="text-xs text-slate-500">
                    SIR MV PU College • 8-Database Pool (75k+ Qs) • Sets P, Q, R, S • A4 Print Engine • OMR Evaluation
                  </p>
                </div>
              </div>
              <QuestionPaperSuite />
            </div>
          ) : activeTab === 'live-class' ? (
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
                    Live Classes & Recorded Lectures
                  </h1>
                  <p className="text-xs text-slate-500">
                    SIR MV PU College • Recorded Lectures for Absent Students
                  </p>
                </div>
              </div>
              <LiveClassModule />
            </div>
          ) : activeTab === 'sms' ? (
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
                    SMS Notification Workflow
                  </h1>
                  <p className="text-xs text-slate-500">
                    SIR MV PU College • Automated Alerts & Manual Messaging to Parents
                  </p>
                </div>
              </div>
              <SmsModule />
            </div>
          ) : activeTab === 'noticeboard' ? (
            <div className="space-y-6 max-w-5xl mx-auto">
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
                    Noticeboard & Circulars
                  </h1>
                  <p className="text-xs text-slate-500">
                    SIR MV PU College • Institutional Announcements
                  </p>
                </div>
              </div>
              <NoticeboardModule />
            </div>
          ) : activeTab === 'fee' ? (
            <div className="space-y-6 max-w-5xl mx-auto">
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
                    Fee & Receipts Desk
                  </h1>
                  <p className="text-xs text-slate-500">
                    SIR MV PU College • Tuition & Term Payments
                  </p>
                </div>
              </div>
              <FeeModule />
            </div>
          ) : activeTab === 'settings' ? (
            <SettingsPage />
          ) : activeTab === 'counsellings' ? (
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
                  <h1 className="text-lg font-bold text-slate-900 font-heading">Student Counselling</h1>
                  <p className="text-xs text-slate-500">SIR MV PU College • Counselling Session Log</p>
                </div>
              </div>
              <CounsellingModule />
            </div>
          ) : activeTab === 'college-calendar' ? (
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
                  <h1 className="text-lg font-bold text-slate-900 font-heading">College Calendar</h1>
                  <p className="text-xs text-slate-500">SIR MV PU College • Holidays, Exams & Events</p>
                </div>
              </div>
              <CalendarPage />
            </div>
          ) : activeTab === 'floor-issues' ? (
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
                  <h1 className="text-lg font-bold text-slate-900 font-heading">Reporting Issues</h1>
                  <p className="text-xs text-slate-500">SIR MV PU College • Floor Maintenance & Operational Issues</p>
                </div>
              </div>
              <FloorIssuesPage />
            </div>
          ) : activeTab === 'discipline' ? (
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
                  <h1 className="text-lg font-bold text-slate-900 font-heading">Student Discipline</h1>
                  <p className="text-xs text-slate-500">SIR MV PU College • Hostel Discipline Records</p>
                </div>
              </div>
              <DisciplineRecordsPage />
            </div>
          ) : activeTab === 'my-profile' ? (
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
                  <h1 className="text-lg font-bold text-slate-900 font-heading">My Profile</h1>
                  <p className="text-xs text-slate-500">SIR MV PU College • Staff Profile</p>
                </div>
              </div>
              <MyProfilePage />
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
          </ScreenBoundary>
        </main>
      </div>
    </div>
  );
}

export default App;
