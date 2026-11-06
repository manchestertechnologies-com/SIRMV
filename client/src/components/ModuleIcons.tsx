import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// 1. Staffs / Teachers Icon
export const IconStaffs: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <rect x="8" y="10" width="48" height="30" rx="4" fill="#FDF2E9" stroke="#E07A5F" strokeWidth="2.5" />
    <path d="M14 20H26M14 26H22" stroke="#E07A5F" strokeWidth="2" strokeLinecap="round" />
    <circle cx="44" cy="22" r="7" fill="#F4A261" stroke="#2B2D42" strokeWidth="2" />
    <path d="M38 18C38 16 41 15 44 15C47 15 50 16 50 18" stroke="#2B2D42" strokeWidth="2" strokeLinecap="round" />
    <path d="M34 38C34 31 38 28 44 28C50 28 54 31 54 38V40H34V38Z" fill="#3D5A80" stroke="#2B2D42" strokeWidth="2" />
    <rect x="4" y="40" width="56" height="14" rx="3" fill="#DDA15E" stroke="#BC6C25" strokeWidth="2.5" />
    <rect x="10" y="44" width="12" height="6" rx="1.5" fill="#FEFAE0" stroke="#BC6C25" strokeWidth="1.5" />
    <rect x="42" y="44" width="12" height="6" rx="1.5" fill="#FEFAE0" stroke="#BC6C25" strokeWidth="1.5" />
  </svg>
);





// 6. Board Marks Icon
export const IconBoardMarks: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <rect x="14" y="8" width="36" height="48" rx="4" fill="#FFFFFF" stroke="#374151" strokeWidth="2.5" />
    <rect x="24" y="5" width="16" height="6" rx="2" fill="#E5E7EB" stroke="#374151" strokeWidth="2" />
    <line x1="20" y1="18" x2="44" y2="18" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
    <line x1="20" y1="26" x2="36" y2="26" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
    <line x1="20" y1="34" x2="40" y2="34" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
    <circle cx="38" cy="42" r="9" fill="#EF4444" stroke="#B91C1C" strokeWidth="2" />
    <text x="32" y="46" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="sans-serif">A+</text>
  </svg>
);



// 9. Attendance Icon
export const IconAttendance: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <rect x="8" y="12" width="48" height="44" rx="6" fill="#FFFFFF" stroke="#374151" strokeWidth="2.5" />
    <rect x="8" y="12" width="48" height="14" rx="6" fill="#EF4444" />
    <circle cx="18" cy="8" r="3" fill="#374151" />
    <circle cx="46" cy="8" r="3" fill="#374151" />
    <circle cx="18" cy="34" r="2.5" fill="#9CA3AF" />
    <circle cx="28" cy="34" r="2.5" fill="#9CA3AF" />
    <circle cx="38" cy="34" r="2.5" fill="#9CA3AF" />
    <circle cx="48" cy="34" r="2.5" fill="#9CA3AF" />
    <circle cx="36" cy="44" r="10" fill="#10B981" stroke="#047857" strokeWidth="2" />
    <path d="M31 44L34 47L41 40" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 10. Fee Icon
export const IconFee: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <circle cx="32" cy="20" r="14" fill="#FBBF24" stroke="#D97706" strokeWidth="2.5" />
    <text x="26" y="26" fill="#78350F" fontSize="16" fontWeight="bold" fontFamily="sans-serif">₹</text>
    <path d="M12 46C12 42 18 40 26 40H38C46 40 52 42 52 46V54H12V46Z" fill="#F4A261" stroke="#BC6C25" strokeWidth="2" />
    <rect x="22" y="44" width="20" height="6" rx="2" fill="#E76F51" />
  </svg>
);

// 11. Timetable Icon
export const IconTimetable: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <rect x="8" y="10" width="48" height="46" rx="6" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="2.5" />
    <rect x="8" y="10" width="48" height="12" rx="6" fill="#3B82F6" />
    <line x1="8" y1="34" x2="56" y2="34" stroke="#BFDBFE" strokeWidth="2" />
    <line x1="8" y1="46" x2="56" y2="46" stroke="#BFDBFE" strokeWidth="2" />
    <line x1="24" y1="22" x2="24" y2="56" stroke="#BFDBFE" strokeWidth="2" />
    <line x1="40" y1="22" x2="40" y2="56" stroke="#BFDBFE" strokeWidth="2" />
    <rect x="26" y="24" width="12" height="8" rx="2" fill="#F59E0B" />
    <rect x="10" y="36" width="12" height="8" rx="2" fill="#10B981" />
    <rect x="42" y="48" width="12" height="6" rx="2" fill="#EC4899" />
  </svg>
);

