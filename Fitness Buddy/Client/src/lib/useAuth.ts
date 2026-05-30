// Auth hook — OWNER: Marko.
//
// Thin React binding over the authStore singleton. The access token is held in
// memory (authStore); the refresh token is an httpOnly cookie the server owns.
// UI consumes `auth.isAuthed`, `auth.status`, `auth.user`, `auth.login()`, etc.

import { useSyncExternalStore } from 'react';

import { auth as authApi, refreshSession } from './api';
import { hydrateUserData } from './hydrate';
import {
  getState,
  subscribe,
  setSession,
  clearSession,
  type AuthUser,
  type AuthStatus,
} from './authStore';

export type { AuthUser, AuthStatus };

export function useAuth() {
  const state = useSyncExternalStore(subscribe, getState, getState);

  const login = async (email: string, password: string) => {
    const r = await authApi.login({ email, password });
    setSession(r.user, r.access);
    void hydrateUserData();
  };

  const register = async (email: string, name: string, password: string) => {
    const r = await authApi.register({ email, name, password });
    setSession(r.user, r.access);
    void hydrateUserData();
  };

  const logout = async () => {
    try { await authApi.logout(); } catch { /* clear locally regardless */ }
    clearSession();
  };

  return {
    user: state.user,
    accessToken: state.accessToken,
    expiresAt: state.expiresAt,
    status: state.status,
    isAuthed: state.status === 'authed',
    login,
    register,
    logout,
    refresh: refreshSession,
  };
}
