// ExpressJS/modules/sync/sync.routes.js
const router      = require('express').Router();
const ctrl        = require('./sync.controller');
const requireAuth = require('../../middleware/auth');

router.post('/drain',  requireAuth, ctrl.drain);
router.get ('/events', requireAuth, ctrl.listEvents);

module.exports = router;