// 12. Live Class Icon
export const IconLiveClass: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <rect x="8" y="10" width="48" height="34" rx="5" fill="#1E293B" stroke="#0F172A" strokeWidth="2.5" />
    <rect x="12" y="14" width="40" height="26" rx="3" fill="#334155" />
    <rect x="20" y="20" width="16" height="12" rx="2" fill="#EF4444" />
    <polygon points="36,23 44,18 44,32 36,27" fill="#EF4444" />
    <circle cx="16" cy="18" r="2" fill="#22C55E" />
    <path d="M26 44H38M32 44V52M20 52H44" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// 13. SMS Icon
export const IconSms: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <rect x="14" y="6" width="36" height="52" rx="6" fill="#0EA5E9" stroke="#0284C7" strokeWidth="2.5" />
    <rect x="18" y="12" width="28" height="38" rx="3" fill="#E0F2FE" />
    <rect x="21" y="20" width="22" height="14" rx="4" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5" />
    <text x="24" y="30" fill="#78350F" fontSize="8" fontWeight="bold" fontFamily="sans-serif">SMS</text>
    <circle cx="32" cy="53" r="2" fill="#FFFFFF" />
  </svg>
);

// 14. Noticeboard Icon
export const IconNoticeboard: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <rect x="6" y="8" width="52" height="44" rx="4" fill="#DDA15E" stroke="#9A3412" strokeWidth="3" />
    <rect x="10" y="12" width="44" height="36" rx="2" fill="#BC6C25" />
    <rect x="14" y="16" width="14" height="14" rx="1.5" fill="#FEF08A" />
    <circle cx="21" cy="18" r="1.5" fill="#EF4444" />
    <rect x="34" y="18" width="16" height="12" rx="1.5" fill="#BFDBFE" />
    <circle cx="42" cy="20" r="1.5" fill="#3B82F6" />
    <rect x="20" y="32" width="20" height="12" rx="1.5" fill="#BBF7D0" />
    <circle cx="30" cy="34" r="1.5" fill="#10B981" />
  </svg>
);

// 15. Counsellings Icon
export const IconCounsellings: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <circle cx="18" cy="20" r="6" fill="#FCA5A5" stroke="#374151" strokeWidth="2" />
    <path d="M10 38C10 32 14 28 18 28C22 28 26 32 26 38V42H10V38Z" fill="#3B82F6" stroke="#374151" strokeWidth="2" />
    <circle cx="46" cy="20" r="6" fill="#FED7AA" stroke="#374151" strokeWidth="2" />
    <path d="M38 38C38 32 42 28 46 28C50 28 54 32 54 38V42H38V38Z" fill="#10B981" stroke="#374151" strokeWidth="2" />
    <path d="M26 14C26 10 32 8 38 10C42 12 40 16 36 17L34 20L32 17C28 17 26 16 26 14Z" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1.5" />
    <rect x="6" y="42" width="52" height="12" rx="2" fill="#E5E7EB" stroke="#374151" strokeWidth="2" />
  </svg>
);

// 16. Hostel Icon
export const IconHostel: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <rect x="8" y="8" width="5" height="48" rx="2" fill="#92400E" />
    <rect x="51" y="8" width="5" height="48" rx="2" fill="#92400E" />
    <rect x="13" y="16" width="38" height="6" rx="2" fill="#3B82F6" />
    <rect x="13" y="12" width="10" height="4" rx="2" fill="#DBEAFE" />
    <rect x="13" y="38" width="38" height="6" rx="2" fill="#10B981" />
    <rect x="13" y="34" width="10" height="4" rx="2" fill="#D1FAE5" />
    <line x1="42" y1="16" x2="42" y2="44" stroke="#B45309" strokeWidth="2.5" />
    <line x1="42" y1="24" x2="51" y2="24" stroke="#B45309" strokeWidth="2" />
    <line x1="42" y1="32" x2="51" y2="32" stroke="#B45309" strokeWidth="2" />
  </svg>
);

