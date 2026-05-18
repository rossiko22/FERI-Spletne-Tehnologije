// Web Push subscription (endpoint + keys). One user can have many devices.
// OWNER: Ana.

const { BaseModel } = require('../config/db');

class PushSubscription extends BaseModel {
  static get tableName() { return 'push_subscriptions'; }

  static get relationMappings() {
    const User = require('./User');
    return {
      user: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: { from: 'push_subscriptions.user_id', to: 'users.id' },
      },
    };
  }
}

module.exports = PushSubscription;
