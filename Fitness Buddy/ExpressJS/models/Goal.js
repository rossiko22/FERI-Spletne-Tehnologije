// Goal: title + start/deadline + 0..100 progress.
// OWNER: Sladjana.

const { BaseModel } = require('../config/db');

class Goal extends BaseModel {
  static get tableName() { return 'goals'; }

  // Computed fields included in JSON output. Add `isOverdue` etc. here.
  static get virtualAttributes() { return ['isDone']; }

  isDone() {
    return (this.progress ?? 0) >= 100;
  }

  static get relationMappings() {
    const User = require('./User');
    return {
      user: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: { from: 'goals.user_id', to: 'users.id' },
      },
    };
  }

  // --- Scopes / static helpers (good for [S-3] complexity) ---

  static active(userId) {
    return this.query().where({ user_id: userId }).where('progress', '<', 100);
  }
}

module.exports = Goal;
