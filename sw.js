// index.html: prima la rete (se risponde entro 3 s), altrimenti la copia salvata, così gli aggiornamenti
// arrivano alla prima apertura e l'app funziona anche offline. Cambia la versione solo se modifichi FILES.
const CACHE_PREFIX = 'diario-olfattivo-';
const CACHE = 'diario-olfattivo-v10';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'src/diario-core.mjs', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks
        .filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE)
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(req) {
  const fromNet = fetch(req.url, { cache: 'no-cache' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); }
    return res;
  });
  const timeout = new Promise(resolve => setTimeout(() => resolve(null), 3000));
  return Promise.race([fromNet.catch(() => null), timeout])
    .then(res => res || caches.match('index.html').then(c => c || fromNet));
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (e.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
    e.respondWith(networkFirst(e.request));
  } else {
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
  }
});
