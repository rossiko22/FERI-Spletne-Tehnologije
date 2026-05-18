import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';

// Sequence-based shortcuts: `g d`, `g w`, `g n`, `g h`, plus ⌘K and `?`.
export function useShortcuts(onPalette: () => void, onHelp: () => void) {
  const navigate = useNavigate();
  useEffect(() => {
    let prefix: string | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); onPalette(); return;
      }
      if (e.key === '?') { e.preventDefault(); onHelp(); return; }
      if (e.key === '/') {
        e.preventDefault();
        const inp = document.querySelector<HTMLInputElement>("input[placeholder*='Search'], input[type='search']");
        inp?.focus(); return;
      }
      if (prefix === 'g') {
        if (e.key === 'd') navigate({ to: '/' });
        else if (e.key === 'w') navigate({ to: '/workouts' });
        else if (e.key === 'n') navigate({ to: '/nutrition' });
        else if (e.key === 'h') navigate({ to: '/habits' });
        prefix = null;
        return;
      }
      if (e.key === 'g') {
        prefix = 'g';
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { prefix = null; }, 900);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, onPalette, onHelp]);
}

export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['g', 'd'], label: 'Go to Dashboard' },
  { keys: ['g', 'w'], label: 'Go to Workouts' },
  { keys: ['g', 'n'], label: 'Go to Nutrition' },
  { keys: ['g', 'h'], label: 'Go to Habits' },
  { keys: ['/'], label: 'Focus search' },
  { keys: ['?'], label: 'Show shortcuts' },
  { keys: ['⌘', 'K'], label: 'Command palette' },
];