// 17. Gate Pass Icon
export const IconGatePass: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <circle cx="20" cy="22" r="7" fill="#FCA5A5" stroke="#1F2937" strokeWidth="2" />
    <path d="M10 40C10 33 14 30 20 30C26 30 30 33 30 40V44H10V40Z" fill="#F97316" stroke="#1F2937" strokeWidth="2" />
    <circle cx="36" cy="26" r="6" fill="#FED7AA" stroke="#1F2937" strokeWidth="2" />
    <path d="M28 44C28 38 32 35 36 35C40 35 44 38 44 44V46H28V44Z" fill="#3B82F6" stroke="#1F2937" strokeWidth="2" />
    <path d="M46 16L56 12V26C56 34 46 40 46 40C46 40 36 34 36 26V12L46 16Z" fill="#10B981" stroke="#065F46" strokeWidth="2" />
    <path d="M42 24L45 27L50 20" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 18. Admission Icon
export const IconAdmission: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <rect x="8" y="18" width="48" height="34" rx="4" fill="#0EA5E9" stroke="#0369A1" strokeWidth="2.5" />
    <path d="M8 22L32 38L56 22" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="18" y="8" width="28" height="20" rx="2" fill="#FEF08A" stroke="#CA8A04" strokeWidth="2" />
    <line x1="22" y1="14" x2="38" y2="14" stroke="#CA8A04" strokeWidth="1.5" />
    <line x1="22" y1="18" x2="34" y2="18" stroke="#CA8A04" strokeWidth="1.5" />
  </svg>
);



// 21. Report Card Icon
export const IconReportCard: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <rect x="8" y="10" width="48" height="44" rx="5" fill="#FEF3C7" stroke="#D97706" strokeWidth="2.5" />
    <rect x="14" y="16" width="36" height="32" rx="3" fill="#FFFFFF" />
    <rect x="18" y="20" width="12" height="14" rx="2" fill="#60A5FA" />
    <circle cx="24" cy="25" r="3" fill="#FEF08A" />
    <line x1="33" y1="22" x2="46" y2="22" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
    <line x1="33" y1="27" x2="44" y2="27" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
    <line x1="18" y1="39" x2="46" y2="39" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
    <circle cx="44" cy="42" r="7" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
    <polygon points="44,38 46,43 51,43 47,46 49,51 44,48 39,51 41,46 37,43 42,43" fill="#FFFFFF" />
  </svg>
);

// 22. Substitution Radar Icon
export const IconSubstitution: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <circle cx="18" cy="22" r="7" fill="#FCA5A5" stroke="#DC2626" strokeWidth="2" />
    <path d="M10 40C10 34 14 30 18 30C22 30 26 34 26 40V42H10V40Z" fill="#EF4444" />
    <circle cx="46" cy="22" r="7" fill="#86EFAC" stroke="#16A34A" strokeWidth="2" />
    <path d="M38 40C38 34 42 30 46 30C50 30 54 34 54 40V42H38V40Z" fill="#10B981" />
    <path d="M22 48H42M42 48L36 43M42 48L36 53" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M42 56H22M22 56L28 51M22 56L28 61" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 23. Floor Attender Ops Icon
export const IconFloorAttender: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <rect x="10" y="8" width="44" height="48" rx="6" fill="#F3F4F6" stroke="#4B5563" strokeWidth="2.5" />
    <rect x="16" y="14" width="14" height="10" rx="2" fill="#3B82F6" />
    <rect x="34" y="14" width="14" height="10" rx="2" fill="#10B981" />
    <rect x="16" y="28" width="14" height="10" rx="2" fill="#F59E0B" />
    <rect x="34" y="28" width="14" height="10" rx="2" fill="#EF4444" />
    <rect x="22" y="44" width="20" height="12" rx="2" fill="#4B5563" />
    <circle cx="38" cy="50" r="1.5" fill="#FCD34D" />
  </svg>
);

// 24. 1-Page Lecture Record Icon
export const IconLectureDossier: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <rect x="12" y="6" width="40" height="52" rx="5" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2.5" />
    <rect x="18" y="12" width="28" height="6" rx="2" fill="#F59E0B" />
    <line x1="18" y1="24" x2="46" y2="24" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
    <line x1="18" y1="30" x2="38" y2="30" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
    <circle cx="32" cy="44" r="8" fill="#10B981" />
    <path d="M28 44L31 47L36 41" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 25. Missed Class Videos Icon
export const IconMissedClass: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <rect x="6" y="12" width="52" height="40" rx="8" fill="#FEE2E2" stroke="#EF4444" strokeWidth="2.5" />
    <polygon points="26,24 44,32 26,40" fill="#EF4444" />
    <circle cx="48" cy="18" r="4" fill="#10B981" />
  </svg>
);

