const { v4: uuid } = require('uuid');
const SyncEvent       = require('../../models/SyncEvent');
const Workout         = require('../../models/Workout');
const Meal            = require('../../models/Meal');
const { Habit, HabitLog } = require('../../models/Habit');

// Goal nima modela — poiščemo direktno v DB
const { BaseModel }   = require('../../config/db');

async function dispatch(ev) {
  const { entity, kind, payload } = ev;

  switch (entity) {
    case 'workout': {
      if (kind === 'create') {
        const exists = await Workout.query().findById(payload.id);
        if (!exists) await Workout.query().insert(payload);
      } else if (kind === 'update') {
        await Workout.query().patchAndFetchById(payload.id, payload);
      } else if (kind === 'delete') {
        await Workout.query().deleteById(payload.id);
      }
      break;
    }
    case 'meal': {
      if (kind === 'create') {
        const exists = await Meal.query().findById(payload.id);
        if (!exists) await Meal.query().insert(payload);
      } else if (kind === 'update') {
        await Meal.query().patchAndFetchById(payload.id, payload);
      } else if (kind === 'delete') {
        await Meal.query().deleteById(payload.id);
      }
      break;
    }
    case 'habit': {
      if (kind === 'create') {
        const exists = await Habit.query().findById(payload.id);
        if (!exists) await Habit.query().insert(payload);
      } else if (kind === 'update') {
        await Habit.query().patchAndFetchById(payload.id, payload);
      } else if (kind === 'delete') {
        await Habit.query().deleteById(payload.id);
      }
      break;
    }
    case 'habitLog': {
      // Pretvori habitId → habit_id za DB
      const dbPayload = { ...payload };
      if (dbPayload.habitId) {
        dbPayload.habit_id = dbPayload.habitId;
        delete dbPayload.habitId;
      }
      if (kind === 'create') {
        const exists = await HabitLog.query().findById(dbPayload.id);
        if (!exists) await HabitLog.query().insert(dbPayload);
      } else if (kind === 'update') {
        await HabitLog.query().patchAndFetchById(dbPayload.id, dbPayload);
      } else if (kind === 'delete') {
        await HabitLog.query().deleteById(dbPayload.id);
      }
      break;
    }
    case 'goal': {
      // Goal nima modela — direkten SQL preko knex
      const knex = BaseModel.knex();
      if (kind === 'create') {
        const exists = await knex('goals').where({ id: payload.id }).first();
        if (!exists) await knex('goals').insert(payload);
      } else if (kind === 'update') {
        await knex('goals').where({ id: payload.id }).update(payload);
      } else if (kind === 'delete') {
        await knex('goals').where({ id: payload.id }).delete();
      }
      break;
    }
    default:
      throw new Error(`unknown entity: ${entity}`);
  }
}

exports.drain = async (req, res, next) => {
  try {
    const events  = Array.isArray(req.body?.events) ? req.body.events : [];
    const results = [];

    for (const ev of events) {
      const evId = ev.id || uuid();
      const already = await SyncEvent.query().findById(evId);
      if (already) {
        results.push({ id: evId, status: 'skipped' });
        continue;
      }

      try {
        await SyncEvent.query().insert({
          id:      evId,
          user_id: req.user.id,
          kind:    ev.kind,
          entity:  ev.entity,
          payload: ev.payload ?? null,
        });

        await dispatch(ev);
        results.push({ id: evId, status: 'applied' });
      } catch (err) {
        console.error(`[sync] event ${evId} failed:`, err.message);
        results.push({ id: evId, status: 'error', error: err.message });
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
      .orderBy('created_at', 'DESC')
      .limit(200);
    res.json({ items });
  } catch (err) {
    next(err);
  }
};
