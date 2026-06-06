const CACHE_NAME = 'darayya-doctor-v3';
const STATIC_ASSETS = ['/', '/doctor-pwa', '/index.html'];

// Install: cache static shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch(() => {})
    )
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API/sockets, cache-first for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and API/socket requests — always go to network
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response && response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        }
        return response;
      })
      .catch(() =>
        // Offline fallback: serve from cache
        caches.match(event.request).then((cached) => cached || caches.match('/index.html'))
      )
  );
});
