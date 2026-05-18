// Web Push notifications (VAPID).
// OWNER: Ana.
//
//   GET    /api/notifications/public-key  -> { publicKey } for client subscribe
//   POST   /api/notifications/subscribe   { endpoint, keys: { p256dh, auth } }
//   POST   /api/notifications/test        send a test push to current user
//   POST   /api/notifications/send        { userId, title, body, url } (admin/internal)

const router = require('express').Router();
const { body } = require('express-validator');

const requireAuth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const c = require('./notifications.controller');

router.get('/public-key', c.publicKey);          // public — client needs this before login too
router.use(requireAuth);                          // everything below requires auth

router.post(
  '/subscribe',
  body('endpoint').isURL(),
  body('keys.p256dh').isString(),
  body('keys.auth').isString(),
  validate,
  c.subscribe,
);

router.post('/test', c.testPush);
router.post('/send', body('title').isString(), body('body').isString(), validate, c.send);

module.exports = router;
