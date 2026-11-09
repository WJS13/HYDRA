const CACHE_NAME = 'hydra-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/live.html',
  '/ranking.html',
  '/group.html',
  '/challenges.html',
  '/profile.html',
  '/history.html',
  '/styles.css',
  '/app.js',
  '/nav.js',
  '/supabase-client.js',
  '/assets/logo.png',
  '/assets/avatar.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => console.warn('[Hydra SW] Pre-caching partial:', err));
    })
  );
  self.skipWaiting();
});

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
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Evitar interceptar llamadas a API o Supabase
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        return networkResponse;
      }).catch(() => {
        // Fallback offline para navegación HTML
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/dashboard.html');
        }
      });
    })
  );
});

