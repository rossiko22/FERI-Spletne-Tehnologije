// Initial schema. One migration covers all tables for simplicity — Sladjana
// can split later if a model gains complex columns.

exports.up = async function up(knex) {
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary();
    t.string('email').unique().notNullable();
    t.string('name').notNullable();
    t.string('password_hash');                 // null for OAuth-only users
    t.string('google_id').unique();            // null for password-only users
    t.string('avatar_url');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('habits', (t) => {
    t.uuid('id').primary();
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    t.string('name').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('habit_logs', (t) => {
    t.uuid('id').primary();
    t.uuid('habit_id').references('id').inTable('habits').onDelete('CASCADE');
    t.date('date').notNullable();
    t.timestamps(true, true);
    t.unique(['habit_id', 'date']);
  });

  await knex.schema.createTable('goals', (t) => {
    t.uuid('id').primary();
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    t.string('title').notNullable();
    t.integer('progress').notNullable().defaultTo(0);   // 0..100
    t.date('start_date');
    t.date('deadline');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('workouts', (t) => {
    t.uuid('id').primary();
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    t.string('name').notNullable();
    t.integer('sets').defaultTo(0);
    t.integer('reps').defaultTo(0);
    t.integer('duration_min').defaultTo(0);
    t.date('date').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('meals', (t) => {
    t.uuid('id').primary();
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('kind').notNullable();            // "food" | "drink"
    t.float('amount').defaultTo(0);
    t.string('unit');                          // "kcal" | "g" | "kg" | "ml" | "l"
    t.integer('calories').defaultTo(0);
    t.integer('water_ml').defaultTo(0);
    t.date('date').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('push_subscriptions', (t) => {
    t.uuid('id').primary();
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    t.text('endpoint').notNullable();
    t.string('p256dh').notNullable();
    t.string('auth_key').notNullable();
    t.timestamps(true, true);
    t.unique(['user_id', 'endpoint']);
  });

  await knex.schema.createTable('sync_events', (t) => {
    t.uuid('id').primary();
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    t.string('kind').notNullable();            // create | update | delete
    t.string('entity').notNullable();          // workout | meal | habit | goal | habitLog
    t.json('payload');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('activity_events', (t) => {
    t.uuid('id').primary();
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    t.string('source').notNullable();          // "voice" | "gesture"
    t.string('command').notNullable();         // commandBus CommandId
    t.string('transcript');                    // raw voice phrase or gesture id
    t.timestamps(true, true);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('activity_events');
  await knex.schema.dropTableIfExists('sync_events');
  await knex.schema.dropTableIfExists('push_subscriptions');
  await knex.schema.dropTableIfExists('meals');
  await knex.schema.dropTableIfExists('workouts');
  await knex.schema.dropTableIfExists('goals');
  await knex.schema.dropTableIfExists('habit_logs');
  await knex.schema.dropTableIfExists('habits');
  await knex.schema.dropTableIfExists('users');
};
