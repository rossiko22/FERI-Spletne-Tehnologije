// Workouts CRUD. OWNER: Sladjana.
const router = require('express').Router();
const { body, param, query } = require('express-validator');
const requireAuth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const c = require('./workouts.controller');

router.use(requireAuth);

router.get('/', c.list);
router.get(
  '/stats',
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  validate,
  c.stats,
);

router.post(
  '/',
  body('id').optional().isUUID(),
  body('name').isString().trim().isLength({ min: 1, max: 120 }),
  body('sets').optional().isInt({ min: 0 }),
  body('reps').optional().isInt({ min: 0 }),
  body('duration').optional().isInt({ min: 0 }),
  body('date').optional().isISO8601(),
  validate,
  c.create,
);
router.delete('/:id', param('id').isUUID(), validate, c.remove);

module.exports = router;
