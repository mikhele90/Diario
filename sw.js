// Le risorse di codice vengono aggiornate dalla rete con timeout e fallback cache.
// Le altre risorse same-origin restano cache-first per ridurre richieste e mantenere l'offline.
const CACHE_PREFIX = 'diario-olfattivo-';
const CACHE = 'diario-olfattivo-v17';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'src/diario-core.mjs', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'icon.svg', 'icon-maskable.svg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(request, cacheKey = request) {
  const network = fetch(request.url, { cache: 'no-cache' }).then(response => {
    if (response.ok) {
      caches.open(CACHE)
        .then(cache => cache.put(cacheKey, response.clone()))
        .catch(() => {});
    }
    return response;
  });
  const timeout = new Promise(resolve => setTimeout(() => resolve(null), 3000));
  return Promise.race([network.catch(() => null), timeout]).then(response => {
    if (response) return response;
    return caches.match(cacheKey, { ignoreSearch: true }).then(cached => cached || network);
  });
}

function isRefreshableAsset(pathname) {
  return /\/(?:app\.js|styles\.css|manifest\.webmanifest|icon\.svg|icon-maskable\.svg|src\/diario-core\.mjs)$/.test(pathname);
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
    event.respondWith(networkFirst(request, 'index.html'));
  } else if (isRefreshableAsset(url.pathname)) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(caches.match(request, { ignoreSearch: true }).then(cached => cached || fetch(request)));
  }
});
