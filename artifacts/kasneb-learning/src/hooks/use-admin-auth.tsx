import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { adminLogin, adminLogout, fetchCurrentAdmin, type AdminAccount } from '@/lib/admin-auth';

interface AdminAuthValue {
  admin: AdminAccount | null;
  status: 'loading' | 'signed-in' | 'signed-out';
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminAccount | null>(null);
  const [status, setStatus] = useState<'loading' | 'signed-in' | 'signed-out'>('loading');

  const refresh = useCallback(async () => {
    const current = await fetchCurrentAdmin();
    setAdmin(current);
    setStatus(current ? 'signed-in' : 'signed-out');
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { admin: signedIn } = await adminLogin(email, password);
    setAdmin(signedIn);
    setStatus('signed-in');
  }, []);

  const logout = useCallback(async () => {
    await adminLogout();
    setAdmin(null);
    setStatus('signed-out');
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, status, login, logout, refresh }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthValue {
  const value = useContext(AdminAuthContext);
  if (!value) {
    throw new Error('useAdminAuth must be used inside <AdminAuthProvider>');
  }
  return value;
}
