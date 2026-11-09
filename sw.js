// Service Worker für Vertretungsstatistik Heimbürgeschule Kahla
const CACHE_NAME = 'vertretung-hbs-v3.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './logo.png'
];

// Installation: Cache befüllen (mit cache: 'reload' gegen veraltete HTTP-Caches)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        ASSETS_TO_CACHE.map((url) => {
          return fetch(url, { cache: 'reload' })
            .then((res) => {
              if (res.ok) return cache.put(url, res);
            })
            .catch((err) => console.warn("SW Precache Warnung für:", url, err));
        })
      );
    })
  );
});

// Aktivierung: Alte Caches aufräumen
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
    }).then(() => self.clients.claim())
  );
});

// Fetch-Strategie: Network First with Cache Fallback
self.addEventListener('fetch', (event) => {
  // Nur GET-Anfragen cachen (Firebase / Firestore API-Aufrufe direkt durchlassen)
  if (event.request.method !== 'GET' || event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('firebase')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Erfolgreiche Antwort in Cache klonen
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline-Fallback aus dem Cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});
