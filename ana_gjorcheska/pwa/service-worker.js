const CACHE_NAME = 'fitness-buddy-v1';
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

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request).then((response) => {
                return response || caches.match('./offline.html');
            });
        })
    );
});

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