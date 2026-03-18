// Service Worker for Sudoku PWA - Offline-First Strategy
const CACHE_NAME = 'sudoku-cache-v9.5.2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing v9.5.1...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Installed successfully');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating v9.5.1...');
  const CURRENT_CACHE = CACHE_NAME;
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CURRENT_CACHE).map(k => {
          console.log('[Service Worker] Deleting old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
      .then(() => console.log('[Service Worker] Activated successfully'))
  );
});

// Fetch event - CACHE FIRST, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return networkResponse;
          })
          .catch((error) => {
            console.log('[SW] Network failed:', error.message);
            return new Response('Offline - Resource not cached', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[Service Worker] Loaded successfully - Cache-First Strategy');
