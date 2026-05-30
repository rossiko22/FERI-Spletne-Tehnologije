// Nutrition controller. OWNER: Sladjana.
const { v4: uuid } = require('uuid');
const Meal = require('../../models/Meal');

const todayISO = () => new Date().toISOString().slice(0, 10);

exports.list = async (req, res, next) => {
  try {
    const q = Meal.query().where({ user_id: req.user.id }).orderBy('date', 'desc');
    if (req.query.date) q.where('date', req.query.date);
    res.json({ items: await q });
  } catch (err) { next(err); }
};

// GET /api/nutrition/daily?date=YYYY-MM-DD
// Vraca ukupne kalorije + vodu za dan [S-3]
exports.daily = async (req, res, next) => {
  try {
    const date = req.query.date || todayISO();
    const totals = await Meal.dailyTotals(req.user.id, date);
    res.json({ date, calories: totals.calories ?? 0, water_ml: totals.water_ml ?? 0 });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const id = req.body.id || uuid();
    const existing = await Meal.query().findOne({ id, user_id: req.user.id });
    if (existing) return res.status(200).json(existing);

    const row = await Meal.query().insert({
      id,
      user_id: req.user.id,
      name: req.body.name,
      kind: req.body.kind,
      amount: req.body.amount ?? 0,
      unit: req.body.unit,
      calories: req.body.calories ?? 0,
      water_ml: req.body.water ?? 0,
      date: req.body.date || todayISO(),
    });
    res.status(201).json(row);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await Meal.query().where({ id: req.params.id, user_id: req.user.id }).delete();
    res.json({ ok: true });
  } catch (err) { next(err); }
};
