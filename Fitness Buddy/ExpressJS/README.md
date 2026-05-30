# Fitness Buddy Server

Express REST API for Fitness Buddy. It handles authentication, feature CRUD,
offline sync draining, push notifications, activity logging, and Azure-backed AI
voice endpoints.

## Stack

- Node.js + Express 4.
- Postgres through Knex and Objection.js.
- JWT access tokens plus httpOnly refresh cookies.
- Passport Google OAuth.
- Web Push notifications.

## Setup

From the project root:

```bash
cp .env.example .env
docker compose up -d
```

Then from this directory:

```bash
npm install
npm run migrate
npm run dev
```

The API runs at:

```text
http://localhost:3000
```

Health check:

```bash
curl http://localhost:3000/api/health
```

## Environment

`ExpressJS/knexfile.js` loads environment variables from `../.env`.

Required for the database:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=fitnessbuddy
POSTGRES_USER=fitnessbuddy
POSTGRES_PASSWORD=fitnessbuddy_dev
CLIENT_URL=http://localhost:5173
```

Optional integrations:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` for OAuth.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` for push.
- `AZURE_OPENAI_*` for AI command parsing and summaries.
- `AZURE_SPEECH_TTS_*` for cloud text-to-speech.

## Scripts

```bash
npm run dev              # nodemon server.js
npm start                # node server.js
npm run migrate          # knex migrate:latest
npm run migrate:rollback # knex migrate:rollback
npm run seed             # knex seed:run
```

## File Layout

```text
ExpressJS/
├── server.js              starts the HTTP server
├── app.js                 middleware and route mounting
├── knexfile.js            Postgres connection and migration config
├── config/
│   ├── db.js              shared Knex/Objection bootstrap
│   └── passport.js        JWT and Google strategies
├── middleware/            auth, validation, error handling
├── migrations/            database schema migrations
├── models/                Objection models
├── modules/
│   ├── auth/              /api/auth/*
│   ├── workouts/          /api/workouts/*
│   ├── nutrition/         /api/nutrition/*
│   ├── habits/            /api/habits/*
│   ├── goals/             /api/goals/*
│   ├── sync/              /api/sync/*
│   ├── notifications/     /api/notifications/*
│   ├── activity/          /api/activity/*
│   └── ai/                /api/ai/*
└── seeds/                 demo data
```

## Sync Notes

The sync module receives queued client events from IndexedDB:

```text
POST /api/sync/drain
```

Each event is scoped to `req.user.id`. The server accepts client UUIDs on create
routes so offline-created rows keep the same ID after syncing. `sync_events`
stores successfully applied events for idempotency.

## Route Conventions

- All responses are JSON.
- Auth-protected routes use `requireAuth`.
- Validation happens in route files with `express-validator`.
- Controllers must scope user-owned data by `req.user.id`.
- Primary keys are UUIDs.

## Troubleshooting

`ECONNREFUSED` from the client usually means this server is not running.

Migration corruption means a migration name exists in Postgres but the file is
missing locally. Restore the missing file or reset the local database volume:

```bash
docker compose down -v
docker compose up -d
npm run migrate
```