// 26. Evening Study Icon
export const IconEveningStudy: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <circle cx="32" cy="32" r="26" fill="#1E1B4B" stroke="#4338CA" strokeWidth="2.5" />
    <path d="M42 22C42 30 36 36 28 36C25 36 22 35 20 33C22 39 28 44 35 44C43 44 49 38 49 30C49 26 47 23 42 22Z" fill="#FDE047" />
    <rect x="18" y="44" width="28" height="6" rx="2" fill="#93C5FD" />
    <path d="M24 44L28 36H32" stroke="#FDE047" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 27. Security Audit Logs Icon
export const IconAuditLogs: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <path d="M32 6L48 12V28C48 40 32 54 32 54C32 54 16 40 16 28V12L32 6Z" fill="#EEF2FF" stroke="#4F46E5" strokeWidth="2.5" />
    <circle cx="32" cy="28" r="8" fill="#4F46E5" />
    <path d="M32 24V28L35 30" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 28. General Dashboard Icon
export const IconDashboard: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <rect x="8" y="8" width="20" height="20" rx="5" fill="#EEF2FF" stroke="#4F46E5" strokeWidth="2.5" />
    <rect x="12" y="12" width="12" height="12" rx="3" fill="#4F46E5" />
    <rect x="36" y="8" width="20" height="20" rx="5" fill="#ECFDF5" stroke="#10B981" strokeWidth="2.5" />
    <rect x="40" y="12" width="12" height="12" rx="3" fill="#10B981" />
    <rect x="8" y="36" width="20" height="20" rx="5" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2.5" />
    <rect x="12" y="40" width="12" height="12" rx="3" fill="#F59E0B" />
    <rect x="36" y="36" width="20" height="20" rx="5" fill="#FEE2E2" stroke="#EF4444" strokeWidth="2.5" />
    <rect x="40" y="40" width="12" height="12" rx="3" fill="#EF4444" />
  </svg>
);

// Backward compatibility alias
export const IconTeachers = IconStaffs;

// Exam Management Icon — a seating hall with rows of desks and a board.
export const IconExamManagement: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <rect x="8" y="8" width="48" height="48" rx="6" fill="#F5F3FF" stroke="#7C3AED" strokeWidth="2.5" />
    <rect x="16" y="14" width="32" height="6" rx="2" fill="#7C3AED" />
    <rect x="14" y="28" width="10" height="6" rx="1.5" fill="#A78BFA" />
    <rect x="27" y="28" width="10" height="6" rx="1.5" fill="#A78BFA" />
    <rect x="40" y="28" width="10" height="6" rx="1.5" fill="#A78BFA" />
    <rect x="14" y="40" width="10" height="6" rx="1.5" fill="#C4B5FD" />
    <rect x="27" y="40" width="10" height="6" rx="1.5" fill="#C4B5FD" />
    <rect x="40" y="40" width="10" height="6" rx="1.5" fill="#C4B5FD" />
  </svg>
);


// ---- Icons that were previously plain line icons; redrawn in the same coloured, outlined style ----
export const IconCalendar: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <rect x="8" y="12" width="48" height="44" rx="7" fill="#FFFFFF" stroke="#2B2D42" strokeWidth="2.5" />
    <path d="M8 26V19a7 7 0 0 1 7-7h34a7 7 0 0 1 7 7v7H8Z" fill="#EF4444" stroke="#2B2D42" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M20 7v10M44 7v10" stroke="#2B2D42" strokeWidth="3" strokeLinecap="round" />
    <rect x="16" y="33" width="8" height="7" rx="2" fill="#F59E0B" />
    <rect x="28" y="33" width="8" height="7" rx="2" fill="#10B981" />
    <rect x="40" y="33" width="8" height="7" rx="2" fill="#3B82F6" />
    <rect x="16" y="44" width="8" height="7" rx="2" fill="#8B5CF6" />
    <rect x="28" y="44" width="8" height="7" rx="2" fill="#EC4899" />
  </svg>
);

export const IconDiscipline: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <path d="M32 6 54 14v18c0 14-10 22-22 26C20 54 10 46 10 32V14L32 6Z" fill="#F87171" stroke="#2B2D42" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M32 6 54 14v18c0 14-10 22-22 26V6Z" fill="#EF4444" opacity="0.55" />
    <path d="M32 20v15" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" />
    <circle cx="32" cy="43" r="3" fill="#FFFFFF" />
  </svg>
);

