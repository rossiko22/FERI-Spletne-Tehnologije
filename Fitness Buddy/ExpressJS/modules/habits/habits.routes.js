// Habits CRUD + log toggles. OWNER: Sladjana.
const router = require('express').Router();
const { body, param } = require('express-validator');
const requireAuth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const c = require('./habits.controller');

router.use(requireAuth);

router.get('/', c.list);
router.get('/with-logs', c.listWithLogs);
router.get('/today', c.listToday);
router.get('/logs', c.listLogs);

router.post(
  '/',
  body('id').optional().isUUID(),
  body('name').isString().trim().isLength({ min: 1, max: 120 }),
  validate,
  c.create,
);
router.delete('/:id', param('id').isUUID(), validate, c.remove);
router.post(
  '/:id/logs',
  param('id').isUUID(),
  body('id').optional().isUUID(),
  body('date').optional().isISO8601(),
  validate,
  c.toggleLog,
);

module.exports = router;
