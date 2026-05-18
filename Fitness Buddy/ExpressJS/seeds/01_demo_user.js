// Demo seed: one user + a handful of habits/goals/workouts.
// Run with `npm run seed`. Optional — only useful for local demos.

const bcrypt = require('bcrypt');
const { v4: uuid } = require('uuid');

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

exports.seed = async function seed(knex) {
  await knex('habit_logs').del();
  await knex('habits').del();
  await knex('goals').del();
  await knex('workouts').del();
  await knex('meals').del();
  await knex('users').where('id', DEMO_USER_ID).del();

  const passwordHash = await bcrypt.hash('Demo123!', 12);
  await knex('users').insert({
    id: DEMO_USER_ID,
    email: 'demo@fitnessbuddy.app',
    name: 'Demo',
    password_hash: passwordHash,
  });

  await knex('habits').insert([
    { id: uuid(), user_id: DEMO_USER_ID, name: '8h sleep' },
    { id: uuid(), user_id: DEMO_USER_ID, name: '10k steps' },
    { id: uuid(), user_id: DEMO_USER_ID, name: 'Read 20 min' },
  ]);

  await knex('goals').insert([
    {
      id: uuid(),
      user_id: DEMO_USER_ID,
      title: 'Run a half marathon',
      progress: 35,
      start_date: '2026-04-01',
      deadline: '2026-09-01',
    },
  ]);
};