export const IconIssues: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <g transform="rotate(45 32 32)">
      <rect x="27.5" y="20" width="9" height="38" rx="4.5" fill="#94A3B8" stroke="#2B2D42" strokeWidth="2.5" />
      <circle cx="32" cy="16" r="11" fill="#FBBF24" stroke="#2B2D42" strokeWidth="2.5" />
      <rect x="28.5" y="2" width="7" height="12" fill="#FFFFFF" />
      <path d="M28.5 3.5v10.5M35.5 3.5v10.5" stroke="#2B2D42" strokeWidth="2.5" />
    </g>
  </svg>
);

export const IconNotifications: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <path d="M32 9c-10 0-14 8-14 18v7l-6 8h40l-6-8v-7c0-10-4-18-14-18Z" fill="#FBBF24" stroke="#2B2D42" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M26 46a6 6 0 0 0 12 0" fill="#EF4444" stroke="#2B2D42" strokeWidth="2.5" strokeLinejoin="round" />
    <circle cx="32" cy="8" r="2.5" fill="#2B2D42" />
    <circle cx="47" cy="14" r="6" fill="#EF4444" stroke="#2B2D42" strokeWidth="2" />
  </svg>
);

export const IconProfile: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <path d="M10 57c0-14 9-21 22-21s22 7 22 21H10Z" fill="#3B82F6" stroke="#2B2D42" strokeWidth="2.5" strokeLinejoin="round" />
    <circle cx="32" cy="22" r="11" fill="#FDE68A" stroke="#2B2D42" strokeWidth="2.5" />
    <path d="M22 19c2-6 9-8 14-5 3 1 5 3 6 5" stroke="#2B2D42" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M28 40l4 6 4-6" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconStudents: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size} strokeLinejoin="round" strokeLinecap="round">
    <path d="M10 24C10 10 34 10 34 24V37H10Z" fill="#F2905C" stroke="#2B2D42" strokeWidth="2.2" />
    <path d="M9 47C9 38 14 35 22 35C30 35 35 38 35 47V50H9Z" fill="#FFFFFF" stroke="#2B2D42" strokeWidth="2.2" />
    <path d="M17 35L22 42L27 35" fill="#2B4C9B" stroke="#2B2D42" strokeWidth="1.8" />
    <ellipse cx="22" cy="26" rx="8" ry="9" fill="#FFD9BC" stroke="#2B2D42" strokeWidth="2.2" />
    <path d="M14 24C15 15 29 15 30 24C26 20 18 20 14 24Z" fill="#F2905C" stroke="#2B2D42" strokeWidth="2" />
    <circle cx="19" cy="27" r="1.3" fill="#2B2D42" /><circle cx="25" cy="27" r="1.3" fill="#2B2D42" />
    <path d="M19.5 31C21 32.5 23 32.5 24.5 31" stroke="#2B2D42" strokeWidth="1.5" />
    <path d="M30 47C30 38 35 35 43 35C51 35 56 38 56 47V50H30Z" fill="#2B4C9B" stroke="#2B2D42" strokeWidth="2.2" />
    <path d="M38 35L43 42L48 35" fill="#FFFFFF" stroke="#2B2D42" strokeWidth="1.8" />
    <ellipse cx="43" cy="26" rx="8" ry="9" fill="#FFD9BC" stroke="#2B2D42" strokeWidth="2.2" />
    <path d="M34 25C33 13 53 13 52 25C50 20 46 19 43 19C39 19 36 21 34 25Z" fill="#8B5A3C" stroke="#2B2D42" strokeWidth="2" />
    <circle cx="40" cy="27" r="1.3" fill="#2B2D42" /><circle cx="46" cy="27" r="1.3" fill="#2B2D42" />
    <path d="M40.5 31C42 32.5 44 32.5 45.5 31" stroke="#2B2D42" strokeWidth="1.5" />
    <rect x="5" y="46" width="54" height="13" rx="3" fill="#D98B4A" stroke="#2B2D42" strokeWidth="2.2" />
    <rect x="5" y="46" width="54" height="4.5" rx="2" fill="#F2B56B" stroke="#2B2D42" strokeWidth="2.2" />
  </svg>
);

