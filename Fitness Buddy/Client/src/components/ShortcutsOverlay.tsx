import { SHORTCUTS } from '@/lib/useShortcuts';

export function ShortcutsOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg p-6">
        <div className="text-xs font-mono uppercase tracking-widest text-primary">Help</div>
        <h2 className="mt-1 text-xl font-semibold">Keyboard shortcuts</h2>
        <ul className="mt-5 space-y-2">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd key={k} className="font-mono text-xs border border-border bg-secondary rounded px-1.5 py-0.5">{k}</kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
