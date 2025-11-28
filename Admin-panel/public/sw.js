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
  const url = new URL(request.url);

  // Treat navigations (HTML pages) as network-first so we don't serve stale index.html
  const isNavigation = request.mode === 'navigate' || (request.headers.get && request.headers.get('accept') && request.headers.get('accept').includes('text/html')) || request.destination === 'document';

  if (isNavigation) {
    event.respondWith(
      fetch(request).then((resp) => {
        // Update cache with the fresh HTML for offline fallback
        try {
          const copy = resp.clone();
          if (resp.ok) caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
        } catch (e) { /* ignore */ }
        return resp;
      }).catch(() => caches.match('/index.html') || caches.match('/'))
    );
    return;
  }

  // Network-first for JS/CSS and API calls (keep cache updated)
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.startsWith('/api/')) {
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
          return caches.match('/index.html') || caches.match('/');
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
  // Allow page to explicitly ask the worker to check for updates (call registration.update())
  if (type === 'CHECK_FOR_UPDATES') {
    if (self.registration && self.registration.update) {
      self.registration.update().then(() => {
        // Notify page that update check completed; if a new SW is waiting, client pages can prompt
        self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => client.postMessage({ type: 'CHECK_FOR_UPDATES_DONE' }));
        });
      }).catch(() => {
        self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => client.postMessage({ type: 'CHECK_FOR_UPDATES_FAILED' }));
        });
      });
    }
  }
});