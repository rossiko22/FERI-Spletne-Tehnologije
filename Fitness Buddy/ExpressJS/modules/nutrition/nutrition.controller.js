// Nutrition controller — skeleton. OWNER: Sladjana.
const { v4: uuid } = require('uuid');
const Meal = require('../../models/Meal');

const todayISO = () => new Date().toISOString().slice(0, 10);

exports.list = async (req, res, next) => {
  try {
    const q = Meal.query().where({ user_id: req.user.id });
    if (req.query.date) q.where('date', req.query.date);
    res.json({ items: await q });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const row = await Meal.query().insert({
      id: uuid(),
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
