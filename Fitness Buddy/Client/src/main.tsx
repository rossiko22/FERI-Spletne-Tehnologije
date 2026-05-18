import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';

import { getRouter } from './router';
import './styles.css';

const router = getRouter();

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
