# Fitness Buddy

Fitness Buddy is an offline-first fitness tracking PWA. It lets a signed-in user
track workouts, meals, water intake, habits, goals, activity commands, and push
notifications from a React client backed by an Express API and Postgres.

The app is built for the school project submission by Ana, Sladjana, and Marko.

## Features

- Email/password authentication with JWT access tokens and httpOnly refresh cookies.
- Google OAuth support when Google credentials are configured.
- Workout, nutrition, habit, habit check-in, and goal tracking.
- Offline-first local storage using IndexedDB.
- Sync queue for offline creates, updates, and deletes.
- Push notification subscription and test notification endpoints.
- Voice commands with Azure Speech online and local Whisper fallback for offline quick commands.
- Gesture commands with MediaPipe Tasks Vision.
- PWA production build with a generated service worker.

## Tech Stack

- Client: React 19, TypeScript, Vite, TanStack Router, Tailwind CSS v4.
- Offline client data: IndexedDB stores plus a `syncQueue`.
- Server: Node.js, Express 4, Objection.js, Knex.
- Database: Postgres.
- Auth: JWT, bcrypt, Passport Google OAuth.
- AI/voice: Azure OpenAI, Azure Speech, Transformers.js local Whisper.
- Gestures: MediaPipe Tasks Vision.

## Project Layout

```text
Fitness Buddy/
├── Client/        React + Vite PWA
├── ExpressJS/     Express REST API, models, migrations, sync drain
├── compose.yaml   Local Postgres service
├── .env.example   Environment variable template
└── README.md      Project setup and operating notes
```

## Requirements

- Node.js 20 or newer.
- npm.
- Docker Desktop or another Docker-compatible runtime for local Postgres.

## Quick Start

Run these commands from `Fitness Buddy/`.

1. Create your environment file:

```bash
cp .env.example .env
```

Fill the Postgres values at minimum:

```env
POSTGRES_USER=fitnessbuddy
POSTGRES_PASSWORD=fitnessbuddy_dev
POSTGRES_DB=fitnessbuddy
POSTGRES_PORT=5432
POSTGRES_HOST=localhost
CLIENT_URL=http://localhost:5173
```

Google, VAPID, Azure OpenAI, and Azure Speech values are optional for basic CRUD,
but required for OAuth, push notifications, AI parsing, and cloud speech.

2. Start Postgres:

```bash
docker compose up -d
```

3. Install and migrate the API:

```bash
cd ExpressJS
npm install
npm run migrate
npm run dev
```

The API should print:

```text
[fitnessbuddy] API listening on http://localhost:3000
```

4. Start the client in a second terminal:

```bash
cd Client
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:3000`.

## Common Commands

Server:

```bash
cd ExpressJS
npm run migrate
npm run seed
npm run dev
npm start
```

Client:

```bash
cd Client
npm run dev
npm run build
npm run preview
```

Database:

```bash
docker compose up -d
docker compose down
docker compose down -v
```

Use `docker compose down -v` only when you want to delete the local Postgres
data volume.

## Offline Sync Model

The client keeps user data in an IndexedDB database namespaced by user ID. Each
create, update, or delete is applied locally first so the UI stays responsive
offline.

When the API is unavailable, the client stores an event in `syncQueue`:

```ts
{
  id: string,
  kind: 'create' | 'update' | 'delete',
  entity: 'workout' | 'meal' | 'habit' | 'habitLog' | 'goal',
  payload: object,
  createdAt: number
}
```

When the API is reachable again, `useSync()` posts queued events to:

```text
POST /api/sync/drain
```

The server applies each event for the authenticated user and records it in
`sync_events` only after the mutation succeeds. This makes retries safe.

Important implementation detail: client-generated UUIDs are preserved by the
server create endpoints. This keeps local IndexedDB records and Postgres records
addressable by the same ID, which is required for later deletes to work.

## API Overview

All feature routes are under `/api`.

```text
GET    /api/health

POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/workouts
POST   /api/workouts
DELETE /api/workouts/:id

GET    /api/nutrition
POST   /api/nutrition
DELETE /api/nutrition/:id

GET    /api/habits
GET    /api/habits/logs
POST   /api/habits
POST   /api/habits/:id/logs
DELETE /api/habits/:id

GET    /api/goals
POST   /api/goals
PUT    /api/goals/:id
DELETE /api/goals/:id

POST   /api/sync/drain
GET    /api/sync/events
```

Additional modules exist for notifications, activity logging, and AI voice
features.

## Production Build

```bash
cd Client
npm run build
npm run preview
```

For the API:

```bash
cd ExpressJS
NODE_ENV=production npm start
```

Set production environment variables before starting the API. In production,
`CLIENT_URL` should match the deployed client origin so CORS and auth cookies
work correctly.

## Troubleshooting

If the client shows Vite proxy errors for `/api/health`, the API is not running
or is not reachable on port `3000`. Start it from `ExpressJS` with:

```bash
npm run dev
```

If migrations say the directory is corrupt, Postgres has a migration recorded
that is missing from `ExpressJS/migrations`. Restore the missing migration file
or reset the local database with:

```bash
docker compose down -v
docker compose up -d
cd ExpressJS
npm run migrate
```

If offline changes do not appear on the server, open the Profile page and use
Force sync. Also confirm the API health check succeeds:

```bash
curl http://localhost:3000/api/health
```

If `npm run lint` fails, note that the current project needs ESLint setup work:
the server uses ESLint 9 but has no `eslint.config.js`, and the client package
currently does not have `eslint` installed.

## Submission Checklist

- `Client/` and `ExpressJS/` install cleanly with `npm install`.
- `docker compose up -d` starts Postgres.
- `cd ExpressJS && npm run migrate` succeeds.
- `cd Client && npm run build` succeeds.
- `node_modules/` is excluded from the submitted archive.
- Real secrets are not committed.
