/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import {
  StaleWhileRevalidate,
  CacheFirst,
} from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope & typeof globalThis

clientsClaim()
self.skipWaiting()

// Vite-PWA vstavi seznam datotek sem
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// 1. SPA navigacije — vedno vrni app shell iz precache, tudi ko je DevTools Offline.
registerRoute(
  new NavigationRoute(
    createHandlerBoundToURL('/index.html')
  )
)

// 2. API GET klici — zadnji znani odgovor je na voljo offline.
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') &&
    url.pathname !== '/api/health' &&
    request.method === 'GET',
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 })
    ]
  })
)

// 3. Ikone in statični asseti — CacheFirst (redko se spremenijo)
registerRoute(
  ({ request }) =>
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.url.includes('/icon-'),
  new CacheFirst({
    cacheName: 'assets-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })
    ]
  })
)

// Push obvestila
self.addEventListener('push', (event: PushEvent) => {
  let data: { title: string; body?: string; url?: string } = { title: 'FitnessBuddy', body: 'Cas za trening!' }
  try {
    if (event.data) data = event.data.json()
  } catch {
    data.body = event.data?.text()
  }

  // Shrani v localStorage za notification center
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'PUSH_RECEIVED',
          notification: {
            title: data.title,
            body: data.body,
            url: data.url ?? '/',
            timestamp: Date.now(),
          }
        });
      });
    }).then(() =>
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url: data.url ?? '/' }
      })
    )
  )
})

// Klik na obvestilo → odpre app
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const url = event.notification.data?.url ?? '/'
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
