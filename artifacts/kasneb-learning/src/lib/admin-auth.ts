// Admin session + team management. Session identity travels as an
// httpOnly cookie set by the server on login/accept-invite, so every
// call here just needs credentials: 'include'.

export type AdminRole = 'owner' | 'admin';
export type AdminAccountStatus = 'active' | 'invited';

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: AdminAccountStatus;
  createdAt: string;
}

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  return fetch(`/api/admin/auth${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  }).then((res) => handle<T>(res));
}

export const adminLogin = (email: string, password: string) =>
  authFetch<{ token: string; admin: AdminAccount }>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const adminLogout = () => authFetch<void>('/logout', { method: 'POST' });

// Resolves to the signed-in admin, or null if there is no valid session
// (never throws for the "not signed in" case, so callers can treat it
// as a normal piece of state rather than an error).
export async function fetchCurrentAdmin(): Promise<AdminAccount | null> {
  const response = await fetch('/api/admin/auth/me', { credentials: 'include' });
  if (response.status === 401) return null;
  return handle<AdminAccount>(response);
}

export const acceptAdminInvite = (token: string, password: string) =>
  authFetch<{ token: string; admin: AdminAccount }>('/accept-invite', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });

// ---------- Owner-only team management ----------

export const inviteAdmin = (name: string, email: string) =>
  authFetch<AdminAccount & { inviteToken: string }>('/invite', {
    method: 'POST',
    body: JSON.stringify({ name, email }),
  });

export const listAdminAccounts = () => authFetch<AdminAccount[]>('/admins');

export const removeAdminAccount = (adminId: string) =>
  authFetch<void>(`/admins/${adminId}`, { method: 'DELETE' });
