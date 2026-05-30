exports.up = async function(knex) {
  // sync_events
  const hasSyncEvents = await knex.schema.hasTable('sync_events');
  if (!hasSyncEvents) {
    await knex.schema.createTable('sync_events', (t) => {
      t.uuid('id').primary();
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      t.string('kind').notNullable();
      t.string('entity').notNullable();
      t.json('payload');
      t.timestamps(true, true);
    });
  }

  // push_subscriptions
  const hasPushSubs = await knex.schema.hasTable('push_subscriptions');
  if (!hasPushSubs) {
    await knex.schema.createTable('push_subscriptions', (t) => {
      t.uuid('id').primary();
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      t.text('endpoint').notNullable();
      t.string('p256dh').notNullable();
      t.string('auth_key').notNullable();
      t.timestamps(true, true);
      t.unique(['user_id', 'endpoint']);
    });
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('sync_events');
  await knex.schema.dropTableIfExists('push_subscriptions');
};