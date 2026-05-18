// Login page — OWNER: Marko.
// Email/password + Google OAuth button. Real flow: posts to /api/auth/login
// (the useAuth hook in @/lib/useAuth handles the request).
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { LogIn, Activity } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const auth = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('demo@fitnessbuddy.app');
  const [password, setPassword] = useState('Demo123!');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (auth.isAuthed) nav({ to: '/' }); }, [auth.isAuthed, nav]);

  // If the Google OAuth callback redirected here with tokens in the query, store them.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const access = params.get('access');
    const refresh = params.get('refresh');
    if (access && refresh) {
      // TODO (Marko): also fetch /api/auth/me to populate user details
      localStorage.setItem('fb_auth', JSON.stringify({
        user: { id: 'oauth', name: 'Google user', email: '' },
        accessToken: access,
        refreshToken: refresh,
        expiresAt: Date.now() + 15 * 60_000,
      }));
      window.dispatchEvent(new Event('fb_auth_change'));
      nav({ to: '/' });
    }
  }, [nav]);

  const apiBase = import.meta.env.VITE_API_URL || '/api';

  return (
    <div className="min-h-[70vh] grid place-items-center">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold mb-1">
          <Activity className="size-4 text-primary" strokeWidth={1.5} />
          FitnessBuddy
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to sync your progress across devices.</p>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setErr(null);
            setBusy(true);
            try {
              await auth.login(email, password);
            } catch (e: any) {
              setErr(e?.body?.error || e?.message || 'Login failed');
            } finally {
              setBusy(false);
            }
          }}
          className="mt-6 space-y-3"
        >
          <label className="block">
            <span className="text-xs text-muted-foreground">Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Password</span>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
          {err && <div className="text-xs text-destructive">{err}</div>}
          <button type="submit" disabled={busy} className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50">
            <LogIn className="size-4" strokeWidth={1.5} /> {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>

        <a
          href={`${apiBase}/auth/google`}
          className="block text-center w-full border border-border rounded-md py-2 text-sm hover:border-primary"
        >
          Continue with Google
        </a>

        <div className="mt-6 pt-4 border-t border-border text-[10px] font-mono text-muted-foreground">
          OAuth 2.0 · JWT access (15 min) + refresh (7 d).
        </div>
      </div>
    </div>
  );
}
