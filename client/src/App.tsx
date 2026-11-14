import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { ToastContainer } from './components/ToastContainer';
import { CommandPalette } from './components/CommandPalette';
import { LoginPage } from './pages/LoginPage';
import { DashboardHome } from './pages/DashboardHome';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { useAuth } from './context/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { StudentsAcademic } from './academic/StudentsAcademic';
import { ClassesAcademic } from './academic/ClassesAcademic';
import { StaffsAcademic } from './academic/StaffsAcademic';
import { HostelAcademic } from './academic/HostelAcademic';
import { AttendanceAcademic } from './academic/AttendanceAcademic';
import { ExamAcademic } from './academic/ExamAcademic';
import { ReportsAcademic } from './academic/ReportsAcademic';
import { TimetableAcademic } from './academic/TimetableAcademic';
import { BlueprintModule } from './academic/BlueprintModule';
import { sectionsFor as scopedSections, deptOfHod } from './academic/scope';
import { TimetableGenerator } from './academic/TimetableGenerator';
import { LeaderboardAcademic } from './academic/LeaderboardAcademic';
import { ScreenBoundary } from './components/ScreenBoundary';
import { clearAllState, clearTabState } from './academic/persist';

const TeachersModule = lazyWithRetry(() => import('./pages/TeachersModule').then((m) => ({ default: m.TeachersModule })));
const StudentsModule = lazyWithRetry(() => import('./pages/StudentsModule').then((m) => ({ default: m.StudentsModule })));
const NonTeachingStaffModule = lazyWithRetry(() => import('./pages/NonTeachingStaffModule').then((m) => ({ default: m.NonTeachingStaffModule })));
const AttendanceModule = lazyWithRetry(() => import('./pages/AttendanceModule').then((m) => ({ default: m.AttendanceModule })));
const HostelDashboard = lazyWithRetry(() => import('./pages/HostelDashboard').then((m) => ({ default: m.HostelDashboard })));
const OutpassSystem = lazyWithRetry(() => import('./pages/OutpassSystem').then((m) => ({ default: m.OutpassSystem })));
const ReportCardGenerator = lazyWithRetry(() => import('./pages/ReportCardGenerator').then((m) => ({ default: m.ReportCardGenerator })));
const ReportsModule = lazyWithRetry(() => import('./pages/ReportsModule').then((m) => ({ default: m.ReportsModule })));
const LiveClassModule = lazyWithRetry(() => import('./pages/LiveClassModule').then((m) => ({ default: m.LiveClassModule })));
const TestsAndMarksModule = lazyWithRetry(() => import('./pages/TestsAndMarksModule').then((m) => ({ default: m.TestsAndMarksModule })));
const ClassesPage = lazyWithRetry(() => import('./pages/ClassesPage').then((m) => ({ default: m.ClassesPage })));
const BatchesPage = lazyWithRetry(() => import('./pages/BatchesPage').then((m) => ({ default: m.BatchesPage })));
const TestsPage = lazyWithRetry(() => import('./pages/TestsPage').then((m) => ({ default: m.TestsPage })));
const BoardMarksPage = lazyWithRetry(() => import('./pages/BoardMarksPage').then((m) => ({ default: m.BoardMarksPage })));
const NoticeboardModule = lazyWithRetry(() => import('./pages/NoticeboardModule').then((m) => ({ default: m.NoticeboardModule })));
const FeeModule = lazyWithRetry(() => import('./pages/FeeModule').then((m) => ({ default: m.FeeModule })));
const MyExamDutiesPage = lazyWithRetry(() => import('./pages/MyExamDutiesPage').then((m) => ({ default: m.MyExamDutiesPage })));
const InvigilatorRequestsPage = lazyWithRetry(() => import('./pages/InvigilatorRequestsPage').then((m) => ({ default: m.InvigilatorRequestsPage })));
const InvigilationScanPage = lazyWithRetry(() => import('./pages/InvigilationScanPage').then((m) => ({ default: m.InvigilationScanPage })));
const ExamSeatingPage = lazyWithRetry(() => import('./pages/ExamSeatingPage').then((m) => ({ default: m.ExamSeatingPage })));
const SettingsPage = lazyWithRetry(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const CounsellingModule = lazyWithRetry(() => import('./pages/CounsellingModule').then((m) => ({ default: m.CounsellingModule })));
const CalendarPage = lazyWithRetry(() => import('./pages/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const FloorIssuesPage = lazyWithRetry(() => import('./pages/FloorIssuesPage').then((m) => ({ default: m.FloorIssuesPage })));
const StudentAttendanceView = lazyWithRetry(() => import('./pages/StudentAttendanceView').then((m) => ({ default: m.StudentAttendanceView })));
const StudentTimetableView = lazyWithRetry(() => import('./pages/StudentTimetableView').then((m) => ({ default: m.StudentTimetableView })));
const AdminTimetableView = lazyWithRetry(() => import('./pages/AdminTimetableView').then((m) => ({ default: m.AdminTimetableView })));
const SmsModule = lazyWithRetry(() => import('./pages/SmsModule').then((m) => ({ default: m.SmsModule })));
const StudentTestsView = lazyWithRetry(() => import('./pages/StudentTestsView').then((m) => ({ default: m.StudentTestsView })));
const StudentOutpassView = lazyWithRetry(() => import('./pages/StudentOutpassView').then((m) => ({ default: m.StudentOutpassView })));
const StudentHostelView = lazyWithRetry(() => import('./pages/StudentHostelView').then((m) => ({ default: m.StudentHostelView })));
const DisciplineRecordsPage = lazyWithRetry(() => import('./pages/DisciplineRecordsPage').then((m) => ({ default: m.DisciplineRecordsPage })));
const MyProfilePage = lazyWithRetry(() => import('./pages/MyProfilePage').then((m) => ({ default: m.MyProfilePage })));
const QuestionPaperSuite = lazyWithRetry(() => import('./components/question-paper/QuestionPaperSuite').then((m) => ({ default: m.QuestionPaperSuite })));

const AcademicLoading = () => <div className="mt-bars" role="status" aria-label="Loading"><i /><i /><i /></div>;

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
  const leadRole = !!user && ['ADMIN', 'PRINCIPAL'].includes(user.role);   // sees every department and class
  const myClasses = scopedSections(user?.role, user?.staffId) || undefined; // HOD / teacher only see their own classes
  const myDept = user?.role === 'HOD' ? deptOfHod(user?.staffId) : null;
  const hostelRole = academicRole || user?.role === 'WARDEN' || user?.role === 'HEAD_WARDEN';
  // tapping a sidebar icon always returns to that module's first page
  const [navNonce, setNavNonce] = useState(0);
  const activeTabRef = useRef(activeTab); activeTabRef.current = activeTab;
  // a sidebar tap starts that module from its first page
  const selectTab = (tab: string) => { clearTabState(tab); try { sessionStorage.removeItem('mt-return'); } catch { /* ignore */ } setActiveTab(tab); setNavNonce((n) => n + 1); };
  activeUid.current = user?.id;

  // Browser back: from any screen go to the dashboard first; one more back leaves the app.
  useEffect(() => {
    const inner = !!(window.history.state && window.history.state.mtInner);
    if (activeTab !== 'dashboard-home' && !inner) window.history.pushState({ ...(window.history.state || {}), mtInner: true }, '');
    else if (activeTab === 'dashboard-home' && inner) window.history.back();
  }, [activeTab]);
  useEffect(() => {
    const onPop = () => { if (activeTabRef.current !== 'dashboard-home') { setActiveTab('dashboard-home'); setNavNonce((n) => n + 1); } };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          <ScreenBoundary resetKey={`${activeTab}-${navNonce}`} onHome={() => selectTab('dashboard-home')}>
          <Suspense fallback={<AcademicLoading />}>
          {activeTab === 'dashboard-home' ? (
            <DashboardHome onNavigateTab={(tab) => selectTab(tab)} />
          ) : activeTab === 'staffs' && (leadRole || user?.role === 'EXAM_DEPARTMENT' || !!myDept) ? (
            <Suspense fallback={<AcademicLoading />}><StaffsAcademic onExit={() => setActiveTab('dashboard-home')} lockDept={myDept || undefined} /></Suspense>
          ) : activeTab === 'students' && academicRole ? (
            <Suspense fallback={<AcademicLoading />}><StudentsAcademic onExit={() => setActiveTab('dashboard-home')} only={myClasses} staffId={user?.staffId} /></Suspense>
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
          ) : activeTab === 'timetable' && academicRole ? (
            <Suspense fallback={<AcademicLoading />}><TimetableAcademic onExit={() => setActiveTab('dashboard-home')} only={myClasses} staffId={user?.staffId} /></Suspense>
          ) : activeTab === 'blueprint' && (hostelRole || user?.role === 'WARDEN') ? (
            <Suspense fallback={<AcademicLoading />}><BlueprintModule onExit={() => setActiveTab('dashboard-home')} /></Suspense>
          ) : activeTab === 'leaderboard' && academicRole ? (
            <LeaderboardAcademic onExit={() => selectTab('dashboard-home')} only={myClasses} />
          ) : activeTab === 'exam-management' ? (
            <Suspense fallback={<AcademicLoading />}><ExamAcademic onExit={() => setActiveTab('dashboard-home')} onOpenBlueprint={() => selectTab('blueprint')} /></Suspense>
          ) : activeTab === 'my-exam-duty' && academicRole ? (
            <Suspense fallback={<AcademicLoading />}><ExamAcademic onExit={() => setActiveTab('dashboard-home')} initialTab="Notifications" /></Suspense>
          ) : activeTab === 'invigilator-requests' && academicRole ? (
            <Suspense fallback={<AcademicLoading />}><ExamAcademic onExit={() => setActiveTab('dashboard-home')} initialTab="Duty requests" /></Suspense>
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
            <TimetableGenerator onBack={() => setActiveTab('dashboard-home')} />
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
          </Suspense>
          </ScreenBoundary>
        </main>
      </div>
    </div>
  );
}

export default App;
