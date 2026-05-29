// Client/src/components/SyncPill.tsx
import { useSync } from '@/lib/useSync';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';

export function SyncPill() {
  const { state, pending, forceSync, lastSync } = useSync();

  const configs = {
    online: {
      label: 'Online',
      icon: <Cloud className="size-3.5" strokeWidth={1.5} />,
      className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    },
    offline: {
      label: `Offline${pending.length > 0 ? ` · ${pending.length} queued` : ''}`,
      icon: <CloudOff className="size-3.5" strokeWidth={1.5} />,
      className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    },
    syncing: {
      label: 'Syncing…',
      icon: <RefreshCw className="size-3.5 animate-spin" strokeWidth={1.5} />,
      className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    },
  };

  const { label, icon, className } = configs[state];

  return (
    <button
      onClick={() => state === 'online' && forceSync()}
      title={lastSync ? `Last sync: ${new Date(lastSync).toLocaleTimeString()}` : 'Not synced yet'}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${className} ${state === 'online' ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
    >
      {icon}
      {label}
    </button>
  );
}
