import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

const [html, app, styles, serviceWorker, manifest] = await Promise.all([
    readFile(new URL('index.html', root), 'utf8'),
    readFile(new URL('app.js', root), 'utf8'),
    readFile(new URL('styles.css', root), 'utf8'),
    readFile(new URL('sw.js', root), 'utf8'),
    readFile(new URL('manifest.webmanifest', root), 'utf8')
]);

test('HTML usa un foglio di stile e un modulo JavaScript esterni', () => {
    assert.match(html, /<link rel="stylesheet" href="\.\/styles\.css">/);
    assert.match(html, /<script type="module" src="\.\/app\.js"><\/script>/);
    assert.doesNotMatch(html, /<style\b/i);
    assert.doesNotMatch(html, /<script\b[^>]*type=["']module["'][^>]*>[\s\S]*?<\/script>/i);
    assert.equal((html.match(/<link rel="stylesheet"/g) || []).length, 1);
    assert.ok(styles.length > 0);
});

test('tutte le funzioni richiamate dagli handler HTML sono esposte su window', () => {
    const exportBlock = app.match(/Object\.assign\(window,\s*\{([\s\S]*?)\}\s*\)/);
    assert.ok(exportBlock, 'Object.assign(window, ...) deve esporre le azioni HTML');

    const exposed = new Set(
        [...exportBlock[1].matchAll(/\b([A-Za-z_$][\w$]*)\b/g)].map(match => match[1])
    );
    const handlers = [...html.matchAll(/\bon[a-z]+\s*=\s*(["'])([\s\S]*?)\1/gi)];
    assert.ok(handlers.length > 0, 'Devono essere presenti handler HTML da verificare');

    for (const handler of handlers) {
        const expression = handler[2].trim();
        assert.doesNotMatch(
            expression,
            /\bappState\b/,
            `L'handler "${expression}" non deve accedere direttamente allo stato privato del modulo`
        );
        const action = expression.match(/^([A-Za-z_$][\w$]*)\s*\(/);
        assert.ok(action, `Handler non riconosciuto: ${expression}`);
        assert.ok(
            exposed.has(action[1]),
            `L'azione "${action[1]}" usata da "${expression}" non è esposta su window`
        );
    }
});

test("i pulsanti per ripetere lo stesso set usano l'azione pubblica", () => {
    assert.equal(
        (html.match(/openCurrentSetNewPathDialog\(\)/g) || []).length,
        2
    );
    assert.match(app, /function openCurrentSetNewPathDialog\(\)\s*\{\s*openNewPathDialog\(appState\.setId\);/);
    assert.match(app, /\bopenCurrentSetNewPathDialog\s*,/);
});

test('il service worker mette in cache tutti i moduli necessari offline', () => {
    const filesDeclaration = serviceWorker.match(/const FILES\s*=\s*\[([\s\S]*?)\];/);
    assert.ok(filesDeclaration, 'Elenco FILES del service worker non trovato');

    const cachedFiles = new Set(
        [...filesDeclaration[1].matchAll(/'([^']+)'/g)].map(match => match[1])
    );
    for (const file of [
        './',
        'index.html',
        'styles.css',
        'app.js',
        'src/diario-core.mjs',
        'manifest.webmanifest',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-512.png'
    ]) {
        assert.ok(cachedFiles.has(file), `File non precaricato: ${file}`);
    }
});

test('manifest mantiene URL e ambito relativi per il deploy in sottocartella', () => {
    const parsed = JSON.parse(manifest);
    assert.equal(parsed.start_url, './');
    assert.equal(parsed.scope, './');
    assert.equal(parsed.display, 'standalone');
});
