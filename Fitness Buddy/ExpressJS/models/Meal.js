// Meal / drink entry: name, kind (food|drink), amount, unit, calories, water_ml.
// OWNER: Sladjana.
const { BaseModel } = require('../config/db');

class Meal extends BaseModel {
  static get tableName() { return 'meals'; }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'user_id', 'date', 'kind'],
      properties: {
        id:       { type: 'string', format: 'uuid' },
        user_id:  { type: 'string', format: 'uuid' },
        name:     { type: 'string', minLength: 1, maxLength: 200 },
        kind:     { type: 'string', enum: ['food', 'drink'] },
        amount:   { type: 'number', minimum: 0 },
        unit:     { type: 'string', enum: ['kcal', 'g', 'kg', 'ml', 'l'] },
        calories: { type: 'integer', minimum: 0 },
        water_ml: { type: 'integer', minimum: 0 },
        date:     { type: 'string', format: 'date' },
      },
    };
  }

  // --- Virtualni atributi ---
  static get virtualAttributes() { return ['displayLabel']; }

  displayLabel() {
    const cal = this.calories ? `${this.calories} kcal ` : '';
    return `${cal}${this.name}`;
  }

  // --- Relacije ---
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

  // --- Scope helperi ---
  static forDate(userId, date) {
    return this.query()
      .where({ user_id: userId, date })
      .orderBy('created_at', 'asc');
  }

  static dailyTotals(userId, date) {
    return this.query()
      .where({ user_id: userId, date })
      .sum({ calories: 'calories', water_ml: 'water_ml' })
      .first();
  }

  static foodOnly(userId) {
    return this.query()
      .where({ user_id: userId, kind: 'food' })
      .orderBy('date', 'desc');
  }

  static drinkOnly(userId) {
    return this.query()
      .where({ user_id: userId, kind: 'drink' })
      .orderBy('date', 'desc');
  }
}

module.exports = Meal;
