const CACHE_NAME = 'fitness-buddy-v3';

const STATIC_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './offline.html',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './images/workout.jpg',
    './images/habit.jpg',
    './images/meal.jpg'
];

// INSTALL - shrani statične datoteke v cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
    );

    self.skipWaiting();
});

// ACTIVATE - izbriše stare cache verzije
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );

    self.clients.claim();
});

// FETCH - offline podpora
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // API klicev na port 3000 ne prestrezamo
    // tako lahko app.js pravilno zazna napako in shrani akcijo v offlineQueue
    if (requestUrl.port === '3000') {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request).catch(() => {
                return caches.match('./offline.html');
            });
        })
    );
});

// PUSH NOTIFICATIONS
self.addEventListener('push', (event) => {
    let data = {
        title: 'Fitness Buddy',
        body: 'Novo obvestilo.'
    };

    if (event.data) {
        data = event.data.json();
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: './icons/icon-192.png'
        })
    );
});