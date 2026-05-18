/// <reference lib="webworker" />
//
// Service worker — OWNER: Ana.
//
// `vite-plugin-pwa` with `strategies: 'injectManifest'` will inject the
// precache list as `self.__WB_MANIFEST` so Workbox can use it.
//
// Responsibilities (PWA criterion):
//   1. Precache the built app shell so the app loads offline.
//   2. Runtime cache for /api/* GETs (stale-while-revalidate).
//   3. Receive push events and show OS notifications (Web Push criterion).
//   4. Handle notification clicks → open the relevant route.

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

// Cache GET /api/* with stale-while-revalidate so the app still shows last-known
// data when offline. Mutations (POST/PUT/DELETE) intentionally bypass the cache
// — they queue client-side via useSync.ts.
registerRoute(
  ({ url, request }) => url.pathname.startsWith('/api/') && request.method === 'GET',
  new StaleWhileRevalidate({ cacheName: 'api-get' }),
);

// HTML navigations: prefer network, fall back to the cached shell.
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({ cacheName: 'pages' }),
);

// --- Web Push (Ana) ---
self.addEventListener('push', (event) => {
  let payload: { title: string; body?: string; url?: string } = { title: 'FitnessBuddy' };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    payload.body = event.data?.text();
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: payload.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

self.skipWaiting();
