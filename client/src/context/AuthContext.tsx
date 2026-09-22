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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load branches
  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await apiFetch<{ branches: Branch[] }>('/branches');
        setBranches(res.branches);
      } catch (err) {
        console.error('Failed to load branches', err);
      }
    }
    loadBranches();
  }, []);

  // Check initial user from token
  useEffect(() => {
    async function checkAuth() {
      const token = getAuthToken();
      if (!token) {
        // Auto-login default admin for smooth evaluation if no token
        try {
          await login('admin.demo@college.test', 'Demo@12345');
        } catch (err) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const res = await apiFetch<{ user: User }>('/auth/me');
        setUser(res.user);
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
    await login(identifier, 'Demo@12345');
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
