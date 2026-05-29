// Passport strategies. Registered once from app.js.
// OWNER: Marko (auth + OAuth 2.0).

const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { v4: uuid } = require('uuid');

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
        const user = await User.query().findById(payload.sub);
        if (!user) return done(null, false);
        return done(null, user);
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
          const email = profile.emails?.[0]?.value || null;
          const avatar = profile.photos?.[0]?.value || null;

          // 1) Already linked? Match on the stable Google subject id.
          let user = await User.query().findOne({ google_id: profile.id });

          // 2) Otherwise link Google to an existing password account with the same email.
          if (!user && email) {
            user = await User.query().findOne({ email });
            if (user) {
              user = await user.$query().patchAndFetch({
                google_id: profile.id,
                avatar_url: user.avatar_url || avatar,
              });
            }
          }

          // 3) Brand-new user — create a password-less account.
          if (!user) {
            user = await User.query().insert({
              id: uuid(),
              email,
              name: profile.displayName || email || 'Google user',
              google_id: profile.id,
              avatar_url: avatar,
            });
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );
}

module.exports = passport;
