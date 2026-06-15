importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE_NAME = 'ntrack-offline-v1';
const offlineFallbackPage = '/offline.html';

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', async (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(offlineFallbackPage))
  );
});

if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preloadResp = await event.preloadResponse;
          if (preloadResp) return preloadResp;

          const networkResp = await fetch(event.request);
          return networkResp;
        } catch (error) {
          const cache = await caches.open(CACHE_NAME);
          const cachedResp = await cache.match(offlineFallbackPage);
          return cachedResp;
        }
      })()
    );
  } else {
    // For non-navigation requests, use network-first strategy (optional)
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});