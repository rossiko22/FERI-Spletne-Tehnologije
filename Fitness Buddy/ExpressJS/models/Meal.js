// Meal / drink entry: name, kind (food|drink), amount, unit, calories, water_ml.
// OWNER: Sladjana.

const { BaseModel } = require('../config/db');

class Meal extends BaseModel {
  static get tableName() { return 'meals'; }

  static get relationMappings() {
    const User = require('./User');
    return {
      user: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: { from: 'meals.user_id', to: 'users.id' },
      },
    };
  }

  /**
   * Returns the day's calorie + water totals. Sladja: extend with macros etc.
   */
  static dailyTotals(userId, date) {
    return this.query()
      .where({ user_id: userId, date })
      .sum({ calories: 'calories', water_ml: 'water_ml' })
      .first();
  }
}

module.exports = Meal;
