// Require a valid JWT access token on protected routes.
// Usage:  router.get('/something', requireAuth, handler)
const passport = require('passport');

module.exports = function requireAuth(req, res, next) {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: 'unauthorized' });
    req.user = user;
    next();
  })(req, res, next);
};
