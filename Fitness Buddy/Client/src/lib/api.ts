// Thin fetch wrapper that talks to the Express server.
// Adds the JWT access token, parses JSON, throws on non-2xx responses.

const BASE = import.meta.env.VITE_API_URL || '/api';

function getAccessToken(): string | null {
  try {
    const raw = localStorage.getItem('fb_auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.accessToken ?? null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  constructor(public status: number, public body: any) {
    super(body?.error || `HTTP ${status}`);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export const api = {
  get:    <T>(p: string)        => request<T>(p),
  post:   <T>(p: string, b?: any) => request<T>(p, { method: 'POST',   body: JSON.stringify(b ?? {}) }),
  put:    <T>(p: string, b?: any) => request<T>(p, { method: 'PUT',    body: JSON.stringify(b ?? {}) }),
  delete: <T>(p: string)        => request<T>(p, { method: 'DELETE' }),
};

// --- Typed endpoint helpers — each owner can extend their section ---

// Auth (Marko)
export const auth = {
  register: (data: { email: string; name: string; password: string }) =>
    api.post<{ user: any; access: string; refresh: string }>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<{ user: any; access: string; refresh: string }>('/auth/login', data),
  refresh: (refresh: string) => api.post<{ access: string }>('/auth/refresh', { refresh }),
  logout: () => api.post<{ ok: true }>('/auth/logout'),
  me: () => api.get<{ user: any }>('/auth/me'),
};

// Habits (Sladja)
export const habits = {
  list: () => api.get<{ items: any[] }>('/habits'),
  create: (name: string) => api.post<any>('/habits', { name }),
  remove: (id: string) => api.delete<{ ok: true }>(`/habits/${id}`),
  toggleLog: (id: string, date?: string) =>
    api.post<{ ticked: boolean }>(`/habits/${id}/logs`, { date }),
  listLogs: (date?: string) =>
    api.get<{ items: any[] }>(`/habits/logs${date ? `?date=${date}` : ''}`),
};

// Goals (Sladja)
export const goals = {
  list: () => api.get<{ items: any[] }>('/goals'),
  create: (data: { title: string; startDate?: string; deadline?: string; progress?: number }) =>
    api.post<any>('/goals', data),
  update: (id: string, patch: any) => api.put<any>(`/goals/${id}`, patch),
  remove: (id: string) => api.delete<{ ok: true }>(`/goals/${id}`),
};

// Workouts (Sladja)
export const workouts = {
  list: (date?: string) => api.get<{ items: any[] }>(`/workouts${date ? `?date=${date}` : ''}`),
  create: (data: any) => api.post<any>('/workouts', data),
  remove: (id: string) => api.delete<{ ok: true }>(`/workouts/${id}`),
};

// Nutrition (Sladja)
export const nutrition = {
  list: (date?: string) => api.get<{ items: any[] }>(`/nutrition${date ? `?date=${date}` : ''}`),
  create: (data: any) => api.post<any>('/nutrition', data),
  remove: (id: string) => api.delete<{ ok: true }>(`/nutrition/${id}`),
};

// Sync (Ana)
export const sync = {
  drain: (events: any[]) =>
    api.post<{ results: Array<{ id: string; status: string; error?: string }> }>('/sync/drain', { events }),
};

// Notifications (Ana)
export const notifications = {
  publicKey: () => api.get<{ publicKey: string | null }>('/notifications/public-key'),
  subscribe: (sub: PushSubscriptionJSON) => api.post<{ ok: true }>('/notifications/subscribe', sub),
  unsubscribe: () => api.post<{ ok: true }>('/notifications/unsubscribe'),
  test: () => api.post<{ ok: true }>('/notifications/test'),
  send: (data: { title: string; body: string }) =>
  api.post<{ ok: true }>('/notifications/send', data),
};

// Activity log (Marko)
export const activity = {
  log: (data: { source: 'voice' | 'gesture'; command: string; transcript?: string }) =>
    api.post<any>('/activity', data),
};
