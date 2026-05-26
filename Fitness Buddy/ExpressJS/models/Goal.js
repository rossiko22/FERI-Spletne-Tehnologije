// Goal: title + start/deadline + 0..100 progress.
// OWNER: Sladjana.
const { BaseModel } = require('../config/db');

class Goal extends BaseModel {
  static get tableName() { return 'goals'; }

  // --- JSON Schema validacija (Objection automatski validira prije INSERT/UPDATE) ---
  static get jsonSchema() {
    return {
      type: 'object',
      required: ['title', 'user_id'],
      properties: {
        id:         { type: 'string', format: 'uuid' },
        user_id:    { type: 'string', format: 'uuid' },
        title:      { type: 'string', minLength: 1, maxLength: 200 },
        progress:   { type: 'integer', minimum: 0, maximum: 100 },
        start_date: { type: ['string', 'null'] },
        deadline:   { type: ['string', 'null'] },
      },
    };
  }

  // --- Virtualni atributi (computed, uključeni u JSON output) ---
  static get virtualAttributes() { return ['isDone', 'isOverdue', 'daysLeft']; }

  isDone()    { return (this.progress ?? 0) >= 100; }

  isOverdue() {
    if (!this.deadline || this.isDone()) return false;
    return new Date(this.deadline) < new Date();
  }

  daysLeft() {
    if (!this.deadline) return null;
    const diff = new Date(this.deadline) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // --- Relacije ---
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

  // --- Scope helperi ---
  static active(userId) {
    return this.query()
      .where({ user_id: userId })
      .where('progress', '<', 100)
      .orderBy('deadline', 'asc');
  }

  static overdue(userId) {
    return this.query()
      .where({ user_id: userId })
      .where('progress', '<', 100)
      .where('deadline', '<', new Date().toISOString().slice(0, 10));
  }

  static withProgress(userId) {
    return this.query()
      .where({ user_id: userId })
      .select('*')
      .orderBy('progress', 'desc');
  }
}

module.exports = Goal;
