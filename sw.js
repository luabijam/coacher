/* COACHER service worker — bump VERSION when deploying asset changes. */
const VERSION = 'coacher-v3';
const BASE = new URL('./', self.location).href;
const INDEX = new URL('index.html', BASE).href;
const ASSETS = [
  INDEX,
  new URL('styles.css?v=4', BASE).href,
  new URL('app.js?v=4', BASE).href,
  new URL('manifest.webmanifest', BASE).href,
  new URL('assets/favicon.svg', BASE).href,
  new URL('assets/icon-192.png', BASE).href,
  new URL('assets/icon-512.png', BASE).href,
  new URL('assets/icon-maskable-512.png', BASE).href,
  new URL('assets/apple-touch-icon.png', BASE).href,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pages: network first, fall back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(INDEX, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(INDEX);
          return cached || new Response('离线', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        })
    );
    return;
  }

  // Static assets: network first so deployed updates are picked up; cache fallback for offline.
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      } catch (error) {
        const cached = await caches.match(request);
        return cached || new Response('', { status: 504 });
      }
    })()
  );
});
