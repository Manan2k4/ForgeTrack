// Consolidated Service Worker for Admin Panel
const CACHE_NAME = 'forge-admin-v3';
const CORE_ASSETS = [
  '/',
  '/index.html'
];

// Install - cache core assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean up old caches and take control of clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim()).then(() => {
      // Notify clients that a new service worker has activated
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_NAME });
        });
      });
    })
  );
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Network-first for JS/CSS and API calls (keep cache updated)
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

  // Cache-first for other same-origin assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((resp) => {
        const copy = resp.clone();
        if (resp.ok && request.url.startsWith(self.location.origin)) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return resp;
      }).catch(() => {
        // Fallback to the app shell for navigation requests
        if (request.destination === 'document') {
          return caches.match('/');
        }
      });
    })
  );
});

// Message handler - allow page to tell worker to skip waiting
self.addEventListener('message', (event) => {
  if (!event.data) return;
  const { type } = event.data;
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  // support a reload-all command from the page if needed
  if (type === 'RELOAD_ALL_CLIENTS') {
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'RELOAD_PAGE' }));
    });
  }
});