// Workouts CRUD. OWNER: Sladjana.
//
//   GET    /api/workouts                  list (?date=YYYY-MM-DD filter)
//   POST   /api/workouts                  { name, sets, reps, duration, date? }
//   DELETE /api/workouts/:id

const router = require('express').Router();
const { body, param } = require('express-validator');

const requireAuth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const c = require('./workouts.controller');

router.use(requireAuth);

router.get('/', c.list);
router.post(
  '/',
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
