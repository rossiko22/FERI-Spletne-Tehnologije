// Habit + HabitLog (separate tables). One habit -> many daily logs.
// OWNER: Sladjana.
const { BaseModel } = require('../config/db');

class Habit extends BaseModel {
  static get tableName() { return 'habits'; }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'user_id'],
      properties: {
        id:      { type: 'string', format: 'uuid' },
        user_id: { type: 'string', format: 'uuid' },
        name:    { type: 'string', minLength: 1, maxLength: 100 },
      },
    };
  }

  // --- Virtualni atributi ---
  static get virtualAttributes() { return ['streakLength']; }

  streakLength() {
    if (!this.logs || this.logs.length === 0) return 0;
    const sorted = [...this.logs]
      .map(l => l.date)
      .sort()
      .reverse();
    let streak = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    for (const dateStr of sorted) {
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0);
      const diff = (cursor - d) / (1000 * 60 * 60 * 24);
      if (diff <= 1) { streak++; cursor = d; }
      else break;
    }
    return streak;
  }

  // --- Relacije ---
  static get relationMappings() {
    const User = require('./User');
    return {
      user: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: { from: 'habits.user_id', to: 'users.id' },
      },
      logs: {
        relation: BaseModel.HasManyRelation,
        modelClass: HabitLog,
        join: { from: 'habits.id', to: 'habit_logs.habit_id' },
      },
    };
  }

  // --- Scope helperi ---
  static withLogs(userId) {
    return this.query()
      .where({ user_id: userId })
      .withGraphFetched('logs')
      .orderBy('created_at', 'asc');
  }

  static loggedToday(userId) {
    const today = new Date().toISOString().slice(0, 10);
    return this.query()
      .where({ user_id: userId })
      .withGraphFetched('logs')
      .modifyGraph('logs', b => b.where('date', today));
  }
}

class HabitLog extends BaseModel {
  static get tableName() { return 'habit_logs'; }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['habit_id', 'date'],
      properties: {
        id:       { type: 'string', format: 'uuid' },
        habit_id: { type: 'string', format: 'uuid' },
        date:     { type: 'string', format: 'date' },
      },
    };
  }

  static get relationMappings() {
    return {
      habit: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: Habit,
        join: { from: 'habit_logs.habit_id', to: 'habits.id' },
      },
    };
  }
}

module.exports = { Habit, HabitLog };
