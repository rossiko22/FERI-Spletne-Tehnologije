const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const passport = require('passport');

require('./config/passport'); // registers strategies

const errorMiddleware = require('./middleware/error');

const app = express();

// --- Security & infra middleware ---
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(passport.initialize());

// Global rate limit (per-route limits live inside auth module)
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'fitnessbuddy-api', time: new Date().toISOString() });
});

// --- Feature modules ---
//
// Each module owns its own routes/controller/model files.
// Owners are listed next to each line — see doc/TEAM.md for the full split.
//
app.use('/api/auth', require('./modules/auth/auth.routes'));                  // Marko
app.use('/api/habits', require('./modules/habits/habits.routes'));            // Sladjana
app.use('/api/goals', require('./modules/goals/goals.routes'));               // Sladjana
app.use('/api/workouts', require('./modules/workouts/workouts.routes'));      // Sladjana
app.use('/api/nutrition', require('./modules/nutrition/nutrition.routes'));   // Sladjana
app.use('/api/sync', require('./modules/sync/sync.routes'));                  // Ana
app.use('/api/notifications', require('./modules/notifications/notifications.routes')); // Ana
app.use('/api/activity', require('./modules/activity/activity.routes'));      // Marko

// --- 404 + central error handler ---
app.use((req, res) => res.status(404).json({ error: 'not_found', path: req.path }));
app.use(errorMiddleware);

module.exports = app;
