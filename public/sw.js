const CACHE = 'tiago-v1';

// Páginas e assets a pré-cachear
const PRECACHE = ['/', '/projects'];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE).then((c) => c.addAll(PRECACHE))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;

    const url = new URL(e.request.url);

    // Assets estáticos → cache first
    if (/\.(js|css|png|jpg|jpeg|webp|svg|ico|woff2?)$/.test(url.pathname)) {
        e.respondWith(
            caches.match(e.request).then(
                (hit) => hit ?? fetch(e.request).then((res) => {
                    const copy = res.clone();
                    caches.open(CACHE).then((c) => c.put(e.request, copy));
                    return res;
                })
            )
        );
        return;
    }

    // Páginas → network first, fallback cache
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});
