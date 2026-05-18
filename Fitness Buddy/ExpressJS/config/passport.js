// Passport strategies. Registered once from app.js.
// OWNER: Marko (auth + OAuth 2.0).

const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');

const User = require('../models/User');

// --- JWT strategy: validates Bearer access tokens on protected routes ---
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    },
    async (payload, done) => {
      try {
        const user = await User.where({ id: payload.sub }).fetch({ require: false });
        if (!user) return done(null, false);
        return done(null, user.toJSON());
      } catch (err) {
        return done(err);
      }
    },
  ),
);

// --- Google OAuth 2.0 strategy ---
// Only registered if credentials are present so the dev server still starts
// without them.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // TODO (Marko): find-or-create user by google profile.id / email
          // const user = await User.findOrCreateFromGoogle(profile);
          // return done(null, user.toJSON());
          return done(null, { id: profile.id, email: profile.emails?.[0]?.value, name: profile.displayName });
        } catch (err) {
          return done(err);
        }
      },
    ),
  );
}

module.exports = passport;
