// Append-only log of client sync events. Server-side mirror of the client's
// IndexedDB sync queue. Drives the "complexity of synchronization" criterion.
// OWNER: Ana.

const { BaseModel } = require('../config/db');

class SyncEvent extends BaseModel {
  static get tableName() { return 'sync_events'; }

  static get jsonAttributes() { return ['payload']; }

  static get relationMappings() {
    const User = require('./User');
    return {
      user: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: { from: 'sync_events.user_id', to: 'users.id' },
      },
    };
  }
}

module.exports = SyncEvent;
