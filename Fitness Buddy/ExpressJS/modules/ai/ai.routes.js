// AI voice routes (Azure OpenAI). OWNER: Marko.
const express = require('express');
const router = express.Router();
const requireAuth = require('../../middleware/auth');
const c = require('./ai.controller');

// Raw-body parser for /transcribe so we can stream the audio blob straight from
// the client into the Azure upload without round-tripping through multipart
// parsing twice. 20 MB cap is generous — typical 30 s voice command is ~150 KB.
const audioBody = express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '20mb' });

router.post('/parse', requireAuth, c.parse);
router.get('/summary', requireAuth, c.summary);
router.post('/transcribe', requireAuth, audioBody, c.transcribe);
router.post('/speak', requireAuth, c.speak);

module.exports = router;
