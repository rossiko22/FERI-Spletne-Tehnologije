// Sync controller — skeleton. OWNER: Ana.
//
// Strategy:
//   - Persist each incoming event in `sync_events` for audit (idempotent on event.id).
//   - For each event, dispatch to the corresponding model based on `entity`
//     and `kind`. If the entity row already exists (id collision from offline
//     uuid), upsert.
//   - Return per-event { status: 'applied'|'skipped'|'error' } so the client
//     knows which to drop from its queue.

const { v4: uuid } = require('uuid');
const SyncEvent = require('../../models/SyncEvent');

exports.drain = async (req, res, next) => {
  try {
    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    const results = [];

    for (const ev of events) {
      try {
        // 1. log the event so the server has a full history
        await SyncEvent.query().insert({
          id: ev.id || uuid(),
          user_id: req.user.id,
          kind: ev.kind,
          entity: ev.entity,
          payload: ev.payload ?? null,        // jsonAttributes auto-stringifies
        });

        // 2. TODO (Ana): dispatch to the right model based on ev.entity / ev.kind.
        //    Pattern:
        //      const Workout = require('../../models/Workout');
        //      if (ev.kind === 'create') await Workout.query().insert(ev.payload);
        //      if (ev.kind === 'update') await Workout.query().patchAndFetchById(ev.payload.id, ev.payload);
        //      if (ev.kind === 'delete') await Workout.query().deleteById(ev.payload.id);

        results.push({ id: ev.id, status: 'applied' });
      } catch (err) {
        results.push({ id: ev.id, status: 'error', error: err.message });
      }
    }

    res.json({ results });
  } catch (err) {
    next(err);
  }
};

exports.listEvents = async (req, res, next) => {
  try {
    const items = await SyncEvent.query()
      .where({ user_id: req.user.id })
      .orderBy('created_at', 'DESC');
    res.json({ items });
  } catch (err) {
    next(err);
  }
};
