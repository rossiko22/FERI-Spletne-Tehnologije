// Auth routes — OAuth 2.0 + local password.
// OWNER: Marko.
//
// Endpoints:
//   POST   /api/auth/register         { email, name, password }
//   POST   /api/auth/login            { email, password }     -> { access, refresh, user }
//   POST   /api/auth/refresh          { refresh }             -> { access }
//   POST   /api/auth/logout           Bearer                  -> { ok }
//   GET    /api/auth/me               Bearer                  -> { user }
//   GET    /api/auth/google           -> 302 to Google consent screen
//   GET    /api/auth/google/callback  -> redirects to CLIENT_URL with tokens

const router = require('express').Router();
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');

const validate = require('../../middleware/validate');
const requireAuth = require('../../middleware/auth');
const c = require('./auth.controller');

const loginLimit = rateLimit({ windowMs: 60 * 1000, max: 10 });

router.post(
  '/register',
  body('email').isEmail().normalizeEmail(),
  body('name').isString().trim().isLength({ min: 1, max: 80 }),
  body('password').isString().isLength({ min: 8, max: 200 }),
  validate,
  c.register,
);

router.post(
  '/login',
  loginLimit,
  body('email').isEmail().normalizeEmail(),
  body('password').isString().notEmpty(),
  validate,
  c.login,
);

router.post('/refresh', body('refresh').isString().notEmpty(), validate, c.refresh);
router.post('/logout', requireAuth, c.logout);
router.get('/me', requireAuth, c.me);

// --- Google OAuth 2.0 flow ---
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth` }),
  c.googleCallback,
);

module.exports = router;
