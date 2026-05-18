// Activity controller. OWNER: Marko.
const { v4: uuid } = require('uuid');
const ActivityEvent = require('../../models/ActivityEvent');

exports.list = async (req, res, next) => {
  try {
    // Pagination via Objection's .page(pageNo, pageSize) — returns { results, total }
    const page = Math.max(0, parseInt(req.query.page || '0', 10));
    const pageSize = 50;
    const result = await ActivityEvent.query()
      .where({ user_id: req.user.id })
      .orderBy('created_at', 'DESC')
      .page(page, pageSize);
    res.json({ items: result.results, total: result.total, page, pageSize });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const row = await ActivityEvent.query().insert({
      id: uuid(),
      user_id: req.user.id,
      source: req.body.source,
      command: req.body.command,
      transcript: req.body.transcript || null,
    });
    res.status(201).json(row);
  } catch (err) { next(err); }
};
