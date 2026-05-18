import { Loader2, Wifi, WifiOff } from 'lucide-react';
import { useSync } from '@/lib/useSync';

export function SyncPill() {
  const { state, pending } = useSync();
  if (state === 'syncing')
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border border-[var(--info)] text-[var(--info)] bg-[var(--info-bg)]">
        <Loader2 className="size-3 animate-spin" strokeWidth={1.5} /> Syncing · {pending.length}
      </span>
    );
  if (state === 'offline')
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border border-[var(--warning)] text-[var(--warning)] bg-[var(--warning-bg)]">
        <WifiOff className="size-3" strokeWidth={1.5} /> Offline · {pending.length}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border border-[var(--success)] text-[var(--success)] bg-[var(--success-bg)]">
      <Wifi className="size-3" strokeWidth={1.5} /> Online
    </span>
  );
}
