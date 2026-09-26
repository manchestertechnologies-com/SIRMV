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
  | 'PARENT'
  | 'EXAM_DEPARTMENT';

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
    id: 'branch-smg',
    name: 'SIR MV PU College - Shivamogga',
    code: 'SIRMV-SMG',
    city: 'Shivamogga',
    address: 'Jail Road, Tilak Nagar, Shivamogga, Karnataka 577201',
    phone: '08182-278901',
    email: 'info.smg@sirmv.edu.in',
    principal_name: 'College Principal'
  }
];

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
  const [user, setUser] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>(DEFAULT_BRANCHES);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(DEFAULT_BRANCHES[0]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load branches
  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await apiFetch<{ branches: Branch[] }>('/branches');
        if (res?.branches && res.branches.length > 0) {
          const shivamogga = res.branches.find((b) => b.code === 'SMG-02' || b.city === 'Shivamogga') || res.branches[0];
          setBranches([shivamogga]);
          setCurrentBranch(shivamogga);
        }
      } catch (err) {
        // Fallback
        setBranches(DEFAULT_BRANCHES);
        setCurrentBranch(DEFAULT_BRANCHES[0]);
      }
    }
    loadBranches();
  }, []);

  // Check initial user from token
  useEffect(() => {
    async function checkAuth() {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await apiFetch<{ user: User }>('/auth/me');
        if (res?.user) {
          setUser(res.user);
        }
      } catch (err) {
        removeAuthToken();
        setUser(null);
      } finally {
        setIsLoading(false);
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

  const login = async (identifier: string, password: string = '123456') => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: identifier, username: identifier, password })
      });
      setAuthToken(res.token);
      setUser(res.user);
    } catch (err) {
      // Fallback demo login if network/backend is waking up
      const roleMap: Record<string, { role: UserRole; name: string }> = {
        'admin@sirmv.edu.in': { role: 'ADMIN', name: 'Campus Administrator' },
        'principal@sirmv.edu.in': { role: 'PRINCIPAL', name: 'College Principal' },
        'hod.physics@sirmv.edu.in': { role: 'HOD', name: 'HOD - Department of Physics' },
        'lecturer@sirmv.edu.in': { role: 'TEACHER', name: 'Senior Faculty Lecturer' },
        'attender@sirmv.edu.in': { role: 'FLOOR_ATTENDER', name: 'Floor Operations Staff' },
        'staff@sirmv.edu.in': { role: 'NON_TEACHING_STAFF', name: 'Administrative Staff' },
        'warden@sirmv.edu.in': { role: 'WARDEN', name: 'Hostel Block Warden' },
        'headwarden@sirmv.edu.in': { role: 'HEAD_WARDEN', name: 'Chief Warden' },
        'student@sirmv.edu.in': { role: 'STUDENT', name: 'Student Portal Account' },
        'parent@sirmv.edu.in': { role: 'PARENT', name: 'Parent Portal Account' },
        'examdept@sirmv.edu.in': { role: 'EXAM_DEPARTMENT', name: 'Exam Department Officer' }
      };

      const match = roleMap[identifier] || roleMap[`${identifier}@sirmv.edu.in`];
      if (match && (password === '123456' || password === 'Demo@12345')) {
        const fallbackUser: User = {
          id: 'usr-local-' + identifier.replace(/[^a-z0-9]/gi, ''),
          username: identifier.split('@')[0],
          role: match.role,
          name: match.name,
          email: identifier.includes('@') ? identifier : `${identifier}@sirmv.edu.in`,
          phone: '+91 81822 55667',
          branch_id: 'branch-smg',
          branch_name: 'SIR MV PU College - Shivamogga',
          branch_code: 'SIRMV-SMG',
          branch_city: 'Shivamogga'
        };
        setUser(fallbackUser);
        setAuthToken('sirmv_demo_token_shivamogga');
        return;
      }

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
    const b = branches.find((item) => item.id === branchId) || DEFAULT_BRANCHES[0];
    if (b && user) {
      setCurrentBranch(b);
      setUser({ ...user, branch_id: b.id, branch_name: b.name, branch_code: b.code, branch_city: b.city });
    }
  };

  const quickSwitchUser = async (identifier: string) => {
    await login(identifier, '123456');
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