export const IconClasses: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size} strokeLinejoin="round" strokeLinecap="round">
    <rect x="24" y="5" width="36" height="28" rx="2.5" fill="#FFFFFF" stroke="#2B2D42" strokeWidth="2.2" />
    <rect x="38" y="24" width="5" height="6" fill="#F59E0B" stroke="#2B2D42" strokeWidth="1.5" />
    <rect x="45" y="19" width="5" height="11" fill="#EF4444" stroke="#2B2D42" strokeWidth="1.5" />
    <rect x="52" y="13" width="5" height="17" fill="#22C55E" stroke="#2B2D42" strokeWidth="1.5" />
    <path d="M28 20L36 14L42 16L55 8" stroke="#2B2D42" strokeWidth="1.8" />
    <rect x="5" y="22" width="15" height="19" rx="4" fill="#EF6B7A" stroke="#2B2D42" strokeWidth="2.2" />
    <circle cx="12.5" cy="13" r="6" fill="#FFD9BC" stroke="#2B2D42" strokeWidth="2.2" />
    <path d="M6.5 12C7 6 18 6 18.5 12C16 10 9 10 6.5 12Z" fill="#7A4A2B" stroke="#2B2D42" strokeWidth="1.6" />
    <path d="M19 27L30 21" stroke="#2B2D42" strokeWidth="6" />
    <path d="M19 27L30 21" stroke="#FFD9BC" strokeWidth="3" />
    <rect x="6" y="41" width="6" height="16" rx="2" fill="#F6C177" stroke="#2B2D42" strokeWidth="2.2" />
    <rect x="13" y="41" width="6" height="16" rx="2" fill="#F6C177" stroke="#2B2D42" strokeWidth="2.2" />
    <circle cx="32" cy="46" r="4" fill="#FFD9BC" stroke="#2B2D42" strokeWidth="1.8" /><path d="M26 56a6 6 0 0 1 12 0Z" fill="#38BDF8" stroke="#2B2D42" strokeWidth="1.8" />
    <circle cx="43" cy="46" r="4" fill="#FFD9BC" stroke="#2B2D42" strokeWidth="1.8" /><path d="M37 56a6 6 0 0 1 12 0Z" fill="#FBBF24" stroke="#2B2D42" strokeWidth="1.8" />
    <circle cx="54" cy="46" r="4" fill="#FFD9BC" stroke="#2B2D42" strokeWidth="1.8" /><path d="M48 56a6 6 0 0 1 12 0Z" fill="#34D399" stroke="#2B2D42" strokeWidth="1.8" />
  </svg>
);

export const IconBatches: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size} strokeLinejoin="round" strokeLinecap="round">
    <path d="M32 24V30M24 40L28 36M40 40L36 36" stroke="#2B2D42" strokeWidth="2.2" />
    <path d="M23 27C23 18 27 16 32 16C37 16 41 18 41 27Z" fill="#F59E0B" stroke="#2B2D42" strokeWidth="2" />
    <circle cx="32" cy="10" r="5.5" fill="#FFD9BC" stroke="#2B2D42" strokeWidth="2" />
    <path d="M26.5 9C27 3 37 3 37.5 9C34 7 30 7 26.5 9Z" fill="#3B2A20" stroke="#2B2D42" strokeWidth="1.5" />
    <path d="M4 60C4 51 8 49 13 49C18 49 22 51 22 60Z" fill="#EF4444" stroke="#2B2D42" strokeWidth="2" />
    <circle cx="13" cy="43" r="5.5" fill="#FFD9BC" stroke="#2B2D42" strokeWidth="2" />
    <path d="M7.5 42C8 36 18 36 18.5 42C15 40 11 40 7.5 42Z" fill="#7A4A2B" stroke="#2B2D42" strokeWidth="1.5" />
    <path d="M42 60C42 51 46 49 51 49C56 49 60 51 60 60Z" fill="#3B82F6" stroke="#2B2D42" strokeWidth="2" />
    <circle cx="51" cy="43" r="5.5" fill="#FFD9BC" stroke="#2B2D42" strokeWidth="2" />
    <path d="M45.5 42C46 36 56 36 56.5 42C53 40 49 40 45.5 42Z" fill="#3B2A20" stroke="#2B2D42" strokeWidth="1.5" />
    <circle cx="32" cy="35" r="6.5" fill="#22C55E" stroke="#2B2D42" strokeWidth="2.2" />
    <path d="M28.7 35.2L31 37.5L35.5 32.8" stroke="#FFFFFF" strokeWidth="2.2" />
  </svg>
);

