import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [html, app] = await Promise.all([
    readFile(new URL('index.html', root), 'utf8'),
    readFile(new URL('app.js', root), 'utf8')
]);

test('i dialoghi di ripristino e importazione sono nominati e descritti per le tecnologie assistive', () => {
    for (const id of ['restore-modal', 'import-modal']) {
        assert.match(html, new RegExp('id="' + id + '" role="dialog" aria-modal="true" aria-labelledby='));
    }
    for (const id of ['restore-dialog-title', 'restore-dialog-description', 'import-dialog-title', 'import-dialog-description']) {
        assert.match(html, new RegExp('id="' + id + '"'));
    }
    assert.match(html, /id="restore-dialog-cancel" data-dialog-initial-focus/);
    assert.match(html, /id="import-dialog-cancel" data-dialog-initial-focus/);
});

test('le nuove finestre usano il gestore focus ed Escape già condiviso', () => {
    assert.match(app, /else if \(modal\.id === 'restore-modal'\) closeRestoreDialog\(\)/);
    assert.match(app, /else if \(modal\.id === 'import-modal'\) closeImportDialog\(\)/);
    for (const fn of ['openRestoreDialog', 'closeRestoreDialog', 'confirmRestore', 'openImportDialog', 'closeImportDialog', 'confirmImport']) {
        assert.match(app, new RegExp('\\b' + fn + ','));
    }
});

test('l’importazione non usa più la conferma nativa del browser', () => {
    const start = app.indexOf('function importData(event)');
    const end = app.indexOf('// TIMER GUIDATO DEL RITUALE', start);
    const handler = app.slice(start, end);
    assert.ok(start >= 0 && end > start);
    assert.match(handler, /openImportDialog\(candidate\)/);
    assert.doesNotMatch(handler, /confirm\(/);
});

test('il ripristino conserva l’accesso alla chiave di migrazione precedente', () => {
    assert.match(app, /const LEGACY_KEY = 'sos-smell-journey-set01-v1'/);
    assert.match(app, /localStorage\.getItem\(LEGACY_KEY\)/);
});


test('ogni percorso archiviato mostra un’azione di ripristino accessibile al tocco', () => {
    assert.match(app, /onclick="openRestoreDialog\(\$\{i\}\)"/);
    assert.match(app, /function restoreArchived\(index\)/);
    assert.match(app, /calendarNav\.focus\(\{ preventScroll: true \}\)/);
});
