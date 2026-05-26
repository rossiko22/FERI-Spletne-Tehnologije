// Workouts controller. OWNER: Sladjana.
const { v4: uuid } = require('uuid');
const Workout = require('../../models/Workout');

const todayISO = () => new Date().toISOString().slice(0, 10);

exports.list = async (req, res, next) => {
  try {
    const q = Workout.query().where({ user_id: req.user.id }).orderBy('date', 'desc');
    if (req.query.date) q.where('date', req.query.date);
    res.json({ items: await q });
  } catch (err) { next(err); }
};

// GET /api/workouts/stats?from=YYYY-MM-DD&to=YYYY-MM-DD
// Vraca ukupne minute po tjednu — kompleksni groupBy upit [S-3]
exports.stats = async (req, res, next) => {
  try {
    const from = req.query.from || '2000-01-01';
    const to   = req.query.to   || todayISO();
    const rows = await Workout.statsRange(req.user.id, from, to);
    res.json({ stats: rows });
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
