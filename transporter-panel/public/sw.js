// Service worker with network-first strategy for Transporter Panel
const CACHE_NAME = 'transporter-shell-v2';
const SHELL_FILES = [
  '/',
  '/index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
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
      fetch(request).then(resp => {
        const copy = resp.clone();
        if (resp.ok) {
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return resp;
      }).catch(() => caches.match(request))
    );
    return;
  }
  
  // Cache-first for navigation, fallback to index.html for offline
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).catch(() => {
        if (request.mode === 'navigate') return caches.match('/index.html');
      });
    })
  );
});