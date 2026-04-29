const CACHE_NAME = 'fitness-buddy-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/db-local.js',
    '/voice.js',
    '/manifest.json',
    '/icons/icon-192.svg',
    '/icons/icon-512.svg',
    '/icons/workout-running.svg',
    '/icons/workout-cycling.svg',
    '/icons/workout-swimming.svg',
    '/icons/workout-gym.svg',
    '/icons/workout-yoga.svg',
    '/icons/workout-default.svg'
];

// Install: pre-cache all static shell assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: cache-first for static, network-first for API
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Always go to network for API calls
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/oauth')) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // Cache-first for static assets
    event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        // Offline fallback for navigation requests
        if (request.mode === 'navigate') {
            return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503 });
    }
}

async function networkFirst(request) {
    try {
        return await fetch(request);
    } catch {
        const cached = await caches.match(request);
        return cached || new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Push notification handler
self.addEventListener('push', event => {
    let data = { title: 'FitnessBuddy', body: 'Novo obvestilo' };
    if (event.data) {
        try { data = { ...data, ...JSON.parse(event.data.text()) }; } catch {}
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icons/icon-192.svg',
            badge: '/icons/icon-192.svg',
            tag: 'fitness-buddy-push',
            renotify: true,
            data: data.url || '/',
            actions: [
                { action: 'open', title: 'Odpri aplikacijo' },
                { action: 'close', title: 'Zapri' }
            ]
        })
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();
    if (event.action === 'close') return;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            return clients.openWindow(event.notification.data || '/');
        })
    );
});

// Background sync handler
self.addEventListener('sync', event => {
    if (event.tag === 'sync-pending') {
        event.waitUntil(syncPendingData());
    }
});

async function syncPendingData() {
    // Signal all clients to trigger sync
    const clientList = await clients.matchAll({ type: 'window' });
    for (const client of clientList) {
        client.postMessage({ type: 'SYNC_PENDING' });
    }
}