export const IconTests: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size} strokeLinejoin="round" strokeLinecap="round">
    <path d="M6 10a5 5 0 0 1 5-5h12a5 5 0 0 1 5 5v9a5 5 0 0 1-5 5h-3l-4 5v-5h-5a5 5 0 0 1-5-5Z" fill="#FBBF24" stroke="#2B2D42" strokeWidth="2.2" />
    <text x="17" y="19.5" textAnchor="middle" fontSize="12" fontWeight="800" fontFamily="Poppins, Inter, Arial, sans-serif" fill="#2B2D42">A</text>
    <path d="M58 11a5 5 0 0 0-5-5H41a5 5 0 0 0-5 5v9a5 5 0 0 0 5 5h3l4 5v-5h5a5 5 0 0 0 5-5Z" fill="#3B82F6" stroke="#2B2D42" strokeWidth="2.2" />
    <text x="47" y="20.5" textAnchor="middle" fontSize="12" fontWeight="800" fontFamily="Poppins, Inter, Arial, sans-serif" fill="#FFFFFF">B</text>
    <path d="M6 41a5 5 0 0 1 5-5h12a5 5 0 0 1 5 5v9a5 5 0 0 1-5 5h-3l-4 5v-5h-5a5 5 0 0 1-5-5Z" fill="#CBD5E1" stroke="#2B2D42" strokeWidth="2.2" />
    <text x="17" y="50.5" textAnchor="middle" fontSize="12" fontWeight="800" fontFamily="Poppins, Inter, Arial, sans-serif" fill="#2B2D42">C</text>
    <g transform="rotate(14 36 44)">
      <rect x="32" y="31" width="8" height="19" rx="2" fill="#94A3B8" stroke="#2B2D42" strokeWidth="2.2" />
      <path d="M32 50H40L36 58Z" fill="#FDE68A" stroke="#2B2D42" strokeWidth="2" />
      <rect x="31" y="40" width="14" height="12" rx="3" fill="#E2E8F0" stroke="#2B2D42" strokeWidth="2" opacity="0" />
    </g>
    <rect x="46" y="36" width="10" height="14" rx="2.5" fill="#34D399" stroke="#2B2D42" strokeWidth="2.2" />
  </svg>
);

export const IconQuestions: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size} strokeLinejoin="round" strokeLinecap="round">
    <rect x="3" y="8" width="14" height="14" rx="3.5" fill="#EC4899" stroke="#2B2D42" strokeWidth="2.2" />
    <text x="10" y="19" textAnchor="middle" fontSize="10" fontWeight="800" fontFamily="Poppins, Inter, Arial, sans-serif" fill="#FFFFFF">A</text>
    <path d="M21 12H27M21 18H25" stroke="#2B2D42" strokeWidth="2" />
    <rect x="3" y="36" width="14" height="14" rx="3.5" fill="#FBBF24" stroke="#2B2D42" strokeWidth="2.2" />
    <text x="10" y="47" textAnchor="middle" fontSize="10" fontWeight="800" fontFamily="Poppins, Inter, Arial, sans-serif" fill="#2B2D42">B</text>
    <path d="M21 40H27M21 46H25" stroke="#2B2D42" strokeWidth="2" />
    <rect x="37" y="8" width="14" height="14" rx="3.5" fill="#86EFAC" stroke="#2B2D42" strokeWidth="2.2" />
    <text x="44" y="19" textAnchor="middle" fontSize="10" fontWeight="800" fontFamily="Poppins, Inter, Arial, sans-serif" fill="#2B2D42">C</text>
    <path d="M55 12H61M55 18H59" stroke="#2B2D42" strokeWidth="2" />
    <rect x="37" y="36" width="14" height="14" rx="3.5" fill="#38BDF8" stroke="#2B2D42" strokeWidth="2.2" />
    <text x="44" y="47" textAnchor="middle" fontSize="10" fontWeight="800" fontFamily="Poppins, Inter, Arial, sans-serif" fill="#FFFFFF">D</text>
    <path d="M55 40H61M55 46H59" stroke="#2B2D42" strokeWidth="2" />
  </svg>
);

