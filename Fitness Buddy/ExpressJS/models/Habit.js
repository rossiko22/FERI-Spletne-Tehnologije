// Habit + HabitLog (separate tables). One habit -> many daily logs.
// OWNER: Sladjana.

const { BaseModel } = require('../config/db');

class Habit extends BaseModel {
  static get tableName() { return 'habits'; }

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
}

class HabitLog extends BaseModel {
  static get tableName() { return 'habit_logs'; }

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
