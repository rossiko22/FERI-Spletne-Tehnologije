# Fitness Buddy

Offline-first PWA for tracking workouts, nutrition, habits and goals.
School project — 3-person team (Marko, Ana, Sladjana).

This repository contains the source code that will be zipped and submitted as
`FitnessBuddy-Spasovski_Surname2_Surname3.zip` by **Mon 1 June 2026, 08:00**.

## Repository layout

```
Nasa/
├── doc/         submission documentation (porocilo, team split, instructions)
├── ExpressJS/   Node.js + Express REST API + SQLite (Objection.js/Knex)
└── Client/      React + Vite PWA (TanStack Router, Tailwind, shadcn/ui)
```

The three top-level folders match the school's required submission layout
(`doc/`, `ExpressJS/`, `Client/`).

## Running locally

You'll need two terminals.

**Terminal 1 — server**

```bash
cd ExpressJS
npm install
cp .env.example .env       # fill in GOOGLE_CLIENT_ID / SECRET if testing OAuth
npm run migrate            # creates fitnessbuddy.sqlite + tables
npm run dev                # starts on http://localhost:3000
```

**Terminal 2 — client**

```bash
cd Client
npm install
npm run dev                # starts on http://localhost:5173
```

Open <http://localhost:5173>. The client expects the API at
`http://localhost:3000/api/*` (configurable via `VITE_API_URL`).

## Production build

```bash
cd Client
npm run build              # produces ./dist with bundled JS+CSS, no CDN links
cd ../ExpressJS
NODE_ENV=production npm start
```

## Team & task split

See [`doc/TEAM.md`](doc/TEAM.md) for the per-person responsibility matrix.
See [`doc/MARKO.md`](doc/MARKO.md), [`doc/ANA.md`](doc/ANA.md),
[`doc/SLADJANA.md`](doc/SLADJANA.md) for individual checklists.

Git workflow: [`doc/CONTRIBUTING.md`](doc/CONTRIBUTING.md).

## Deliverable checklist (school)

- [x] Submission folder shape: `doc/`, `ExpressJS/`, `Client/`
- [ ] `doc/porocilo.docx` filled in
- [ ] No CDN links in client (`vite build` produces a self-contained `dist/`)
- [ ] `ExpressJS/package.json` rebuilt with fresh `npm init` before zipping
- [ ] `node_modules/` excluded from the zip
