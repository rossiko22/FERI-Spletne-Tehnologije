// ExpressJS/modules/notifications/notifications.routes.js
const router      = require('express').Router();
const ctrl        = require('./notifications.controller');
const requireAuth = require('../../middleware/auth');

router.get ('/public-key',  ctrl.getPublicKey);
router.post('/subscribe',   requireAuth, ctrl.subscribe);
router.post('/unsubscribe', requireAuth, ctrl.unsubscribe);
router.post('/test',        requireAuth, ctrl.test);
router.post('/send',        requireAuth, ctrl.sendToAll);

module.exports = router;
