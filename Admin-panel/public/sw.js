// Service worker with network-first strategy for dynamic content
const CACHE_NAME = 'forge-admin-v2';
const CORE_ASSETS = [
  '/',
  '/index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  
  // Network-first strategy for JS/CSS and API calls
  if (request.url.includes('.js') || request.url.includes('.css') || request.url.includes('/api/')) {
    event.respondWith(
      fetch(request).then((resp) => {
        const copy = resp.clone();
        if (resp.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return resp;
      }).catch(() => caches.match(request))
    );
    return;
  }
  
  // Cache-first for other assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((resp) => {
        const copy = resp.clone();
        if (resp.ok && request.url.startsWith(self.location.origin)) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return resp;
      });
    })
  );
});