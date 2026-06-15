const CACHE_NAME = 'ntrack-v2'; // increment version when changing
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon.png',
  '/screenshots/mobile.png',
  '/screenshots/desktop.png'
  // Add your main JS/CSS bundles – but they are generated with hash names, difficult to hardcode.
  // Instead, let the service worker cache them on demand via fetch.
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Try to cache each URL individually; ignore failures
      return Promise.allSettled(
        urlsToCache.map(url => cache.add(url).catch(err => console.warn(`Failed to cache ${url}:`, err)))
      );
    })
  );
  self.skipWaiting(); // activate immediately
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;
      return fetch(event.request).then(fetchResponse => {
        // Cache successful responses for future offline use (optional)
        if (fetchResponse && fetchResponse.status === 200) {
          const responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return fetchResponse;
      }).catch(() => {
        // If offline and not cached, maybe return a fallback page
        return caches.match('/');
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});