// Single import surface for all Objection models.
// Required eagerly so cross-model references resolve via lazy requires inside
// each model's `relationMappings`.

module.exports = {
  User: require('./User'),
  ...require('./Habit'),
  Goal: require('./Goal'),
  Workout: require('./Workout'),
  Meal: require('./Meal'),
  PushSubscription: require('./PushSubscription'),
  SyncEvent: require('./SyncEvent'),
  ActivityEvent: require('./ActivityEvent'),
};
