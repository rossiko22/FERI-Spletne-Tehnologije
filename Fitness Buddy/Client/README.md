# Fitness Buddy Client

React + Vite PWA for Fitness Buddy. The client is offline-first: it stores user
data in IndexedDB, queues mutations while offline, and syncs them to the Express
API when the connection returns.

## Stack

- React 19 + TypeScript.
- Vite 6.
- TanStack Router.
- Tailwind CSS v4.
- IndexedDB for local app data.
- `vite-plugin-pwa` and Workbox for the production service worker.
- Transformers.js for local Whisper fallback.
- MediaPipe Tasks Vision for gesture recognition.

## Setup

Start the API first from `../ExpressJS`.

Then run:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

In development, Vite proxies `/api/*` to `http://localhost:3000`.

## Scripts

```bash
npm run dev       # Vite dev server
npm run build     # TypeScript build plus production Vite build
npm run preview   # serve dist/
npm run lint      # currently needs eslint installed/configured
```

## Environment

Optional `.env.local`:

```env
VITE_API_URL=http://localhost:3000/api
```

When unset, API calls use `/api`, which works with the Vite proxy in development.

## Source Layout

```text
src/
├── main.tsx                 app boot, session refresh, PWA registration
├── router.tsx               TanStack Router setup
├── routeTree.gen.ts         generated route tree
├── sw.ts                    production service worker
├── styles.css               Tailwind theme tokens
├── routes/
│   ├── __root.tsx           app shell, nav, sync pill, voice/vision panels
│   ├── index.tsx            today dashboard
│   ├── login.tsx            auth screen
│   ├── workouts.tsx         workout CRUD
│   ├── nutrition.tsx        meal/water CRUD
│   ├── habits.tsx           habits and daily check-ins
│   ├── goals.tsx            goals and progress updates
│   ├── profile.tsx          account, push, export, force sync
│   └── controls.tsx         voice/gesture reference
├── components/
│   ├── SyncPill.tsx
│   ├── VoicePanel.tsx
│   ├── VisionPanel.tsx
│   ├── CommandPalette.tsx
│   ├── ShortcutsOverlay.tsx
│   └── ui-bits.tsx
└── lib/
    ├── api.ts               fetch wrapper and typed endpoint helpers
    ├── authStore.ts         access token and cached user state
    ├── hydrate.ts           server-to-IndexedDB hydration
    ├── idb.ts               IndexedDB wrapper
    ├── useStore.ts          generic local store hook
    ├── useSync.ts           queue, online checks, drain logic
    ├── commandBus.ts        voice/gesture command dispatcher
    ├── aiVoice.ts           Azure AI command helpers
    ├── localWhisper.ts      local speech-to-text fallback
    ├── useAzureSpeech.ts    recording and transcription flow
    ├── useGestures.ts       MediaPipe gesture recognition
    └── useNotifications.ts  PushManager integration
```

## Offline Behavior

Local changes are written to IndexedDB first. If the API call fails because the
server is unreachable, the app stores a queue item in `syncQueue`. The SyncPill
shows the online/offline/syncing state, and the Profile page can force a sync.

The sync queue supports:

- workouts: create and delete
- meals/drinks: create and delete
- habits: create and delete
- habit check-ins: create and delete
- goals: create, update, and delete

Hydration from the server is skipped while pending sync events exist so unsynced
local changes are not overwritten.

## Production Build

```bash
npm run build
npm run preview
```

The service worker is generated into `dist/sw.js`. Large runtime assets such as
ONNX wasm are not precached; they are fetched on demand.

## Troubleshooting

Vite proxy errors for `/api/health` mean the Express server is not reachable on
port `3000`.

Missing module errors for `@huggingface/transformers` or
`@mediapipe/tasks-vision` mean dependencies are not installed:

```bash
npm install
```

If data appears locally but not on the server, check the SyncPill and use Force
sync on the Profile page after the API is running again.
