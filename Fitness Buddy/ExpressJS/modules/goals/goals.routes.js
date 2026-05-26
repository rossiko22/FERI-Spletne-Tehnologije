// Goals CRUD + bonus endpoints. OWNER: Sladjana.
const router = require('express').Router();
const { body, param } = require('express-validator');
const requireAuth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const c = require('./goals.controller');

router.use(requireAuth);

router.get('/', c.list);
router.get('/active', c.active);
router.get('/overdue', c.overdue);

router.post(
  '/',
  body('title').isString().trim().isLength({ min: 1, max: 200 }),
  body('startDate').optional().isISO8601(),
  body('deadline').optional().isISO8601(),
  body('progress').optional().isInt({ min: 0, max: 100 }),
  validate,
  c.create,
);
router.put('/:id', param('id').isUUID(), validate, c.update);
router.delete('/:id', param('id').isUUID(), validate, c.remove);

module.exports = router;
