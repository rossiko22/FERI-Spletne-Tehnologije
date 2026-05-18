import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';

type Action = { id: string; label: string; hint?: string; run: () => void };

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const actions: Action[] = useMemo(() => [
    { id: 'n-dash', label: 'Go to Dashboard', hint: 'g d', run: () => navigate({ to: '/' }) },
    { id: 'n-work', label: 'Go to Workouts', hint: 'g w', run: () => navigate({ to: '/workouts' }) },
    { id: 'n-nutr', label: 'Go to Nutrition', hint: 'g n', run: () => navigate({ to: '/nutrition' }) },
    { id: 'n-hab', label: 'Go to Habits', hint: 'g h', run: () => navigate({ to: '/habits' }) },
    { id: 'n-goal', label: 'Go to Goals', run: () => navigate({ to: '/goals' }) },
    { id: 'n-prof', label: 'Go to Profile', run: () => navigate({ to: '/profile' }) },
    { id: 'n-ctrl', label: 'Go to Controls', run: () => navigate({ to: '/controls' }) },
    { id: 'log-water', label: 'Log +250ml water', run: () => window.dispatchEvent(new CustomEvent('fb_cmd', { detail: 'log-water' })) },
    { id: 'new-workout', label: 'New workout', run: () => navigate({ to: '/workouts' }) },
  ], [navigate]);

  const filtered = actions.filter((a) => a.label.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => { if (open) setQ(''); }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm grid place-items-start pt-24" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg mx-auto bg-card border border-border rounded-xl shadow-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="size-4 text-muted-foreground" strokeWidth={1.5} />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a command…" className="flex-1 bg-transparent outline-none text-sm" />
          <kbd className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-1">
          {filtered.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => { a.run(); onClose(); }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-secondary text-left"
              >
                <span>{a.label}</span>
                {a.hint && <span className="font-mono text-xs text-muted-foreground">{a.hint}</span>}
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="px-3 py-6 text-center text-xs text-muted-foreground">No matches</li>}
        </ul>
      </div>
    </div>
  );
}
