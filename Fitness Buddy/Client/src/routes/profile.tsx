
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Bell, BellOff, Download, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { useSync } from '@/lib/useSync';
import { useNotifications } from '@/lib/useNotifications';
import { PageHeader, Card } from '@/components/ui-bits';
import { getAll } from '@/lib/idb';

export const Route = createFileRoute('/profile')({ component: ProfilePage });

function ProfilePage() {
  const auth = useAuth();
  const { state, pending, forceSync } = useSync();
  const { supported, subscribed, loading, subscribe, unsubscribe, sendTest } = useNotifications();
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

      <div className="rounded-lg border border-border bg-card p-4 space-y-4 mb-6">
        <h3 className="font-semibold text-sm">Sync & Notifications</h3>

        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">Data sync</div>
            <div className="text-xs text-muted-foreground">
              {pending.length > 0 ? `${pending.length} events waiting` : 'All synced'}
            </div>
          </div>
          <button
            onClick={forceSync}
            disabled={state === 'syncing'}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${state === 'syncing' ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            Force sync
          </button>
        </div>

        {supported && (
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">Push notifications</div>
              <div className="text-xs text-muted-foreground">
                {subscribed ? 'Active — tap to test' : 'Disabled'}
              </div>
            </div>
            <div className="flex gap-2">
              {subscribed ? (
                <>
                  <button
                    onClick={sendTest}
                    className="inline-flex items-center gap-2 border border-border rounded-md px-3 py-1.5 text-sm hover:border-primary"
                  >
                    <Bell className="size-4" strokeWidth={1.5} /> Test
                  </button>
                  <button
                    onClick={unsubscribe}
                    disabled={loading}
                    className="inline-flex items-center gap-2 border border-destructive text-destructive rounded-md px-3 py-1.5 text-sm hover:opacity-80 disabled:opacity-50"
                  >
                    <BellOff className="size-4" strokeWidth={1.5} /> Unsubscribe
                  </button>
                </>
              ) : (
                <button
                  onClick={subscribe}
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  <Bell className="size-4" strokeWidth={1.5} />
                  {loading ? 'Enabling…' : 'Enable notifications'}
                </button>
              )}
            </div>
          </div>
        )}
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
