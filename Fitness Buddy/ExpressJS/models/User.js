// User model. Local password (bcrypt) + Google OAuth identity.
// OWNER: Marko (auth) — schema below is what auth.controller relies on.

const { BaseModel } = require('../config/db');

class User extends BaseModel {
  static get tableName() { return 'users'; }

  // password_hash is stripped from API responses.
  $formatJson(json) {
    json = super.$formatJson(json);
    delete json.password_hash;
    return json;
  }

  static get relationMappings() {
    // Lazy require to avoid circular imports between models.
    const { Habit } = require('./Habit');
    const Goal = require('./Goal');
    const Workout = require('./Workout');
    const Meal = require('./Meal');
    const PushSubscription = require('./PushSubscription');

    return {
      habits: {
        relation: BaseModel.HasManyRelation,
        modelClass: Habit,
        join: { from: 'users.id', to: 'habits.user_id' },
      },
      goals: {
        relation: BaseModel.HasManyRelation,
        modelClass: Goal,
        join: { from: 'users.id', to: 'goals.user_id' },
      },
      workouts: {
        relation: BaseModel.HasManyRelation,
        modelClass: Workout,
        join: { from: 'users.id', to: 'workouts.user_id' },
      },
      meals: {
        relation: BaseModel.HasManyRelation,
        modelClass: Meal,
        join: { from: 'users.id', to: 'meals.user_id' },
      },
      pushSubscriptions: {
        relation: BaseModel.HasManyRelation,
        modelClass: PushSubscription,
        join: { from: 'users.id', to: 'push_subscriptions.user_id' },
      },
    };
  }
}

module.exports = User;
