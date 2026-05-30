// Habits controller. OWNER: Sladjana.
const { v4: uuid } = require('uuid');
const { Habit, HabitLog } = require('../../models/Habit');

const todayISO = () => new Date().toISOString().slice(0, 10);

exports.list = async (req, res, next) => {
  try {
    const items = await Habit.query().where({ user_id: req.user.id });
    res.json({ items });
  } catch (err) { next(err); }
};

// GET /api/habits/with-logs  — habits + all logs eager loaded (shows streakLength virtual)
exports.listWithLogs = async (req, res, next) => {
  try {
    const items = await Habit.withLogs(req.user.id);
    res.json({ items });
  } catch (err) { next(err); }
};

// GET /api/habits/today  — habits with only today's log (za prikaz na UI)
exports.listToday = async (req, res, next) => {
  try {
    const items = await Habit.loggedToday(req.user.id);
    res.json({ items });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const id = req.body.id || uuid();
    const existing = await Habit.query().findOne({ id, user_id: req.user.id });
    if (existing) return res.status(200).json(existing);

    const habit = await Habit.query().insert({
      id,
      user_id: req.user.id,
      name: req.body.name,
    });
    res.status(201).json(habit);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await Habit.query().where({ id: req.params.id, user_id: req.user.id }).delete();
    res.json({ ok: true });
  } catch (err) { next(err); }
};

exports.listLogs = async (req, res, next) => {
  try {
    const q = HabitLog.query()
      .join('habits', 'habits.id', 'habit_logs.habit_id')
      .where('habits.user_id', req.user.id)
      .select('habit_logs.*');
    if (req.query.date) q.where('habit_logs.date', req.query.date);
    res.json({ items: await q });
  } catch (err) { next(err); }
};

exports.toggleLog = async (req, res, next) => {
  try {
    const date = req.body.date || todayISO();
    const habit = await Habit.query().findOne({ id: req.params.id, user_id: req.user.id });
    if (!habit) return res.status(404).json({ error: 'not_found' });

    const existing = await HabitLog.query().findOne({ habit_id: req.params.id, date });
    if (existing) {
      await HabitLog.query().deleteById(existing.id);
      return res.json({ ticked: false });
    }
    const log = await HabitLog.query().insert({
      id: req.body.id || uuid(),
      habit_id: req.params.id,
      date,
    });
    res.status(201).json({ ticked: true, log });
  } catch (err) { next(err); }
};
