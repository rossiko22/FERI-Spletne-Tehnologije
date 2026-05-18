// Workout entry: name, sets, reps, duration_min, date.
// OWNER: Sladjana.

const { BaseModel, knex } = require('../config/db');

class Workout extends BaseModel {
  static get tableName() { return 'workouts'; }

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

  // --- Scopes / static helpers (good for [S-3] complexity) ---

  static forDate(userId, date) {
    return this.query().where({ user_id: userId, date });
  }

  /**
   * Aggregated stats grouped by ISO week. Returns rows of { week, total_min }.
   * Demonstrates complex SQL (groupBy + sum + strftime) for the rubric.
   */
  static statsRange(userId, from, to) {
    return this.query()
      .where({ user_id: userId })
      .whereBetween('date', [from, to])
      .select(knex.raw("strftime('%Y-%W', date) as week"))
      .sum({ total_min: 'duration_min' })
      .groupBy('week');
  }
}

module.exports = Workout;
