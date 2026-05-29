// Auth routes — OAuth 2.0 + local password.
// OWNER: Marko.
//
// The refresh token is delivered as an httpOnly `fb_refresh` cookie (never in
// the JSON body); the short-lived access token is returned in the body and kept
// in memory by the client.
//
// Endpoints:
//   POST   /api/auth/register         { email, name, password } -> { access, user } + Set-Cookie
//   POST   /api/auth/login            { email, password }       -> { access, user } + Set-Cookie
//   POST   /api/auth/refresh          (fb_refresh cookie)       -> { access, user } + Set-Cookie
//   POST   /api/auth/logout           (fb_refresh cookie)       -> { ok } + clears cookie
//   GET    /api/auth/me               Bearer                    -> { user }
//   GET    /api/auth/google           -> 302 to Google consent screen
//   GET    /api/auth/google/callback  -> sets cookie, redirects to CLIENT_URL/login?oauth=1

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

// Refresh reads the httpOnly fb_refresh cookie (no body). Logout just clears
// that cookie, so it must work even when the access token has already expired.
router.post('/refresh', c.refresh);
router.post('/logout', c.logout);
router.get('/me', requireAuth, c.me);

// --- Google OAuth 2.0 flow ---
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth` }),
  c.googleCallback,
);

module.exports = router;
