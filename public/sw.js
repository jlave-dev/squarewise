const CACHE_NAME = 'squarewise-v4';
const BASE = new URL('.', self.location).pathname.replace(/\/$/, '');
const APP_SHELL = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/manifest.json',
  BASE + '/icons/favicon.svg',
  BASE + '/icons/icon-192.png',
  BASE + '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()));
});

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_SHELL);

  const index = await cache.match(BASE + '/index.html');
  if (!index) return;

  const html = await index.text();
  const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map(([, path]) => new URL(path, self.location.origin))
    .filter((url) => url.origin === self.location.origin && url.pathname.startsWith(BASE + '/assets/'))
    .map((url) => url.href);
  await cache.addAll(assets);
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Keep navigation fresh so app updates are visible.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Fingerprinted production assets are safe for cache-first.
  const isStaticAsset = url.pathname.startsWith(BASE + '/assets/') || url.pathname.startsWith(BASE + '/icons/');
  if (isStaticAsset) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    if (request.mode === 'navigate') {
      const cachedShell = await caches.match(BASE + '/index.html');
      if (cachedShell) return cachedShell;
    }

    return new Response('Offline', { status: 503 });
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request, { ignoreVary: true });
  if (cachedResponse) return cachedResponse;

  const response = await fetch(request);
  if (isCacheable(response)) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

function isCacheable(response) {
  return Boolean(response) && response.status === 200 && (response.type === 'basic' || response.type === 'cors');
}

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