export const IconReports: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size} strokeLinejoin="round" strokeLinecap="round">
    <rect x="7" y="38" width="9" height="16" rx="1.5" fill="#334155" stroke="#2B2D42" strokeWidth="2" />
    <rect x="18" y="34" width="9" height="20" rx="1.5" fill="#38BDF8" stroke="#2B2D42" strokeWidth="2" />
    <rect x="29" y="24" width="9" height="30" rx="1.5" fill="#22C55E" stroke="#2B2D42" strokeWidth="2" />
    <rect x="40" y="29" width="9" height="25" rx="1.5" fill="#F59E0B" stroke="#2B2D42" strokeWidth="2" />
    <rect x="51" y="16" width="9" height="38" rx="1.5" fill="#EF4444" stroke="#2B2D42" strokeWidth="2" />
    <path d="M11 30L22 24L33 14L44 20L55 8" stroke="#2B2D42" strokeWidth="2" />
    <g fill="#FFFFFF" stroke="#2B2D42" strokeWidth="1.8"><circle cx="11" cy="30" r="2.4"/><circle cx="22" cy="24" r="2.4"/><circle cx="33" cy="14" r="2.4"/><circle cx="44" cy="20" r="2.4"/><circle cx="55" cy="8" r="2.4"/></g>
    <path d="M4 57H61" stroke="#2B2D42" strokeWidth="3" />
  </svg>
);

export const IconLeaderboard: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size} strokeLinejoin="round" strokeLinecap="round">
    <path d="M24 5H40V15C40 21 36.5 25 32 25C27.5 25 24 21 24 15Z" fill="#FBBF24" stroke="#2B2D42" strokeWidth="2.2" />
    <path d="M24 8H19C19 14 21 17 24 17M40 8H45C45 14 43 17 40 17" stroke="#2B2D42" strokeWidth="2.2" />
    <rect x="29.5" y="25" width="5" height="4" fill="#F59E0B" stroke="#2B2D42" strokeWidth="1.8" />
    <rect x="26" y="29" width="12" height="3.5" rx="1" fill="#F59E0B" stroke="#2B2D42" strokeWidth="1.8" />
    <rect x="5" y="40" width="18" height="17" rx="2" fill="#5EEAD4" stroke="#2B2D42" strokeWidth="2.2" />
    <text x="14" y="53" textAnchor="middle" fontSize="12" fontWeight="800" fontFamily="Poppins, Inter, Arial, sans-serif" fill="#2B2D42">2</text>
    <rect x="23" y="33" width="18" height="24" rx="2" fill="#EF4444" stroke="#2B2D42" strokeWidth="2.2" />
    <text x="32" y="50" textAnchor="middle" fontSize="13" fontWeight="800" fontFamily="Poppins, Inter, Arial, sans-serif" fill="#FFFFFF">1</text>
    <rect x="41" y="44" width="18" height="13" rx="2" fill="#7DD3FC" stroke="#2B2D42" strokeWidth="2.2" />
    <text x="50" y="55" textAnchor="middle" fontSize="12" fontWeight="800" fontFamily="Poppins, Inter, Arial, sans-serif" fill="#2B2D42">3</text>
  </svg>
);

export const IconSettings: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size} strokeLinejoin="round" strokeLinecap="round">
    <rect x="28" y="3" width="8" height="11" rx="2.5" fill="#94A3B8" stroke="#2B2D42" strokeWidth="2.2" transform="rotate(0 32 32)" />
    <rect x="28" y="3" width="8" height="11" rx="2.5" fill="#94A3B8" stroke="#2B2D42" strokeWidth="2.2" transform="rotate(45 32 32)" />
    <rect x="28" y="3" width="8" height="11" rx="2.5" fill="#94A3B8" stroke="#2B2D42" strokeWidth="2.2" transform="rotate(90 32 32)" />
    <rect x="28" y="3" width="8" height="11" rx="2.5" fill="#94A3B8" stroke="#2B2D42" strokeWidth="2.2" transform="rotate(135 32 32)" />
    <circle cx="32" cy="32" r="19" fill="#94A3B8" stroke="#2B2D42" strokeWidth="2.2" />
    <circle cx="32" cy="32" r="12.5" fill="#E2E8F0" stroke="#2B2D42" strokeWidth="2.2" />
    <path d="M23 43C23 36 27 34.5 32 34.5C37 34.5 41 36 41 43C38 45.5 26 45.5 23 43Z" fill="#3B82F6" stroke="#2B2D42" strokeWidth="1.8" />
    <circle cx="32" cy="28" r="5" fill="#FFD9BC" stroke="#2B2D42" strokeWidth="1.8" />
    <path d="M27 27C27.5 22 36.5 22 37 27C35 25.5 29 25.5 27 27Z" fill="#3B2A20" stroke="#2B2D42" strokeWidth="1.4" />
  </svg>
);
