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
  IconExamManagement
} from '../components/ModuleIcons';
import { UserRole } from '../context/AuthContext';

export interface NavItemConfig {
  id: string;
  label: string;
  icon: any;
  targetTab: string;
  description?: string;
  isOtherTool?: boolean;
}

export function getRoleNavigation(role: UserRole | string | undefined): {
  menuItems: NavItemConfig[];
  otherTools: NavItemConfig[];
  roleTitle: string;
  roleSubtitle: string;
} {
  switch (role) {
    case 'TEACHER':
      return {
        roleTitle: 'Faculty Lecturer Workspace',
        roleSubtitle: 'Manage your assigned classes, daily lectures, timetable, attendance and student marks.',
        menuItems: [
          { id: 'dashboard', label: 'My Dashboard', icon: IconDashboard, targetTab: 'dashboard-home', description: 'Faculty daily overview & tasks' },
          { id: 'timetable', label: 'My Timetable & Schedule', icon: IconTimetable, targetTab: 'timetable', description: 'Weekly lecture timetable & proxy duties' },
          { id: 'students', label: 'My Class Students', icon: IconStudents, targetTab: 'students', description: 'Roster of enrolled students in your batches' },
          { id: 'attendance', label: 'Lecture Attendance', icon: IconAttendance, targetTab: 'attendance', description: 'Mark & finalize classroom attendance' },
          { id: 'tests', label: 'Tests & Assessments', icon: IconTests, targetTab: 'tests', description: 'Unit tests & internal assessments' },
          { id: 'board-marks', label: 'Board Marks', icon: IconBoardMarks, targetTab: 'board-marks', description: 'PU board examination scores' },
          { id: 'live-class', label: 'Class Recordings', icon: IconLiveClass, targetTab: 'live-class', description: 'Upload lecture streams for absent students' },
          { id: 'noticeboard', label: 'Noticeboard', icon: IconNoticeboard, targetTab: 'noticeboard', description: 'Campus circulars & academic notices' }
        ],
        otherTools: [
          { id: 'report-card', label: 'Report Card Remarks', icon: IconReportCard, targetTab: 'report-card', description: 'Enter subject teacher remarks & grades', isOtherTool: true }
        ]
      };

    case 'HOD':
      return {
        roleTitle: 'Department Head (HOD) Portal',
        roleSubtitle: 'Department academic governance, faculty timetable matrix, substitute allocations and performance.',
        menuItems: [
          { id: 'dashboard', label: 'HOD Dashboard', icon: IconDashboard, targetTab: 'dashboard-home', description: 'Department academic KPIs' },
          { id: 'staffs', label: 'Department Faculty', icon: IconStaffs, targetTab: 'staffs', description: 'Teachers directory & profiles' },
          { id: 'timetable', label: 'Department Timetable', icon: IconTimetable, targetTab: 'timetable', description: 'Substitution center & lecture matrix' },
          { id: 'students', label: 'Department Students', icon: IconStudents, targetTab: 'students', description: 'All PUC students in department' },
          { id: 'attendance', label: 'Attendance Audit', icon: IconAttendance, targetTab: 'attendance', description: 'Verified lecture records' },
          { id: 'tests', label: 'Department Tests', icon: IconTests, targetTab: 'tests', description: 'Test schedules & question banks' },
          { id: 'board-marks', label: 'Board Marks Matrix', icon: IconBoardMarks, targetTab: 'board-marks', description: 'Marks analysis' },
          { id: 'reports', label: 'Academic Reports', icon: IconReports, targetTab: 'reports', description: 'Performance & syllabus analytics' },
          { id: 'noticeboard', label: 'Noticeboard', icon: IconNoticeboard, targetTab: 'noticeboard', description: 'Institutional circulars' }
        ],
        otherTools: [
          { id: 'report-card', label: 'Report Card Review', icon: IconReportCard, targetTab: 'report-card', description: 'HOD remarks & verification', isOtherTool: true }
        ]
      };

    case 'STUDENT':
      return {
        roleTitle: 'Student Academic Portal',
        roleSubtitle: 'Access your daily class timetable, attendance records, test marks, report cards and outpass status.',
        menuItems: [
          { id: 'dashboard', label: 'My Overview', icon: IconDashboard, targetTab: 'dashboard-home', description: 'Attendance %, timetable & test alerts' },
          { id: 'timetable', label: 'Class Timetable', icon: IconTimetable, targetTab: 'timetable', description: 'Daily lectures, periods & classrooms' },
          { id: 'attendance', label: 'My Attendance', icon: IconAttendance, targetTab: 'attendance', description: 'Lecture-wise presence & percentage' },
          { id: 'live-class', label: 'Missed Class Videos', icon: IconLiveClass, targetTab: 'live-class', description: 'Catch up on recorded lectures' },
          { id: 'tests', label: 'Tests & Marks', icon: IconTests, targetTab: 'tests', description: 'Scores in Unit Tests & NEET/JEE mocks' },
          { id: 'gate-pass', label: 'My Outpass Requests', icon: IconGatePass, targetTab: 'gate-pass', description: 'Apply for gate pass & view OTP status' },
          { id: 'hostel', label: 'Hostel Info', icon: IconHostel, targetTab: 'hostel', description: 'Room, floor & mess details' },
          { id: 'noticeboard', label: 'Noticeboard', icon: IconNoticeboard, targetTab: 'noticeboard', description: 'Exam dates & college announcements' }
        ],
        otherTools: [
          { id: 'report-card', label: 'My Report Card', icon: IconReportCard, targetTab: 'report-card', description: 'Download term report cards & grades', isOtherTool: true }
        ]
      };

    case 'PARENT':
      return {
        roleTitle: 'Parent & Guardian Portal',
        roleSubtitle: 'Monitor your ward\'s academic progress, daily lecture attendance, report cards and approve outpass requests.',
        menuItems: [
          { id: 'dashboard', label: 'Ward Overview', icon: IconDashboard, targetTab: 'dashboard-home', description: 'Academic score, attendance & notices' },
          { id: 'attendance', label: 'Daily Attendance', icon: IconAttendance, targetTab: 'attendance', description: 'Subject-wise class attendance log' },
          { id: 'gate-pass', label: 'Outpass Approvals (OTP)', icon: IconGatePass, targetTab: 'gate-pass', description: 'Verify pickup person & approve outpass' },
          { id: 'fee', label: 'Fee & Dues', icon: IconFee, targetTab: 'fee', description: 'Fee receipts & payment breakdown' },
          { id: 'noticeboard', label: 'College Notices', icon: IconNoticeboard, targetTab: 'noticeboard', description: 'Circulars from Principal office' }
        ],
        otherTools: [
          { id: 'report-card', label: 'Progress Report Card', icon: IconReportCard, targetTab: 'report-card', description: 'Institutional report cards & remarks', isOtherTool: true }
        ]
      };

    case 'FLOOR_ATTENDER':
      return {
        roleTitle: 'Floor Operations & Attendance Portal',
        roleSubtitle: 'Manage 1-Page Consolidated Classroom Lecture records, faculty time-in, photo verification & topics taught.',
        menuItems: [
          { id: 'dashboard', label: 'Floor Dashboard', icon: IconDashboard, targetTab: 'dashboard-home', description: 'Ongoing classes & floor room status' },
          { id: 'attendance', label: 'Daily Lecture Record', icon: IconAttendance, targetTab: 'attendance', description: 'Consolidated classroom log sheet' },
          { id: 'timetable', label: 'Floor Timetable', icon: IconTimetable, targetTab: 'timetable', description: 'Room 201-204 scheduled lectures' },
          { id: 'noticeboard', label: 'Duty Notices', icon: IconNoticeboard, targetTab: 'noticeboard', description: 'Daily floor assignments' }
        ],
        otherTools: []
      };

    case 'GATE_STAFF':
      return {
        roleTitle: 'Campus Gate Security & Outpass Portal',
        roleSubtitle: '6-factor verified student outpass control, pickup person photo verification, exit and return timestamps.',
        menuItems: [
          { id: 'dashboard', label: 'Security Dashboard', icon: IconDashboard, targetTab: 'dashboard-home', description: 'Active gate passes & campus alerts' },
          { id: 'gate-pass', label: 'Gate Pass & Outpass', icon: IconGatePass, targetTab: 'gate-pass', description: 'Scan 4-digit code & record exit/entry' },
          { id: 'students', label: 'Student Identification', icon: IconStudents, targetTab: 'students', description: 'Quick search student ID & photos' },
          { id: 'noticeboard', label: 'Security Circulars', icon: IconNoticeboard, targetTab: 'noticeboard', description: 'Gate protocols & instructions' }
        ],
        otherTools: []
      };

    case 'WARDEN':
    case 'HEAD_WARDEN':
      return {
        roleTitle: 'Hostel & Residential Management Portal',
        roleSubtitle: 'Hostel blocks, night roll-call attendance, evening study monitoring and residential student outpass control.',
        menuItems: [
          { id: 'dashboard', label: 'Hostel Dashboard', icon: IconDashboard, targetTab: 'dashboard-home', description: 'Hostel occupancy & outpass count' },
          { id: 'hostel', label: 'Hostel Management', icon: IconHostel, targetTab: 'hostel', description: 'Blocks, floors, rooms & beds' },
          { id: 'attendance', label: 'Night Roll-Call & Study', icon: IconAttendance, targetTab: 'attendance', description: 'Night attendance & study tracking' },
          { id: 'gate-pass', label: 'Hostel Outpasses', icon: IconGatePass, targetTab: 'gate-pass', description: 'Review hosteller check-in/out' },
          { id: 'students', label: 'Hosteller Registry', icon: IconStudents, targetTab: 'students', description: 'Resident student emergency contacts' },
          { id: 'noticeboard', label: 'Hostel Notices', icon: IconNoticeboard, targetTab: 'noticeboard', description: 'Mess schedule & hostel rules' }
        ],
        otherTools: []
      };

    case 'NON_TEACHING_STAFF':
      return {
        roleTitle: 'Administrative Staff Workspace',
        roleSubtitle: 'Campus operational records, office administration, staff directory and logistics.',
        menuItems: [
          { id: 'dashboard', label: 'Staff Dashboard', icon: IconDashboard, targetTab: 'dashboard-home', description: 'Daily operations & tasks' },
          { id: 'staffs', label: 'Staff Directory', icon: IconStaffs, targetTab: 'staffs', description: 'Non-teaching personnel directory' },
          { id: 'students', label: 'Student Admissions', icon: IconStudents, targetTab: 'students', description: 'Student registry & records' },
          { id: 'fee', label: 'Accounts & Fee Desk', icon: IconFee, targetTab: 'fee', description: 'Fee records & receipts' },
          { id: 'noticeboard', label: 'Noticeboard', icon: IconNoticeboard, targetTab: 'noticeboard', description: 'Administrative announcements' }
        ],
        otherTools: [
          { id: 'report-card', label: 'Report Card Printing', icon: IconReportCard, targetTab: 'report-card', description: 'Bulk print report cards', isOtherTool: true }
        ]
      };

    case 'EXAM_DEPARTMENT':
      return {
        roleTitle: 'Exam Department Workspace',
        roleSubtitle: 'PU-level examination scheduling, seating and invigilation for SIR MV PU College.',
        menuItems: [
          { id: 'dashboard', label: 'Dashboard', icon: IconDashboard, targetTab: 'dashboard-home' },
          { id: 'exam-management', label: 'Exam Management', icon: IconExamManagement, targetTab: 'exam-management', description: 'Exams, rooms, seating & invigilation' },
          { id: 'noticeboard', label: 'Noticeboard', icon: IconNoticeboard, targetTab: 'noticeboard' },
          { id: 'settings', label: 'Settings', icon: IconSettings, targetTab: 'settings' }
        ],
        otherTools: []
      };

    case 'ADMIN':
    case 'PRINCIPAL':
    default:
      return {
        roleTitle: 'Institutional Management ERP',
        roleSubtitle: 'Complete executive administration of SIR MV PU College - Shivamogga Campus.',
        menuItems: [
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
          { id: 'timetable-generator', label: 'Timetable Generator', icon: IconTimetable, targetTab: 'timetable-generator' },
          { id: 'exam-management', label: 'Exam Management', icon: IconExamManagement, targetTab: 'exam-management' },
          { id: 'live-class', label: 'Live Class', icon: IconLiveClass, targetTab: 'live-class' },
          { id: 'sms', label: 'Sms', icon: IconSms, targetTab: 'sms' },
          { id: 'noticeboard', label: 'Noticeboard', icon: IconNoticeboard, targetTab: 'noticeboard' },
          { id: 'counsellings', label: 'Counsellings', icon: IconCounsellings, targetTab: 'counsellings' },
          { id: 'hostel', label: 'Hostel', icon: IconHostel, targetTab: 'hostel' },
          { id: 'gate-pass', label: 'Gate Pass', icon: IconGatePass, targetTab: 'gate-pass' },
          { id: 'admission', label: 'Admission', icon: IconAdmission, targetTab: 'admission' },
          { id: 'leaderboard', label: 'Leaderboard', icon: IconLeaderboard, targetTab: 'leaderboard' },
          { id: 'settings', label: 'Settings', icon: IconSettings, targetTab: 'settings' },
        ],
        otherTools: [
          { id: 'report-card', label: 'Report Card', icon: IconReportCard, targetTab: 'report-card' }
        ]
      };
  }
}
