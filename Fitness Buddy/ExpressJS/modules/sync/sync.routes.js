// Sync — drains the client's offline IndexedDB queue.
// OWNER: Ana.
//
// The client batches its queued mutations and POSTs them here when it comes
// back online. The server replays each event into the matching CRUD endpoint
// and returns per-item results so the client can clear successful entries.
//
//   POST /api/sync/drain   { events: [{ id, kind, entity, payload }, ...] }
//                          -> { results: [{ id, status, error? }, ...] }
//   GET  /api/sync/events  list server-side sync log (debug)

const router = require('express').Router();
const requireAuth = require('../../middleware/auth');
const c = require('./sync.controller');

router.use(requireAuth);

router.post('/drain', c.drain);
router.get('/events', c.listEvents);

module.exports = router;
