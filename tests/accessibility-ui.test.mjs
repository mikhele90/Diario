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

test('le finestre modali hanno semantica dialog, titolo, descrizione e chiusura nominata', () => {
    assert.match(html, /id="ritual-modal" role="dialog" aria-modal="true" aria-labelledby="ritual-dialog-title" aria-describedby="timer-scent-hint"/);
    assert.match(html, /id="newpath-modal" role="dialog" aria-modal="true" aria-labelledby="newpath-dialog-title" aria-describedby="newpath-dialog-description"/);
    assert.match(html, /aria-label="Chiudi sessione guidata"/);
    assert.match(html, /id="newpath-dialog-cancel" data-dialog-initial-focus/);
});

test('i modali gestiscono focus iniziale, contenimento, Escape e ripristino', () => {
    assert.match(app, /function openAccessibleModal\(modal, initialFocusSelector\)/);
    assert.match(app, /function closeAccessibleModal\(modal\)/);
    assert.match(app, /document\.addEventListener\('keydown', event =>/);
    assert.match(app, /event\.key === 'Escape'/);
    assert.match(app, /event\.key !== 'Tab'/);
    assert.match(app, /last\.focus\(\)/);
    assert.match(app, /first\.focus\(\)/);
    assert.match(app, /target\.focus\(\{ preventScroll: true \}\)/);
    assert.match(app, /openAccessibleModal\(document\.getElementById\('ritual-modal'\), '#btn-timer-toggle'\)/);
    assert.match(app, /openAccessibleModal\(document\.getElementById\('newpath-modal'\), '#newpath-dialog-cancel'\)/);
});

test('la navigazione espone la sezione attiva e il nome del menu', () => {
    assert.match(html, /<nav aria-label="Navigazione principale"/);
    for (const tab of ['calendario', 'partenza', 'riepilogo', 'guida']) {
        assert.ok(html.includes(`aria-controls="view-${tab}"`), `Manca aria-controls per ${tab}`);
    }
    assert.match(html, /id="nav-calendario" aria-controls="view-calendario" aria-current="page"/);
    assert.match(app, /btn\.removeAttribute\('aria-current'\)/);
    assert.match(app, /activeBtn\.setAttribute\('aria-current', 'page'\)/);
});

test('i controlli generati dinamicamente hanno nomi comprensibili', () => {
    assert.match(app, /aria-label="Impressione per \$\{escapeHtml\(scent\.name\)\}, settimana \$\{w\}"/);
    assert.match(app, /pb\.setAttribute\('aria-label', `Apri la pausa dopo la settimana \$\{i\}`\)/);
});

test('i messaggi temporanei vengono annunciati dalle tecnologie assistive', () => {
    assert.match(html, /id="toast" role="status" aria-live="polite" aria-atomic="true"/);
});

test('touch target, focus visibile, mobile nav e movimento ridotto sono coerenti', () => {
    assert.match(styles, /button:not\(\.diary-session-toggle\):not\(\.diary-score-button\)\s*\{\s*min-height:\s*44px;/);
    assert.match(styles, /button:focus-visible,[\s\S]*?outline:\s*3px solid/);
    assert.match(styles, /\.diary-main-nav\s*\{\s*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
    assert.match(styles, /@media\s*\(min-width:\s*640px\)[\s\S]*?\.diary-main-nav\s*\{\s*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
    assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    assert.match(styles, /body\.diary-modal-open\s*\{\s*overflow:\s*hidden/);
});

test('i pulsanti con sola icona hanno un target touch minimo di 44 × 44 px', () => {
    for (const id of ['btn-prev-week', 'btn-next-week']) {
        assert.match(html, new RegExp(`id="${id}"[^>]*class="diary-icon-button`));
    }
    assert.match(html, /aria-label="Chiudi sessione guidata"[^>]*class="diary-icon-button/);
    assert.match(styles, /\\.diary-icon-button\\s*\\{[^}]*min-width:\\s*44px;[^}]*min-height:\\s*44px;/s);
});

test('la nuova versione della cache PWA serve le modifiche di accessibilità', () => {
    assert.match(serviceWorker, /const CACHE = 'diario-olfattivo-v13'/);
    for (const file of ['index.html', 'styles.css', 'app.js']) {
        assert.ok(serviceWorker.includes(file), `File non precaricato: ${file}`);
    }
});
