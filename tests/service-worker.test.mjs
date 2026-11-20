import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const swSource = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const ORIGIN = 'https://utente.github.io';

function boot({ cached = {}, network, instantTimeout = false }) {
    const handlers = {};
    const store = new Map(Object.entries(cached));
    const calls = [];
    const keyOf = key => (typeof key === 'string' ? key : new URL(key.url).pathname.split('/').pop() || 'index.html');
    const caches = {
        open: async () => ({ put: async (key, value) => { store.set(keyOf(key), value); } }),
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
        caches, fetch: fetchFn, URL, Promise, console,
        setTimeout: instantTimeout ? fn => Promise.resolve().then(fn) : setTimeout
    };
    vm.createContext(context);
    vm.runInContext(swSource, context);
    const run = (url, mode = 'cors') => {
        let response;
        handlers.fetch({ request: { method: 'GET', url, mode }, respondWith: promise => { response = promise; } });
        return response;
    };
    return { run, calls, store };
}

const response = body => ({ ok: true, body, clone() { return this; } });
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test('app.js viene aggiornata dalla rete anche se in cache c’è una versione precedente', async () => {
    const sw = boot({ cached: { 'app.js': response('VECCHIO') }, network: async () => response('NUOVO') });
    assert.equal((await sw.run(`${ORIGIN}/Diario/app.js`)).body, 'NUOVO');
    await tick();
    assert.equal(sw.store.get('app.js').body, 'NUOVO');
});

test('modulo e foglio di stile usano la stessa strategia network-first', async () => {
    const sw = boot({
        cached: { 'diario-core.mjs': response('V'), 'styles.css': response('V') },
        network: async url => response('N:' + url.split('/').pop())
    });
    assert.equal((await sw.run(`${ORIGIN}/Diario/src/diario-core.mjs`)).body, 'N:diario-core.mjs');
    assert.equal((await sw.run(`${ORIGIN}/Diario/styles.css`)).body, 'N:styles.css');
});

test('le icone vettoriali si aggiornano dalla rete ma restano disponibili offline', async () => {
    const sw = boot({
        cached: { 'icon.svg': response('VECCHIA') },
        network: async () => response('NUOVA')
    });
    assert.equal((await sw.run(`${ORIGIN}/Diario/icon.svg`)).body, 'NUOVA');
    await tick();
    assert.equal(sw.store.get('icon.svg').body, 'NUOVA');
});

test('offline viene usata la copia salvata degli asset di codice', async () => {
    const sw = boot({
        cached: { 'app.js': response('VECCHIO') },
        network: async () => { throw new Error('offline'); }
    });
    assert.equal((await sw.run(`${ORIGIN}/Diario/app.js`)).body, 'VECCHIO');
});

test('se la rete è troppo lenta viene usata la copia salvata', async () => {
    const sw = boot({
        cached: { 'app.js': response('VECCHIO') },
        network: () => new Promise(() => {}),
        instantTimeout: true
    });
    assert.equal((await sw.run(`${ORIGIN}/Diario/app.js`)).body, 'VECCHIO');
});

test('la navigazione salva la pagina con la chiave index.html', async () => {
    const sw = boot({ network: async () => response('PAGINA') });
    assert.equal((await sw.run(`${ORIGIN}/Diario/`, 'navigate')).body, 'PAGINA');
    await tick();
    assert.equal(sw.store.get('index.html').body, 'PAGINA');
});

test('le icone PNG restano cache-first', async () => {
    const sw = boot({
        cached: { 'icon-192.png': response('ICONA') },
        network: async () => response('RETE')
    });
    assert.equal((await sw.run(`${ORIGIN}/Diario/icon-192.png`)).body, 'ICONA');
    assert.equal(sw.calls.length, 0);
});

test('le richieste verso altri siti non vengono intercettate', () => {
    const sw = boot({ network: async () => response('X') });
    assert.equal(sw.run('https://altro.example/script.js'), undefined);
});

test('la cache è versionata e precarica i file necessari, incluse le icone SVG', () => {
    assert.match(swSource, /const CACHE = 'diario-olfattivo-v17'/);
    for (const file of [
        'index.html', 'styles.css', 'app.js', 'src/diario-core.mjs',
        'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
        'icon-maskable-512.png', 'icon.svg', 'icon-maskable.svg'
    ]) {
        assert.ok(swSource.includes(`'${file}'`), `manca ${file} in FILES`);
    }
});
