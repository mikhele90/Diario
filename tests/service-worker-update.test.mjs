import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const swSource = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
const ORIGIN = 'https://utente.github.io';

function boot({ cached = {}, network, instantTimeout = false }) {
    const handlers = {};
    const store = new Map(Object.entries(cached));
    const calls = [];
    const keyOf = key => typeof key === 'string'
        ? key
        : (new URL(key.url).pathname.split('/').pop() || 'index.html');
    const cache = {
        addAll: async files => { for (const file of files) if (!store.has(file.split('/').pop())) store.set(file.split('/').pop(), { body: 'precache:' + file }); },
        put: async (key, value) => { store.set(keyOf(key), value); }
    };
    const caches = {
        open: async () => cache,
        match: async key => store.get(keyOf(key)),
        keys: async () => [],
        delete: async () => true
    };
    const fetchFn = async input => {
        const url = typeof input === 'string' ? input : input.url;
        calls.push(url);
        return network(url);
    };
    const context = {
        self: {
            addEventListener: (type, fn) => { handlers[type] = fn; },
            location: { origin: ORIGIN },
            clients: { claim: async () => {} },
            skipWaiting: async () => {}
        },
        caches,
        fetch: fetchFn,
        URL,
        Promise,
        console,
        setTimeout: instantTimeout ? fn => { Promise.resolve().then(fn); return 1; } : setTimeout
    };
    vm.createContext(context);
    vm.runInContext(swSource, context);
    const run = (url, mode = 'cors', method = 'GET') => {
        let responsePromise;
        const waitUntil = [];
        const event = {
            request: { method, url, mode },
            respondWith: promise => { responsePromise = promise; },
            waitUntil: promise => { waitUntil.push(promise); }
        };
        handlers.fetch(event);
        return { responsePromise, waitUntil };
    };
    return { run, calls, store };
}
const response = body => ({ ok: true, body, clone() { return this; } });
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test('gli script e i moduli aggiornano la cache anche quando esiste una copia precedente', async () => {
    const sw = boot({
        cached: { 'app.js': response('vecchio'), 'diario-core.mjs': response('vecchio') },
        network: async url => response('nuovo:' + url.split('/').pop())
    });
    const app = sw.run(ORIGIN + '/Diario/app.js');
    assert.equal((await app.responsePromise).body, 'nuovo:app.js');
    await Promise.all(app.waitUntil);
    assert.equal(sw.store.get('app.js').body, 'nuovo:app.js');

    const core = sw.run(ORIGIN + '/Diario/src/diario-core.mjs');
    assert.equal((await core.responsePromise).body, 'nuovo:diario-core.mjs');
    await Promise.all(core.waitUntil);
});

test('il modulo di persistenza locale viene salvato per l’uso offline', async () => {
    const sw = boot({ network: async () => response('diario-storage-module') });
    const result = sw.run(ORIGIN + '/Diario/src/diario-storage.mjs');
    assert.equal((await result.responsePromise).body, 'diario-storage-module');
    await Promise.all(result.waitUntil);
    assert.equal(sw.store.get('diario-storage.mjs').body, 'diario-storage-module');
});

test('offline usa la risorsa salvata e una rete lenta ricade sulla cache', async () => {
    const offline = boot({
        cached: { 'app.js': response('cache') },
        network: async () => { throw new Error('offline'); }
    });
    assert.equal((await offline.run(ORIGIN + '/Diario/app.js').responsePromise).body, 'cache');

    const slow = boot({
        cached: { 'app.js': response('cache-lenta') },
        network: () => new Promise(() => {}),
        instantTimeout: true
    });
    assert.equal((await slow.run(ORIGIN + '/Diario/app.js').responsePromise).body, 'cache-lenta');
});

test('la navigazione aggiorna index.html e lo restituisce dalla cache in caso di rete lenta', async () => {
    const online = boot({ network: async () => response('pagina aggiornata') });
    const page = online.run(ORIGIN + '/Diario/', 'navigate');
    assert.equal((await page.responsePromise).body, 'pagina aggiornata');
    await Promise.all(page.waitUntil);
    assert.equal(online.store.get('index.html').body, 'pagina aggiornata');

    const offline = boot({
        cached: { 'index.html': response('pagina offline') },
        network: () => new Promise(() => {}),
        instantTimeout: true
    });
    assert.equal((await offline.run(ORIGIN + '/Diario/', 'navigate').responsePromise).body, 'pagina offline');
});

test('icone PNG e SVG restano cache-first', async () => {
    const sw = boot({
        cached: { 'icon-192-v2.png': response('png cached'), 'icon-v2.svg': response('svg cached'), 'icon-maskable-v2.svg': response('maskable cached') },
        network: async () => response('network icon')
    });
    assert.equal((await sw.run(ORIGIN + '/Diario/icon-192-v2.png').responsePromise).body, 'png cached');
    assert.equal((await sw.run(ORIGIN + '/Diario/icon-v2.svg').responsePromise).body, 'svg cached');
    assert.equal((await sw.run(ORIGIN + '/Diario/icon-maskable-v2.svg').responsePromise).body, 'maskable cached');
    assert.equal(sw.calls.length, 0);
});

test('le richieste esterne e quelle non GET non vengono intercettate', () => {
    const sw = boot({ network: async () => response('x') });
    assert.equal(sw.run('https://altro.example/script.js').responsePromise, undefined);
    assert.equal(sw.run(ORIGIN + '/Diario/api', 'cors', 'POST').responsePromise, undefined);
});

test('la nuova cache include gli asset originali, le icone aggiornate e il modulo di sicurezza', () => {
    assert.match(swSource, /const CACHE = 'diario-olfattivo-v20'/);
    for (const file of [
        'index.html', 'styles.css', 'app.js', 'src/diario-core.mjs',
        'src/diario-storage.mjs', 'manifest.webmanifest',
        'icon-192-v2.png', 'icon-512-v2.png', 'icon-maskable-512-v2.png',
        'icon-v2.svg', 'icon-maskable-v2.svg'
    ]) assert.ok(swSource.includes("'" + file + "'"), 'manca ' + file + ' in FILES');
});
