import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

const [html, app, styles, serviceWorker] = await Promise.all([
    readFile(new URL('index.html', root), 'utf8'),
    readFile(new URL('app.js', root), 'utf8'),
    readFile(new URL('styles.css', root), 'utf8'),
    readFile(new URL('sw.js', root), 'utf8')
]);

const sectionStart = html.indexOf('<section id="view-partenza"');
const routeView = html.slice(sectionStart, html.indexOf('<!-- ========================================================= -->', sectionStart + 1));

test('la navigazione mantiene la tab tecnica e presenta il nome Percorso', () => {
    assert.match(html, /id="nav-partenza"[^>]*>[\s\S]*?<span>Percorso<\/span>/);
    assert.match(html, /<section id="view-partenza"/);
    assert.ok(sectionStart >= 0);
});

test('i dati del profilo restano collegati agli stessi identificativi e aggiornamenti', () => {
    for (const id of ['setup-name', 'setup-start-date', 'setup-morning-time', 'setup-evening-time']) {
        assert.equal((routeView.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, id);
        assert.match(routeView, new RegExp('for="' + id + '"'));
    }
    assert.match(routeView, /updateProfile\('name', this\.value\)/);
    assert.match(routeView, /updateProfile\('startDate', this\.value\)/);
    assert.match(routeView, /updateProfile\('morningTime', this\.value\)/);
    assert.match(routeView, /updateProfile\('eveningTime', this\.value\)/);
});

test('la rilevazione iniziale conserva i riferimenti usati dal rendering e dal salvataggio', () => {
    assert.match(routeView, /id="baseline-scents-container"/);
    assert.match(routeView, /id="setup-initial-notes"/);
    assert.match(routeView, /updateProfile\('initialNotes', this\.value\)/);
    assert.match(app, /function renderBaselineView\(\)/);
    assert.match(app, /setBaselineScore\('\$\{scent\.id\}', \$\{val\}\)/);
    assert.match(app, /aria-pressed="\$\{isSelected\}"/);
    assert.match(app, /aria-label="Impressione iniziale per \$\{scent\.name\}"/);
});

test('kit e backup sono sezioni separate con gli stessi comandi esistenti', () => {
    assert.match(routeView, /id="refill-status"/);
    assert.match(routeView, /onclick="markRefilled\(\)"/);
    assert.match(routeView, /id="backup-status"/);
    assert.match(routeView, /onclick="exportData\(\)"/);
    assert.match(routeView, /onchange="importData\(event\)"/);
    assert.match(app, /function markRefilled\(\)/);
    assert.match(app, /async function exportData\(\)/);
    assert.match(app, /function importData\(event\)/);
});

test('il ripristino da file resta accessibile e la spiegazione dei dati locali è presente', () => {
    const labelStart = routeView.indexOf('<label class="diary-file-action');
    const labelEnd = routeView.indexOf('</label>', labelStart);
    const fileAction = routeView.slice(labelStart, labelEnd);
    assert.ok(labelStart >= 0 && labelEnd > labelStart, 'Etichetta del ripristino non trovata');
    assert.ok(fileAction.includes('id="backup-file-input"'));
    assert.ok(fileAction.includes('class="diary-visually-hidden"'));
    assert.match(styles, /\.diary-visually-hidden\s*\{[^}]*clip:\s*rect\(0, 0, 0, 0\)/s);
    assert.match(styles, /\.diary-tools-grid\s*\{/);
    assert.match(routeView, /aria-live="polite"/);
    assert.match(routeView, /non viene inviato a un server/);
    assert.match(routeView, /sostituisce i dati attuali dopo una richiesta di conferma/);
    assert.match(styles, /\.diary-file-action:focus-within/);
});

test('la UI della scheda Percorso è disponibile anche dopo l’aggiornamento PWA', () => {
    assert.match(serviceWorker, /const CACHE = 'diario-olfattivo-v13'/);
    for (const file of ['index.html', 'styles.css', 'app.js']) {
        assert.match(serviceWorker, new RegExp(file.replace('.', '\\.') ));
    }
});

test('gli identificativi HTML restano univoci', () => {
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, new Set(ids).size, 'Non devono esserci ID duplicati');
    assert.doesNotMatch(html, /class="sr-only"/);
});
