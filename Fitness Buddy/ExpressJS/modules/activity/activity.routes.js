// Activity log — every voice phrase and gesture the client recognises is
// POSTed here so the server can derive per-user usage stats.
// OWNER: Marko (paired with the vision/voice client panels).
//
//   POST /api/activity      { source: 'voice'|'gesture', command, transcript? }
//   GET  /api/activity      list (latest first)

const router = require('express').Router();
const { body } = require('express-validator');

const requireAuth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const c = require('./activity.controller');

router.use(requireAuth);

router.get('/', c.list);
router.post(
  '/',
  body('source').isIn(['voice', 'gesture']),
  body('command').isString().isLength({ min: 1, max: 60 }),
  body('transcript').optional().isString().isLength({ max: 240 }),
  validate,
  c.create,
);

module.exports = router;
