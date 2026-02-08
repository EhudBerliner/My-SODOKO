const CACHE_NAME = 'sudoku-ultimate-v1'; // שם קבוע
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './logo.png'
];

// התקנה - טעינת קבצים בסיסיים
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// הפעלה - ניקוי קאש ישן (אם השם ישתנה בעתיד)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// אסטרטגיה: נסה רשת, אם נכשל קח מהקאש, ועדכן את הקאש ברקע
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // אם התגובה תקינה, שמור אותה בקאש לעבודה באופליין
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // אם אין רשת, חפש בקאש
        return caches.match(event.request);
      })
  );
});
