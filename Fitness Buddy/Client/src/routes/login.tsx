// Login page — OWNER: Marko.
// Email/password + Google OAuth button. Real flow: posts to /api/auth/login
// (the useAuth hook in @/lib/useAuth handles the request).
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { LogIn, Activity } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { refreshSession } from '@/lib/api';
import { hydrateUserData } from '@/lib/hydrate';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

const ERRORS: Record<string, string> = {
  invalid_credentials: 'Wrong email or password.',
  email_taken: 'An account with that email already exists.',
  validation_failed: 'Please check the form and try again.',
};

const DEMO = { email: 'demo@fitnessbuddy.app', password: 'Demo123!' };

function LoginPage() {
  const auth = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(DEMO.email);
  const [password, setPassword] = useState(DEMO.password);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (auth.isAuthed) nav({ to: '/' }); }, [auth.isAuthed, nav]);

  const isSignup = mode === 'signup';

  const toggleMode = () => {
    setErr(null);
    if (isSignup) {
      setMode('signin');
      setName('');
      setEmail(DEMO.email);
      setPassword(DEMO.password);
    } else {
      setMode('signup');
      setName('');
      setEmail('');
      setPassword('');
    }
  };

  // Google OAuth callback bounces back to /login?oauth=1 with the refresh cookie
  // already set. Exchange it for an in-memory access token, then enter the app.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get('oauth')) return;
    refreshSession().then((ok) => {
      if (ok) { hydrateUserData(); nav({ to: '/' }); }
      else setErr('Google sign-in failed. Please try again.');
    });
  }, [nav]);

  const apiBase = import.meta.env.VITE_API_URL || '/api';

  return (
    <div className="min-h-[70vh] grid place-items-center">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold mb-1">
          <Activity className="size-4 text-primary" strokeWidth={1.5} />
          FitnessBuddy
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSignup ? 'Sign up to start tracking and syncing your progress.' : 'Sign in to sync your progress across devices.'}
        </p>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setErr(null);
            setBusy(true);
            try {
              if (isSignup) await auth.register(email, name, password);
              else await auth.login(email, password);
            } catch (e: any) {
              const code = e?.body?.error;
              setErr(ERRORS[code] || e?.message || (isSignup ? 'Sign up failed' : 'Login failed'));
            } finally {
              setBusy(false);
            }
          }}
          className="mt-6 space-y-3"
        >
          {isSignup && (
            <label className="block">
              <span className="text-xs text-muted-foreground">Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} type="text" required className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary" />
            </label>
          )}
          <label className="block">
            <span className="text-xs text-muted-foreground">Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Password</span>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={isSignup ? 8 : undefined} className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary" />
            {isSignup && <span className="mt-1 block text-[10px] text-muted-foreground">At least 8 characters.</span>}
          </label>
          {err && <div className="text-xs text-destructive">{err}</div>}
          <button type="submit" disabled={busy} className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50">
            <LogIn className="size-4" strokeWidth={1.5} />
            {busy ? (isSignup ? 'Creating account…' : 'Signing in…') : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" onClick={toggleMode} className="font-medium text-primary hover:underline">
            {isSignup ? 'Sign in' : 'Create one'}
          </button>
        </p>

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
