// Client glue for the Azure-powered voice features. OWNER: Marko.
// Sends the spoken transcript to /api/ai/parse, writes the structured result to
// Postgres via the REST endpoints (per-user), then re-hydrates the local cache so
// the UI updates. Online-only — the VoicePanel disables these while offline.

import { ai, workouts as workoutsApi, nutrition as nutritionApi } from './api';
import { hydrateUserData } from './hydrate';

const today = () => new Date().toISOString().slice(0, 10);

// Parse a spoken phrase and log it. Returns a short confirmation to speak back.
export async function aiLog(transcript: string): Promise<string> {
  const { intent, fields } = await ai.parse(transcript);

  if (intent === 'workout') {
    const name = fields.name || 'Workout';
    const sets = Number(fields.sets) || 0;
    const reps = Number(fields.reps) || 0;
    const duration = Number(fields.duration) || 0;
    await workoutsApi.create({ name, sets, reps, duration, date: today() });
    await hydrateUserData();
    return `Logged workout: ${name}, ${sets} sets of ${reps}, ${duration} minutes.`;
  }

  if (intent === 'food') {
    const name = fields.name || 'Food';
    const amount = Number(fields.amount) || 0;
    const unit = fields.unit || 'g';
    const calories = Number(fields.calories) || 0;
    await nutritionApi.create({ name, kind: 'food', amount, unit, calories, water: 0, date: today() });
    await hydrateUserData();
    return `Logged food: ${name}, ${calories} calories.`;
  }

  // drink
  const name = fields.name || 'Drink';
  const amount = Number(fields.amount) || 0;
  const unit = fields.unit || 'ml';
  const water = Number(fields.water) || 0;
  await nutritionApi.create({ name, kind: 'drink', amount, unit, calories: 0, water, date: today() });
  await hydrateUserData();
  return `Logged drink: ${name}, ${water} milliliters.`;
}

// Fetch the Postgres-computed, AI-phrased daily summary to speak back.
export async function aiSummary(): Promise<string> {
  const { text } = await ai.summary();
  return text;
}
