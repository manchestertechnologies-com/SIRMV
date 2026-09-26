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

// 2. Students Icon
export const IconStudents: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <circle cx="22" cy="22" r="8" fill="#FDE68A" stroke="#2B2D42" strokeWidth="2" />
    <path d="M15 18C15 15 18 14 22 14C26 14 29 15 29 18" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M10 42C10 34 15 30 22 30C29 30 34 34 34 42V46H10V42Z" fill="#3B82F6" stroke="#2B2D42" strokeWidth="2" />
    <circle cx="42" cy="24" r="7.5" fill="#FECDD3" stroke="#2B2D42" strokeWidth="2" />
    <path d="M34 20C34 16 38 15 42 15C46 15 50 16 50 20" stroke="#831843" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M32 44C32 37 36 33 42 33C48 33 52 37 52 44V46H32V44Z" fill="#EC4899" stroke="#2B2D42" strokeWidth="2" />
    <rect x="20" y="44" width="24" height="14" rx="3" fill="#10B981" stroke="#065F46" strokeWidth="2" />
    <line x1="32" y1="44" x2="32" y2="58" stroke="#065F46" strokeWidth="2" />
    <path d="M24 48H28M24 52H29M35 48H39M35 52H40" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// 3. Classes Icon
export const IconClasses: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <rect x="10" y="8" width="44" height="34" rx="4" fill="#065F46" stroke="#047857" strokeWidth="2.5" />
    <rect x="14" y="12" width="36" height="26" rx="2" fill="#047857" />
    <path d="M18 20L24 28L34 16L44 26" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="34" cy="16" r="2" fill="#FDE047" />
    <path d="M18 42L12 58M46 42L52 58M32 42V56" stroke="#92400E" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// 4. Batches Icon
export const IconBatches: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <circle cx="32" cy="18" r="6.5" fill="#FDE68A" stroke="#2B2D42" strokeWidth="2" />
    <path d="M22 36C22 30 26 26 32 26C38 26 42 30 42 36V38H22V36Z" fill="#4F46E5" stroke="#2B2D42" strokeWidth="2" />
    <circle cx="16" cy="26" r="5.5" fill="#FED7AA" stroke="#2B2D42" strokeWidth="2" />
    <path d="M8 44C8 39 11 36 16 36C21 36 24 39 24 44V46H8V44Z" fill="#10B981" stroke="#2B2D42" strokeWidth="2" />
    <circle cx="48" cy="26" r="5.5" fill="#FECDD3" stroke="#2B2D42" strokeWidth="2" />
    <path d="M40 44C40 39 43 36 48 36C53 36 56 39 56 44V46H40V44Z" fill="#F59E0B" stroke="#2B2D42" strokeWidth="2" />
    <path d="M16 52H48" stroke="#6366F1" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 3" />
    <circle cx="32" cy="52" r="3" fill="#6366F1" />
  </svg>
);

// 5. Tests / Exams Icon
export const IconTests: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <rect x="8" y="12" width="22" height="22" rx="4" fill="#FEE2E2" stroke="#EF4444" strokeWidth="2" />
    <text x="14" y="28" fill="#EF4444" fontSize="14" fontWeight="bold" fontFamily="sans-serif">A</text>
    <rect x="34" y="12" width="22" height="22" rx="4" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2" />
    <text x="40" y="28" fill="#3B82F6" fontSize="14" fontWeight="bold" fontFamily="sans-serif">B</text>
    <rect x="26" y="32" width="12" height="26" rx="2" transform="rotate(-30 26 32)" fill="#F59E0B" stroke="#B45309" strokeWidth="2" />
    <path d="M38 52L39 58L34 56L38 52Z" fill="#1F2937" />
    <circle cx="16" cy="46" r="5" fill="#10B981" />
    <path d="M14 46L16 48L19 44" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

// 7. Questions Icon
export const IconQuestions: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <rect x="10" y="10" width="20" height="20" rx="4" fill="#FEE2E2" stroke="#EF4444" strokeWidth="2" />
    <text x="16" y="25" fill="#DC2626" fontSize="12" fontWeight="bold" fontFamily="sans-serif">A</text>
    <rect x="34" y="10" width="20" height="20" rx="4" fill="#DCFCE7" stroke="#22C55E" strokeWidth="2" />
    <text x="40" y="25" fill="#16A34A" fontSize="12" fontWeight="bold" fontFamily="sans-serif">B</text>
    <rect x="10" y="34" width="20" height="20" rx="4" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
    <text x="16" y="49" fill="#D97706" fontSize="12" fontWeight="bold" fontFamily="sans-serif">C</text>
    <rect x="34" y="34" width="20" height="20" rx="4" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2" />
    <text x="40" y="49" fill="#2563EB" fontSize="12" fontWeight="bold" fontFamily="sans-serif">D</text>
  </svg>
);

// 8. Reports Icon
export const IconReports: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <rect x="8" y="46" width="50" height="6" rx="2" fill="#374151" />
    <rect x="14" y="34" width="8" height="12" rx="2" fill="#EF4444" />
    <rect x="26" y="24" width="8" height="22" rx="2" fill="#F59E0B" />
    <rect x="38" y="16" width="8" height="30" rx="2" fill="#10B981" />
    <path d="M14 30L26 20L38 12L48 8" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M42 8H48V14" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
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

// 19. Leaderboard Icon
export const IconLeaderboard: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <rect x="22" y="24" width="20" height="32" rx="2" fill="#FBBF24" stroke="#D97706" strokeWidth="2" />
    <text x="30" y="44" fill="#78350F" fontSize="14" fontWeight="bold" fontFamily="sans-serif">1</text>
    <rect x="6" y="34" width="16" height="22" rx="2" fill="#94A3B8" stroke="#475569" strokeWidth="2" />
    <text x="12" y="50" fill="#1E293B" fontSize="12" fontWeight="bold" fontFamily="sans-serif">2</text>
    <rect x="42" y="38" width="16" height="18" rx="2" fill="#F97316" stroke="#C2410C" strokeWidth="2" />
    <text x="48" y="52" fill="#FFFFFF" fontSize="12" fontWeight="bold" fontFamily="sans-serif">3</text>
    <path d="M26 12H38V16C38 19 35 22 32 22C29 22 26 19 26 16V12Z" fill="#FDE047" stroke="#CA8A04" strokeWidth="1.5" />
    <circle cx="32" cy="8" r="2" fill="#F59E0B" />
  </svg>
);

// 20. Settings Icon
export const IconSettings: React.FC<IconProps> = ({ className = 'w-12 h-12', size }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
    <circle cx="32" cy="32" r="16" fill="#F3F4F6" stroke="#4B5563" strokeWidth="3" />
    <circle cx="32" cy="32" r="8" fill="#3B82F6" />
    <path d="M32 8V14M32 50V56M8 32H14M50 32H56M15 15L19 19M45 45L49 49M15 49L19 45M45 19L49 15" stroke="#4B5563" strokeWidth="3.5" strokeLinecap="round" />
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
