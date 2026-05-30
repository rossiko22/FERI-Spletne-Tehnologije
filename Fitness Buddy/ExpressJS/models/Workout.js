// Workout entry: name, sets, reps, duration_min, date.
// OWNER: Sladjana.
const { BaseModel, knex } = require('../config/db');

class Workout extends BaseModel {
  static get tableName() { return 'workouts'; }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'user_id', 'date'],
      properties: {
        id:           { type: 'string', format: 'uuid' },
        user_id:      { type: 'string', format: 'uuid' },
        name:         { type: 'string', minLength: 1, maxLength: 200 },
        sets:         { type: 'integer', minimum: 0 },
        reps:         { type: 'integer', minimum: 0 },
        duration_min: { type: 'integer', minimum: 0 },
        date:         { type: 'string', format: 'date' },
      },
    };
  }

  // --- Virtualni atributi ---
  static get virtualAttributes() { return ['intensity']; }

  intensity() {
    const d = this.duration_min ?? 0;
    if (d >= 60) return 'high';
    if (d >= 30) return 'medium';
    return 'low';
  }

  // --- Relacije ---
  static get relationMappings() {
    const User = require('./User');
    return {
      user: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: { from: 'workouts.user_id', to: 'users.id' },
      },
    };
  }

  // --- Scope helperi ---
  static forDate(userId, date) {
    return this.query().where({ user_id: userId, date });
  }

  static forUser(userId) {
    return this.query()
      .where({ user_id: userId })
      .orderBy('date', 'desc');
  }

  static statsRange(userId, from, to) {
    return this.query()
      .where({ user_id: userId })
      .whereBetween('date', [from, to])
      .select(knex.raw("to_char(date, 'IYYY-IW') as week"))
      .sum({ total_min: 'duration_min' })
      .groupBy('week')
      .orderBy('week', 'asc');
  }
}

module.exports = Workout;
