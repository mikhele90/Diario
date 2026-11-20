// Le pagine, gli script, i moduli e gli stili provano prima la rete; offline usano la cache.
// Gli asset grafici restano cache-first per evitare richieste inutili.
const CACHE_PREFIX = 'diario-olfattivo-';
const CACHE = 'diario-olfattivo-v18';
const FILES = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'src/diario-core.mjs',
  'src/storage-recovery.mjs',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'icon.svg',
  'icon-maskable.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
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

function networkFirst(request, cacheKey, event) {
  const key = cacheKey || request;
  const fromNetwork = fetch(request.url, { cache: 'no-cache' }).then(async response => {
    if (response.ok) {
      try {
        const cache = await caches.open(CACHE);
        await cache.put(key, response.clone());
      } catch (error) {
        // Un errore di cache non deve impedire di usare la risposta di rete.
      }
    }
    return response;
  });

  // Mantiene vivo il service worker anche quando il timeout fa restituire subito la cache.
  event.waitUntil(fromNetwork.then(() => undefined).catch(() => undefined));

  const timeout = new Promise(resolve => setTimeout(() => resolve(null), 3000));
  return Promise.race([fromNetwork.catch(() => null), timeout]).then(response => {
    if (response) return response;
    return caches.match(key, { ignoreSearch: true }).then(cached => cached || fromNetwork);
  });
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate' ||
      url.pathname.endsWith('/') ||
      url.pathname.endsWith('/index.html')) {
    event.respondWith(networkFirst(event.request, 'index.html', event));
    return;
  }

  if (/\/icon-[\w-]+\.png$/.test(url.pathname) ||
      /\/icon(?:-maskable)?\.svg$/.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then(cached => cached || fetch(event.request))
    );
    return;
  }

  event.respondWith(networkFirst(event.request, event.request, event));
});
