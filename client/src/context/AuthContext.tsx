import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch, setAuthToken, removeAuthToken, getAuthToken } from '../services/api';

export type UserRole =
  | 'ADMIN'
  | 'PRINCIPAL'
  | 'HOD'
  | 'TEACHER'
  | 'FLOOR_ATTENDER'
  | 'NON_TEACHING_STAFF'
  | 'GATE_STAFF'
  | 'WARDEN'
  | 'HEAD_WARDEN'
  | 'STUDENT'
  | 'PARENT';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  email?: string;
  phone?: string;
  branch_id: string;
  branch_name?: string;
  branch_code?: string;
  branch_city?: string;
  avatar_url?: string;
  teacher_id?: string;
  student_id?: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  principal_name: string;
}

const DEFAULT_BRANCHES: Branch[] = [
  {
    id: 'br-dvg-01',
    name: 'Davangere Main Campus',
    code: 'DVG-01',
    city: 'Davangere',
    address: 'PB Road, Near Bapuji Dental College, Davangere, Karnataka - 577004',
    phone: '+91 81922 23344',
    email: 'davangere@sirmv.edu.in',
    principal_name: 'Dr. B. N. Vishwanath'
  },
  {
    id: 'br-smg-02',
    name: 'Shivamogga PU Campus',
    code: 'SMG-02',
    city: 'Shivamogga',
    address: 'Sagar Road, Shivamogga, Karnataka - 577201',
    phone: '+91 81822 55667',
    email: 'shivamogga@sirmv.edu.in',
    principal_name: 'Dr. S. K. Hiremath'
  },
  {
    id: 'br-blr-03',
    name: 'Ballari City Campus',
    code: 'BLR-03',
    city: 'Ballari',
    address: 'Cantonment Area, Ballari, Karnataka - 583101',
    phone: '+91 83922 77889',
    email: 'ballari@sirmv.edu.in',
    principal_name: 'Prof. K. Venkatesh'
  }
];

const DEFAULT_USER: User = {
  id: 'usr-admin-01',
  username: 'admin.demo',
  role: 'ADMIN',
  name: 'Aarav Kulkarni',
  email: 'admin.demo@college.test',
  phone: '+91 98450 12345',
  branch_id: 'br-dvg-01',
  branch_name: 'Davangere Main Campus',
  branch_code: 'DVG-01',
  branch_city: 'Davangere'
};

interface AuthContextType {
  user: User | null;
  branches: Branch[];
  currentBranch: Branch | null;
  isLoading: boolean;
  login: (identifier: string, password?: string) => Promise<void>;
  logout: () => void;
  switchBranch: (branchId: string) => void;
  quickSwitchUser: (identifier: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(DEFAULT_USER);
  const [branches, setBranches] = useState<Branch[]>(DEFAULT_BRANCHES);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(DEFAULT_BRANCHES[0]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load branches
  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await apiFetch<{ branches: Branch[] }>('/branches');
        if (res?.branches && res.branches.length > 0) {
          setBranches(res.branches);
          setCurrentBranch(res.branches[0]);
        }
      } catch (err) {
        console.warn('Backend offline or starting, using default campus metadata', err);
      }
    }
    loadBranches();
  }, []);

  // Check initial user from token
  useEffect(() => {
    async function checkAuth() {
      const token = getAuthToken();
      if (!token) {
        return;
      }

      try {
        const res = await apiFetch<{ user: User }>('/auth/me');
        if (res?.user) {
          setUser(res.user);
        }
      } catch (err) {
        console.warn('Session check fallback', err);
      }
    }

    checkAuth();
  }, []);

  // Update current branch based on user
  useEffect(() => {
    if (user && branches.length > 0) {
      const found = branches.find((b) => b.id === user.branch_id) || branches[0];
      setCurrentBranch(found);
    }
  }, [user, branches]);

  const login = async (identifier: string, password: string = 'Demo@12345') => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: identifier, username: identifier, password })
      });
      setAuthToken(res.token);
      setUser(res.user);
    } catch (err) {
      console.error('Login error', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  const switchBranch = (branchId: string) => {
    const b = branches.find((item) => item.id === branchId);
    if (b && user) {
      setCurrentBranch(b);
      setUser({ ...user, branch_id: b.id, branch_name: b.name, branch_code: b.code, branch_city: b.city });
    }
  };

  const quickSwitchUser = async (identifier: string) => {
    try {
      await login(identifier, 'Demo@12345');
    } catch (err) {
      // Fallback local switch if network fails
      const roleMap: Record<string, { role: UserRole; name: string }> = {
        'admin.demo@college.test': { role: 'ADMIN', name: 'Aarav Kulkarni' },
        'principal.demo@college.test': { role: 'PRINCIPAL', name: 'Dr. B. N. Vishwanath' },
        'hod.demo@college.test': { role: 'HOD', name: 'Dr. A. S. Patil' },
        'teacher.demo@college.test': { role: 'TEACHER', name: 'Mr. Anand Kumar' },
        'floor.demo@college.test': { role: 'FLOOR_ATTENDER', name: 'Ramesh Kumar' },
        'staff.demo@college.test': { role: 'NON_TEACHING_STAFF', name: 'Basavarajappa K' },
        'warden.demo@college.test': { role: 'WARDEN', name: 'Chandrashekhar M' },
        'headwarden.demo@college.test': { role: 'HEAD_WARDEN', name: 'Dr. M. S. Siddalingaiah' },
        'student.demo@college.test': { role: 'STUDENT', name: 'Rahul Sharma' },
        'parent.demo@college.test': { role: 'PARENT', name: 'Mr. Rakesh Sharma' }
      };

      const match = roleMap[identifier];
      if (match) {
        setUser({
          ...DEFAULT_USER,
          email: identifier,
          role: match.role,
          name: match.name,
          username: identifier.split('@')[0]
        });
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        branches,
        currentBranch,
        isLoading,
        login,
        logout,
        switchBranch,
        quickSwitchUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
