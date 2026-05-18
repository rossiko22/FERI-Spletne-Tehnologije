# Fitness Buddy — Server (ExpressJS)

Plain Node.js + Express 4. SQLite via Objection.js + Knex. JWT + Google OAuth.

## Setup

```bash
npm install
cp .env.example .env
# fill in JWT secrets and (optionally) Google OAuth + VAPID keys
npm run migrate      # creates fitnessbuddy.sqlite + tables
npm run seed         # optional — inserts demo user
npm run dev          # http://localhost:3000
```

## File layout

```
ExpressJS/
├── server.js              entry — boots app + handles SIGTERM
├── app.js                 Express app: middleware + module mounting
├── knexfile.js            Knex config (SQLite, file path from .env)
├── config/
│   ├── db.js              shared Objection BaseModel + Knex instance
│   └── passport.js        JWT + Google OAuth strategies
├── middleware/
│   ├── auth.js            requireAuth (verifies Bearer JWT)
│   ├── error.js           central error handler
│   └── validate.js        express-validator helper
├── models/                Objection models (one per entity)
├── migrations/            Knex schema migrations
├── seeds/                 demo data
└── modules/               one folder per feature
    ├── auth/              (Marko)    /api/auth/*
    ├── habits/            (Sladja)   /api/habits/*
    ├── goals/             (Sladja)   /api/goals/*
    ├── workouts/          (Sladja)   /api/workouts/*
    ├── nutrition/         (Sladja)   /api/nutrition/*
    ├── sync/              (Ana)      /api/sync/*
    ├── notifications/     (Ana)      /api/notifications/*
    └── activity/          (Marko)    /api/activity/*
```

## Conventions

- **All routes return JSON.** Errors use `{ error, message? }`.
- **Auth-protected routes** mount `requireAuth` middleware. Public ones don't.
- **Validation** happens at the route level via `express-validator`. Controllers
  trust `req.body` shape.
- **All controllers scope queries by `req.user.id`** — never trust client-supplied
  user ids.
- **UUIDs** for all primary keys (so offline-created rows on the client survive
  the sync round-trip).

## Adding a new route

1. Add the route+controller pair in `modules/<feature>/`
2. Add the model in `models/` if a new table is needed, and a migration in
   `migrations/`
3. Mount it in `app.js`

## Submitting

Before zipping for the school submission:

```bash
rm -rf node_modules
rm -f package-lock.json
rm -f fitnessbuddy.sqlite
# re-run npm init per spec, then bring back the dependencies block
```
