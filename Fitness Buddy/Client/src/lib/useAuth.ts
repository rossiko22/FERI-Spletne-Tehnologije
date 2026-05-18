// Auth hook — OWNER: Marko.
//
// Calls /api/auth/* and stores tokens in localStorage. UI components consume
// `auth.isAuthed`, `auth.user`, `auth.login()`, `auth.logout()`, etc.

import { useEffect, useState } from 'react';
import { auth as authApi, ApiError } from './api';

export type AuthUser = { id: string; email: string; name: string; avatar_url?: string | null };
type Stored = { user: AuthUser; accessToken: string; refreshToken: string; expiresAt: number };

const KEY = 'fb_auth';

function read(): Stored | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}

function write(v: Stored | null) {
  if (typeof window === 'undefined') return;
  if (v) localStorage.setItem(KEY, JSON.stringify(v));
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event('fb_auth_change'));
}

export function useAuth() {
  const [state, setState] = useState<Stored | null>(null);

  useEffect(() => {
    setState(read());
    const sync = () => setState(read());
    window.addEventListener('fb_auth_change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('fb_auth_change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const r = await authApi.login({ email, password });
      write({
        user: r.user,
        accessToken: r.access,
        refreshToken: r.refresh,
        expiresAt: Date.now() + 15 * 60_000,
      });
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw err;
    }
  };

  const register = async (email: string, name: string, password: string) => {
    const r = await authApi.register({ email, name, password });
    write({
      user: r.user,
      accessToken: r.access,
      refreshToken: r.refresh,
      expiresAt: Date.now() + 15 * 60_000,
    });
  };

  // TEMP for prototype browsing — Marko: remove once login is wired.
  const loginDemo = () => login('demo@fitnessbuddy.app', 'Demo123!');

  const logout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    write(null);
  };

  const refresh = async () => {
    const cur = read();
    if (!cur) return;
    try {
      const r = await authApi.refresh(cur.refreshToken);
      write({ ...cur, accessToken: r.access, expiresAt: Date.now() + 15 * 60_000 });
    } catch {
      write(null);
    }
  };

  return { ...state, isAuthed: !!state, login, register, loginDemo, logout, refresh };
}
