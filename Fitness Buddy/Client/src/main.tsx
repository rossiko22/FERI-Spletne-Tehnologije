import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';

import { getRouter } from './router';
import { refreshSession } from './lib/api';
import { hydrateUserData } from './lib/hydrate';
import { markOfflineReady } from './lib/authStore';
import './styles.css';

const router = getRouter();

// Boot: exchange the httpOnly refresh cookie for an in-memory access token.
// Resolving this flips auth status from `loading` to `authed`/`anon`. If the
// server is unreachable (offline), fall back to the cached user if we have one.
refreshSession().then((ok) => {
  if (ok) hydrateUserData();
  else markOfflineReady();
});

// --- Service worker (Ana) ---
// Production: register the PWA service worker for offline support.
// Development: actively unregister any stale SW and wipe its caches, otherwise a
// previously-registered worker keeps serving an old bundle and hides source edits.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        registerSW({
          immediate: true,
          onRegisteredSW(swUrl) { console.log('[sw] registered', swUrl); },
          onOfflineReady() { console.log('[sw] offline ready'); },
        });
      })
      .catch((err) => console.warn('[sw] register failed', err));
  } else {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => { if (regs.length) { regs.forEach((r) => r.unregister()); console.warn('[sw] dev: unregistered stale worker(s) — reload once'); } })
      .catch(() => {});
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
    }
  }
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
