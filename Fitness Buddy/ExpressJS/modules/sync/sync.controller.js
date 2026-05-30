const { v4: uuid } = require('uuid');
const SyncEvent       = require('../../models/SyncEvent');
const Workout         = require('../../models/Workout');
const Meal            = require('../../models/Meal');
const { Habit, HabitLog } = require('../../models/Habit');

// Goal nima modela — poiščemo direktno v DB
const { BaseModel }   = require('../../config/db');

// Align a client payload with the DB columns and stamp the owner. The client
// uses a few different field names (duration→duration_min, habitId→habit_id);
// water_ml / start_date already arrive aligned from the routes.
function normalize(entity, raw, userId) {
  const p = { ...raw };
  switch (entity) {
    case 'workout':
      if (p.duration != null && p.duration_min == null) p.duration_min = p.duration;
      delete p.duration;
      p.user_id = userId;
      break;
    case 'meal':
      if (p.water != null && p.water_ml == null) p.water_ml = p.water;
      delete p.water;
      p.user_id = userId;
      break;
    case 'habit':
    case 'goal':
      p.user_id = userId;
      break;
    case 'habitLog':
      if (p.habitId) { p.habit_id = p.habitId; delete p.habitId; }
      // habit_logs has no user_id column — it's scoped through its habit.
      break;
  }
  return p;
}

async function dispatch(ev, userId) {
  const { entity, kind } = ev;
  const payload = normalize(entity, ev.payload || {}, userId);

  switch (entity) {
    case 'workout': {
      if (kind === 'create') {
        const exists = await Workout.query().findById(payload.id);
        if (!exists) await Workout.query().insert(payload);
      } else if (kind === 'update') {
        await Workout.query().where({ id: payload.id, user_id: userId }).patch(payload);
      } else if (kind === 'delete') {
        await Workout.query().where({ id: payload.id, user_id: userId }).delete();
      }
      break;
    }
    case 'meal': {
      if (kind === 'create') {
        const exists = await Meal.query().findById(payload.id);
        if (!exists) await Meal.query().insert(payload);
      } else if (kind === 'update') {
        await Meal.query().where({ id: payload.id, user_id: userId }).patch(payload);
      } else if (kind === 'delete') {
        await Meal.query().where({ id: payload.id, user_id: userId }).delete();
      }
      break;
    }
    case 'habit': {
      if (kind === 'create') {
        const exists = await Habit.query().findById(payload.id);
        if (!exists) await Habit.query().insert(payload);
      } else if (kind === 'update') {
        await Habit.query().where({ id: payload.id, user_id: userId }).patch(payload);
      } else if (kind === 'delete') {
        await Habit.query().where({ id: payload.id, user_id: userId }).delete();
      }
      break;
    }
    case 'habitLog': {
      if (kind === 'create') {
        const exists = await HabitLog.query().findById(payload.id);
        if (!exists) await HabitLog.query().insert(payload);
      } else if (kind === 'delete') {
        await HabitLog.query().deleteById(payload.id);
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
        await knex('goals').where({ id: payload.id, user_id: userId }).update(payload);
      } else if (kind === 'delete') {
        await knex('goals').where({ id: payload.id, user_id: userId }).delete();
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

        await dispatch(ev, req.user.id);
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
