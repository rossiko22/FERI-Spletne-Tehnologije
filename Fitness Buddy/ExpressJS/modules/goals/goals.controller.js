// Goals controller. OWNER: Sladjana.
const { v4: uuid } = require('uuid');
const Goal = require('../../models/Goal');

exports.list = async (req, res, next) => {
  try {
    const items = await Goal.query()
      .where({ user_id: req.user.id })
      .orderBy('deadline', 'asc');
    res.json({ items });
  } catch (err) { next(err); }
};

exports.active = async (req, res, next) => {
  try {
    const items = await Goal.active(req.user.id);
    res.json({ items });
  } catch (err) { next(err); }
};

exports.overdue = async (req, res, next) => {
  try {
    const items = await Goal.overdue(req.user.id);
    res.json({ items });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const id = req.body.id || uuid();
    const existing = await Goal.query().findOne({ id, user_id: req.user.id });
    if (existing) return res.status(200).json(existing);

    const goal = await Goal.query().insert({
      id,
      user_id: req.user.id,
      title: req.body.title,
      start_date: req.body.startDate,
      deadline: req.body.deadline,
      progress: req.body.progress ?? 0,
    });
    res.status(201).json(goal);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const goal = await Goal.query().findOne({ id: req.params.id, user_id: req.user.id });
    if (!goal) return res.status(404).json({ error: 'not_found' });
    const allowed = { title: 'title', progress: 'progress', startDate: 'start_date', deadline: 'deadline' };
    const patch = {};
    for (const [key, column] of Object.entries(allowed)) {
      if (req.body[key] !== undefined) patch[column] = req.body[key];
    }
    const updated = await Goal.query().patchAndFetchById(goal.id, patch);
    res.json(updated);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await Goal.query().where({ id: req.params.id, user_id: req.user.id }).delete();
    res.json({ ok: true });
  } catch (err) { next(err); }
};
