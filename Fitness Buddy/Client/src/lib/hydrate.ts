// Pull the logged-in user's data from Postgres into the local IndexedDB cache.
// Called whenever a session is established (login, register, OAuth, boot restore).
// Maps server column names to the client store shapes. Offline / failed requests
// are swallowed so the existing local cache is kept untouched.

import { clear, put } from './idb';
import { workouts, habits, goals, nutrition } from './api';

async function replaceStore(store: Parameters<typeof clear>[0], items: any[]) {
  await clear(store);
  for (const it of items) await put(store, it);
}

export async function hydrateUserData(): Promise<void> {
  try {
    const [w, h, g, n, hl] = await Promise.all([
      workouts.list(),
      habits.list(),
      goals.list(),
      nutrition.list(),
      habits.listLogs(),
    ]);

    await replaceStore('workouts', w.items.map((s: any) => ({
      id: s.id, name: s.name, sets: s.sets, reps: s.reps, duration: s.duration_min, date: s.date,
    })));
    await replaceStore('habits', h.items.map((s: any) => ({ id: s.id, name: s.name })));
    await replaceStore('goals', g.items.map((s: any) => ({
      id: s.id, title: s.title, progress: s.progress, startDate: s.start_date, deadline: s.deadline,
    })));
    await replaceStore('nutrition', n.items.map((s: any) => ({
      id: s.id, name: s.name, kind: s.kind, amount: s.amount, unit: s.unit,
      calories: s.calories, water: s.water_ml, date: s.date,
    })));
    await replaceStore('habitLogs', hl.items.map((s: any) => ({
      id: s.id, habitId: s.habit_id, date: s.date,
    })));

    window.dispatchEvent(new Event('fb_refresh'));
  } catch {
    // offline or request failed — keep whatever is cached locally
  }
}
