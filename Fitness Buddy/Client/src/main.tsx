import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';

import { getRouter } from './router';
import { refreshSession } from './lib/api';
import { markOfflineReady } from './lib/authStore';
import './styles.css';

const router = getRouter();

// Boot: exchange the httpOnly refresh cookie for an in-memory access token.
// Resolving this flips auth status from `loading` to `authed`/`anon`. If the
// server is unreachable (offline), fall back to the cached user if we have one.
refreshSession().then((ok) => { if (!ok) markOfflineReady(); });

// --- Service worker registration (Ana) ---
// `virtual:pwa-register` is injected by vite-plugin-pwa.
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      registerSW({
        immediate: true,
        onRegisteredSW(swUrl) {
          console.log('[sw] registered', swUrl);
        },
        onOfflineReady() {
          console.log('[sw] offline ready');
        },
      });
    })
    .catch((err) => console.warn('[sw] register failed', err));
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
