// Vision/voice activity event log (source = "voice"|"gesture", command, transcript).
// OWNER: Marko (the vision+voice panels POST here on every command).

const { BaseModel } = require('../config/db');

class ActivityEvent extends BaseModel {
  static get tableName() { return 'activity_events'; }

  static get relationMappings() {
    const User = require('./User');
    return {
      user: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: { from: 'activity_events.user_id', to: 'users.id' },
      },
    };
  }
}

module.exports = ActivityEvent;
