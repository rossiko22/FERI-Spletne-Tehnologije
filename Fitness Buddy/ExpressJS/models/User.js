// User model. Local password (bcrypt) + Google OAuth identity.
// OWNER: Marko (auth) — schema below is what auth.controller relies on.
//
// NOTE: unlike every other model (SQLite), User is bound to the Postgres auth
// pool (see the User.knex(authKnex) call at the bottom). Login/signup data lives
// in Postgres; the rest of the app stays on SQLite.

const { BaseModel } = require('../config/db');
const { authKnex } = require('../config/authDb');

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

// Route all User queries to Postgres; every other model stays on the SQLite
// connection bound globally in config/db.js.
User.knex(authKnex);

module.exports = User;
