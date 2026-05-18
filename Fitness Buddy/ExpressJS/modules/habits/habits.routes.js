// Habits CRUD + per-habit log toggles.
// OWNER: Sladjana.
//
//   GET    /api/habits                  list habits
//   POST   /api/habits                  create  { name }
//   DELETE /api/habits/:id              delete
//   GET    /api/habits/logs             list all habit logs (optional ?date=YYYY-MM-DD)
//   POST   /api/habits/:id/logs         toggle today's log
//
const router = require('express').Router();
const { body, param } = require('express-validator');

const requireAuth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const c = require('./habits.controller');

router.use(requireAuth);

router.get('/', c.list);
router.post('/', body('name').isString().trim().isLength({ min: 1, max: 120 }), validate, c.create);
router.delete('/:id', param('id').isUUID(), validate, c.remove);

router.get('/logs', c.listLogs);
router.post('/:id/logs', param('id').isUUID(), validate, c.toggleLog);

module.exports = router;
