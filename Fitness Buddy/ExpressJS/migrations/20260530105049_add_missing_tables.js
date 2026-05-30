exports.up = async function up(knex) {
  const hasActivityEvents = await knex.schema.hasTable('activity_events');
  if (!hasActivityEvents) {
    await knex.schema.createTable('activity_events', (t) => {
      t.uuid('id').primary();
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      t.string('source').notNullable();
      t.string('command').notNullable();
      t.string('transcript');
      t.timestamps(true, true);
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('activity_events');
};
