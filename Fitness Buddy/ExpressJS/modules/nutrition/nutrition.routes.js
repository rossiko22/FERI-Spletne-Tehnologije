// Nutrition CRUD. OWNER: Sladjana.
const router = require('express').Router();
const { body, param, query } = require('express-validator');
const requireAuth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const c = require('./nutrition.controller');

router.use(requireAuth);

router.get('/', c.list);
router.get(
  '/daily',
  query('date').optional().isISO8601(),
  validate,
  c.daily,
);

router.post(
  '/',
  body('id').optional().isUUID(),
  body('name').isString().trim().isLength({ min: 1, max: 120 }),
  body('kind').isIn(['food', 'drink']),
  body('amount').optional().isFloat({ min: 0 }),
  body('unit').optional().isIn(['kcal', 'g', 'kg', 'ml', 'l']),
  body('calories').optional().isInt({ min: 0 }),
  body('water').optional().isInt({ min: 0 }),
  body('date').optional().isISO8601(),
  validate,
  c.create,
);
router.delete('/:id', param('id').isUUID(), validate, c.remove);

module.exports = router;
