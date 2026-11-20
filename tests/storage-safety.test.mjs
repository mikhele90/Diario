import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('la chiave di migrazione precedente resta disponibile', () => {
    assert.match(app, /const LEGACY_KEY = 'sos-smell-journey-set01-v1'/);
    assert.match(app, /raw = localStorage\.getItem\(LEGACY_KEY\)/);
});

test('i dati illeggibili vengono copiati prima del salvataggio dello stato vuoto', () => {
    const initStart = app.indexOf('function initLocalSave()');
    const initEnd = app.indexOf('function renderActiveTab()', initStart);
    const init = app.slice(initStart, initEnd);
    const copyAt = init.indexOf('localStorage.setItem(CORRUPT_KEY, raw)');
    const saveAt = init.lastIndexOf('else saveNow()');
    assert.ok(copyAt >= 0, 'manca il tentativo di copia dei dati originali');
    assert.ok(saveAt > copyAt, 'il salvataggio vuoto deve avvenire solo dopo il tentativo di copia');
    assert.match(init, /corruptRawInMemory = raw/);
    assert.match(init, /corruptRecoveryBlocked = true/);
});

test('se la copia non può essere conservata, saveNow non sovrascrive l’originale', () => {
    const saveStart = app.indexOf('function saveNow()');
    const saveEnd = app.indexOf('// Salvataggio automatico', saveStart);
    const save = app.slice(saveStart, saveEnd);
    assert.match(save, /if \(corruptRecoveryBlocked\)/);
    assert.ok(save.indexOf('corruptRecoveryBlocked') < save.indexOf('localStorage.setItem(STORAGE_KEY'));
});

test('l’esportazione della copia non la registra come backup ordinario', () => {
    const start = app.indexOf('async function exportCorruptCopy()');
    const end = app.indexOf('function deleteCorruptCopy()', start);
    const body = app.slice(start, end);
    assert.match(body, /corruptRawInMemory/);
    assert.match(body, /navigator\.share/);
    assert.match(body, /downloadRecoveryCopy\(raw, name\)/);
    assert.doesNotMatch(body, /markBackupDone/);
});

test('l’avviso offre esportazione, eliminazione esplicita e rinvio', () => {
    assert.match(html, /id="corrupt-banner" role="alert"/);
    for (const action of ['exportCorruptCopy', 'downloadCorruptCopy', 'deleteCorruptCopy', 'dismissCorruptNotice']) {
        assert.match(html, new RegExp(`onclick="${action}\\(\\)"`));
        assert.match(app, new RegExp(`\\b${action},`));
    }
});
