import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Activity, Command, Keyboard, Bell } from 'lucide-react';
import { Toaster } from 'sonner';

import { VoicePanel } from '@/components/VoicePanel';
import { VisionPanel } from '@/components/VisionPanel';
import { SyncPill } from '@/components/SyncPill';
import { CommandPalette } from '@/components/CommandPalette';
import { ShortcutsOverlay } from '@/components/ShortcutsOverlay';
import { useShortcuts } from '@/lib/useShortcuts';
import { useAuth } from '@/lib/useAuth';

const NAV = [
  { to: '/',           label: 'Today' },
  { to: '/workouts',   label: 'Workouts' },
  { to: '/nutrition',  label: 'Nutrition' },
  { to: '/habits',     label: 'Habits' },
  { to: '/goals',      label: 'Goals' },
  { to: '/controls',   label: 'Controls' },
  { to: '/profile',    label: 'Profile' },
] as const;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something broke</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Retry</button>
      </div>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();
  useShortcuts(() => setPalette(true), () => setHelp(true));

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { setPalette(false); setHelp(false); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    const cycle = (e: Event) => {
      const dir = (e as CustomEvent<number>).detail ?? 1;
      const idx = NAV.findIndex((n) => n.to === window.location.pathname);
      const next = NAV[((idx === -1 ? 0 : idx) + dir + NAV.length) % NAV.length];
      navigate({ to: next.to });
    };
    window.addEventListener('fb_nav_cycle', cycle);
    return () => window.removeEventListener('fb_nav_cycle', cycle);
  }, [navigate]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-border sticky top-0 z-40 backdrop-blur bg-background/80">
          <div className="mx-auto max-w-[1280px] px-6 h-14 flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Activity className="size-4 text-primary" strokeWidth={1.5} />
              FitnessBuddy
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  activeOptions={{ exact: n.to === '/' }}
                  className="px-3 py-1.5 text-sm text-muted-foreground rounded-md hover:text-foreground transition-colors"
                  activeProps={{ className: 'px-3 py-1.5 text-sm rounded-md text-foreground bg-secondary' }}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <button onClick={() => setPalette(true)} title="Command palette (⌘K)" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-md px-2 py-1 hover:border-primary">
                <Command className="size-3" strokeWidth={1.5} /> <span className="hidden sm:inline">K</span>
              </button>
              <button onClick={() => setHelp(true)} title="Shortcuts (?)" className="text-muted-foreground hover:text-foreground p-1.5">
                <Keyboard className="size-4" strokeWidth={1.5} />
              </button>
              <button title="Notifications" className="relative text-muted-foreground hover:text-foreground p-1.5">
                <Bell className="size-4" strokeWidth={1.5} />
                <span className="absolute top-1 right-1 size-1.5 rounded-full bg-[var(--warning)]" />
              </button>
              <SyncPill />
              {auth.isAuthed ? (
                <button
                  onClick={() => navigate({ to: '/profile' })}
                  title={auth.user!.email}
                  className="size-7 rounded-full bg-primary text-primary-foreground text-xs font-semibold grid place-items-center"
                >
                  {auth.user!.name[0]?.toUpperCase()}
                </button>
              ) : (
                <Link to="/login" className="text-xs border border-border rounded-md px-2 py-1 hover:border-primary">Sign in</Link>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-[1280px] px-6 py-10">
          <Outlet />
        </main>
        <footer className="border-t border-border">
          <div className="mx-auto max-w-[1280px] px-6 py-6 text-xs text-muted-foreground flex justify-between">
            <span>FitnessBuddy · offline-first · Ana · Sladjana · Marko</span>
            <span className="font-mono">v0.1</span>
          </div>
        </footer>
        <VoicePanel />
        <VisionPanel />
        <CommandPalette open={palette} onClose={() => setPalette(false)} />
        <ShortcutsOverlay open={help} onClose={() => setHelp(false)} />
        <Toaster position="top-center" />
      </div>
    </QueryClientProvider>
  );
}
