// Dedicated Postgres connection for AUTH only (the `users` table — login/signup).
// OWNER: Marko.
//
// The rest of the app stays on SQLite (config/db.js). The User model is bound to
// this pool, so only authentication data is persisted to Postgres. Credentials
// come from the root .env (POSTGRES_*), the same file docker compose reads.

const Knex = require('knex');
const bcrypt = require('bcrypt');

const authKnex = Knex({
  client: 'pg',
  connection: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT) || 5432,
    database: process.env.POSTGRES_DB || 'fitnessbuddy',
    user: process.env.POSTGRES_USER || 'fitnessbuddy',
    password: process.env.POSTGRES_PASSWORD || '',
  },
  pool: { min: 1, max: 5 },
});

// Matches the SQLite seed id so the demo account's existing SQLite data lines up.
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

// Ensures the users table exists and the demo account is present. Called once at
// server startup. Idempotent — safe to run on every boot.
async function initAuthDb() {
  const hasUsers = await authKnex.schema.hasTable('users');
  if (!hasUsers) {
    await authKnex.schema.createTable('users', (t) => {
      t.uuid('id').primary();
      t.string('email').unique().notNullable();
      t.string('name').notNullable();
      t.string('password_hash');   // null for OAuth-only users
      t.string('google_id').unique();
      t.string('avatar_url');
      t.timestamps(true, true);
    });
  }

  const demo = await authKnex('users').where({ id: DEMO_USER_ID }).first();
  if (!demo) {
    await authKnex('users').insert({
      id: DEMO_USER_ID,
      email: 'demo@fitnessbuddy.app',
      name: 'Demo',
      password_hash: await bcrypt.hash('Demo123!', 12),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return authKnex;
}

module.exports = { authKnex, initAuthDb };
