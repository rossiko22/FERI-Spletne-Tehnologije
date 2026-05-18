// Nutrition (meals + drinks) CRUD. OWNER: Sladjana.
//
//   GET    /api/nutrition                  list (?date=YYYY-MM-DD)
//   POST   /api/nutrition                  { name, kind, amount, unit, calories, water, date? }
//   DELETE /api/nutrition/:id

const router = require('express').Router();
const { body, param } = require('express-validator');

const requireAuth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const c = require('./nutrition.controller');

router.use(requireAuth);

router.get('/', c.list);
router.post(
  '/',
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
