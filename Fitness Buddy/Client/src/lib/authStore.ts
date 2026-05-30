// Auth state singleton — OWNER: Marko.
//
// The access token lives ONLY in memory (this module), never in localStorage,
// so an XSS can't read it from storage. The refresh token is an httpOnly cookie
// the server manages — JS never sees it. We do cache the *non-secret* user
// profile (id/email/name/avatar) in localStorage so an offline-first launch can
// show the app immediately without a network round-trip.
//
// Components subscribe via useAuth() (useSyncExternalStore). api.ts reads the
// access token through getAccessToken() and updates the session on refresh.

export type AuthUser = { id: string; email: string; name: string; avatar_url?: string | null };
export type AuthStatus = 'loading' | 'authed' | 'anon';

type State = {
  user: AuthUser | null;
  accessToken: string | null;
  expiresAt: number | null;
  status: AuthStatus;
};

const USER_KEY = 'fb_user';
const LEGACY_KEY = 'fb_auth'; // pre-refactor: stored the whole session incl. refresh token

// One-time migration cleanup: older builds persisted the access AND refresh token
// under `fb_auth`. The new code never reads it — delete it so that sensitive
// token stops lingering in localStorage the moment this build runs.
if (typeof window !== 'undefined') {
  try { localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
}

function readCachedUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
}

// Start in `loading`: on boot we don't yet know if the httpOnly cookie is valid.
// A cached user (if any) is filled in so an offline fallback has something to show.
let state: State = {
  user: readCachedUser(),
  accessToken: null,
  expiresAt: null,
  status: 'loading',
};

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function set(next: Partial<State>) {
  state = { ...state, ...next };
  emit();
}

export function getState(): State {
  return state;
}

export function getAccessToken(): string | null {
  return state.accessToken;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// Tell the IndexedDB-backed stores to re-read — the active per-user database
// changes whenever the session does.
function notifyStores() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('fb_refresh'));
}

export function setSession(user: AuthUser, accessToken: string) {
  try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch { /* private mode */ }
  set({ user, accessToken, expiresAt: Date.now() + 15 * 60_000, status: 'authed' });
  notifyStores();
}

export function clearSession() {
  try { localStorage.removeItem(USER_KEY); } catch { /* private mode */ }
  set({ user: null, accessToken: null, expiresAt: null, status: 'anon' });
  notifyStores();
}

// Boot refresh couldn't reach the server (offline). If we have a cached user,
// let them into the offline-first app; otherwise treat as signed out.
export function markOfflineReady() {
  if (state.user) set({ status: 'authed' });
  else clearSession();
}

// Cross-tab sync: reflect login/logout that happened in another tab.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== USER_KEY) return;
    if (!e.newValue) set({ user: null, accessToken: null, expiresAt: null, status: 'anon' });
    else { try { set({ user: JSON.parse(e.newValue) }); } catch { /* ignore */ } }
  });
}
