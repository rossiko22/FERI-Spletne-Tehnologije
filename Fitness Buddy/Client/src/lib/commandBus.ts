// Central command bus — every voice phrase and gesture funnels through here.
// Also POSTs to /api/activity so the server can derive per-user stats.
// OWNER: Marko (vision/voice). Sladja can extend the entity-handling sections.

import { getAll, put, remove, uid, type StoreName } from './idb';
import { toast } from 'sonner';
import { activity } from './api';

const todayISO = () => new Date().toISOString().slice(0, 10);

export type CommandId =
  | 'log-water'
  | 'log-workout-quick'
  | 'tick-first-habit'
  | 'bump-first-goal'
  | 'delete-last-meal'
  | 'toggle-rest-timer'
  | 'next-tab'
  | 'prev-tab'
  | 'confirm';

async function addRow<T extends { id: string }>(store: StoreName, value: Omit<T, 'id'>) {
  const row = { ...value, id: uid() } as T;
  await put(store, row);
  return row;
}

function notifyChange() {
  window.dispatchEvent(new Event('fb_refresh'));
}

export async function runCommand(cmd: CommandId, opts: { source?: 'voice' | 'gesture'; transcript?: string } = {}): Promise<void> {
  // Fire-and-forget audit log to the server. Errors are swallowed so the
  // command still works offline.
  activity.log({ source: opts.source ?? 'voice', command: cmd, transcript: opts.transcript }).catch(() => {});

  switch (cmd) {
    case 'log-water': {
      await addRow('nutrition', { name: 'Quick water', kind: 'drink', amount: 250, unit: 'ml', calories: 0, water: 250, date: todayISO() });
      toast.success('+250 ml water logged');
      break;
    }
    case 'log-workout-quick': {
      await addRow('workouts', { name: 'Quick set', sets: 1, reps: 10, duration: 5, date: todayISO() });
      toast.success('Quick workout set logged');
      break;
    }
    case 'tick-first-habit': {
      const habits = await getAll<{ id: string; name: string }>('habits');
      if (!habits.length) { toast.info('No habits yet — add one first'); break; }
      const t = todayISO();
      const logs = await getAll<{ id: string; habitId: string; date: string }>('habitLogs');
      const target = habits[0];
      const existing = logs.find((l) => l.habitId === target.id && l.date === t);
      if (existing) { await remove('habitLogs', existing.id); toast(`Unticked "${target.name}"`); }
      else { await addRow('habitLogs', { habitId: target.id, date: t }); toast.success(`Ticked "${target.name}" for today`); }
      break;
    }
    case 'bump-first-goal': {
      const goals = await getAll<any>('goals');
      const g = goals.find((x) => (x.progress ?? 0) < 100);
      if (!g) { toast.info('No active goals'); break; }
      const next = Math.min(100, (g.progress ?? 0) + 10);
      await put('goals', { ...g, progress: next });
      toast.success(`${g.title}: ${next}%`);
      break;
    }
    case 'delete-last-meal': {
      const meals = await getAll<{ id: string; name: string }>('nutrition');
      if (!meals.length) { toast.info('Nothing to delete'); break; }
      const last = meals[meals.length - 1];
      await remove('nutrition', last.id);
      toast(`Deleted "${last.name}"`);
      break;
    }
    case 'toggle-rest-timer': {
      window.dispatchEvent(new Event('fb_rest_toggle'));
      toast('Rest timer toggled');
      break;
    }
    case 'next-tab':
    case 'prev-tab': {
      window.dispatchEvent(new CustomEvent('fb_nav_cycle', { detail: cmd === 'next-tab' ? 1 : -1 }));
      break;
    }
    case 'confirm': {
      window.dispatchEvent(new Event('fb_confirm'));
      toast('Confirmed');
      break;
    }
  }
  notifyChange();
}
