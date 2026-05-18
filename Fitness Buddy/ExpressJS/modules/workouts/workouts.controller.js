// Workouts controller — skeleton. OWNER: Sladjana.
const { v4: uuid } = require('uuid');
const Workout = require('../../models/Workout');

const todayISO = () => new Date().toISOString().slice(0, 10);

exports.list = async (req, res, next) => {
  try {
    const q = Workout.query().where({ user_id: req.user.id });
    if (req.query.date) q.where('date', req.query.date);
    res.json({ items: await q });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const row = await Workout.query().insert({
      id: uuid(),
      user_id: req.user.id,
      name: req.body.name,
      sets: req.body.sets ?? 0,
      reps: req.body.reps ?? 0,
      duration_min: req.body.duration ?? 0,
      date: req.body.date || todayISO(),
    });
    res.status(201).json(row);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await Workout.query().where({ id: req.params.id, user_id: req.user.id }).delete();
    res.json({ ok: true });
  } catch (err) { next(err); }
};
