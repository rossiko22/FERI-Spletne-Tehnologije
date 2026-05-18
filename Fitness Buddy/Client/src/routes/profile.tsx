// Profile page — OWNER: shared (Marko for auth section, Ana for push+sync toggles).
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Bell, Download, LogOut, RefreshCw, Wifi } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { useSync } from '@/lib/useSync';
import { useNotifications } from '@/lib/useNotifications';
import { PageHeader, Card } from '@/components/ui-bits';
import { getAll } from '@/lib/idb';

export const Route = createFileRoute('/profile')({ component: ProfilePage });

function ProfilePage() {
  const auth = useAuth();
  const sync = useSync();
  const notif = useNotifications();
  const navigate = useNavigate();

  if (!auth.isAuthed) {
    if (typeof window !== 'undefined') setTimeout(() => navigate({ to: '/login' }), 0);
    return null;
  }

  const exportData = async () => {
    const data = {
      user: auth.user,
      workouts: await getAll('workouts'),
      nutrition: await getAll('nutrition'),
      habits: await getAll('habits'),
      habitLogs: await getAll('habitLogs'),
      goals: await getAll('goals'),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `fitnessbuddy-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader eyebrow="Account" title="Profile" sub="OAuth 2.0 session, feature toggles, data export." />

      <Card className="mb-6">
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-full bg-primary text-primary-foreground grid place-items-center font-semibold">
            {auth.user!.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="font-semibold">{auth.user!.name}</div>
            <div className="text-sm text-muted-foreground">{auth.user!.email}</div>
            <div className="mt-2 text-[10px] font-mono text-muted-foreground break-all">access · {auth.accessToken?.slice(0, 32)}…</div>
            <div className="text-[10px] font-mono text-muted-foreground">expires · {auth.expiresAt ? new Date(auth.expiresAt).toLocaleTimeString() : '—'}</div>
          </div>
          <button onClick={auth.refresh} className="text-xs border border-border rounded-md px-3 py-1.5 hover:border-primary inline-flex items-center gap-1.5"><RefreshCw className="size-3" strokeWidth={1.5} /> Refresh token</button>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-2"><Bell className="size-4 text-primary" strokeWidth={1.5} /><span className="font-medium">Push notifications</span></div>
          <div className="text-sm text-muted-foreground mt-2">Permission: {notif.permission} · {notif.subscribed ? 'subscribed' : 'not subscribed'}</div>
          <button onClick={notif.subscribed ? notif.sendTest : notif.enable} className="mt-4 w-full inline-flex items-center justify-center rounded-md border border-border py-1.5 text-xs hover:border-primary">
            {notif.subscribed ? 'Send test push' : notif.permission === 'granted' ? 'Subscribe' : 'Enable notifications'}
          </button>
        </Card>
        <Card>
          <div className="flex items-center gap-2"><Wifi className="size-4 text-primary" strokeWidth={1.5} /><span className="font-medium">Background sync</span></div>
          <div className="text-sm text-muted-foreground mt-2">{sync.pending.length} queued · {sync.state}</div>
          <button onClick={sync.forceSync} className="mt-4 w-full inline-flex items-center justify-center rounded-md border border-border py-1.5 text-xs hover:border-primary">Force sync now</button>
        </Card>
      </div>

      <Card className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium">Export your data</div>
            <div className="text-sm text-muted-foreground">Download every workout, meal, habit and goal as JSON.</div>
          </div>
          <button onClick={exportData} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:border-primary"><Download className="size-4" strokeWidth={1.5} /> Export</button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium">Sign out</div>
            <div className="text-sm text-muted-foreground">Revoke session and clear access token.</div>
          </div>
          <button onClick={async () => { await auth.logout(); navigate({ to: '/login' }); }} className="inline-flex items-center gap-2 rounded-md bg-destructive text-destructive-foreground px-3 py-2 text-sm hover:opacity-90"><LogOut className="size-4" strokeWidth={1.5} /> Sign out</button>
        </div>
      </Card>
    </div>
  );
}
