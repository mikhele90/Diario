import test from 'node:test';
import assert from 'node:assert/strict';
import { preserveCorruptSnapshot } from '../src/storage-recovery.mjs';
import { readFile } from 'node:fs/promises';

function createStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); },
        values
    };
}

test('conserva e verifica la copia grezza dei dati non leggibili', () => {
    const storage = createStorage();
    const raw = '{"state":';
    assert.equal(preserveCorruptSnapshot(storage, 'diario-corrotto', raw), true);
    assert.equal(storage.getItem('diario-corrotto'), raw);
});

test('non sovrascrive una copia precedente diversa', () => {
    const previous = '{"dati":"precedenti"}';
    const storage = createStorage({ backup: previous });
    assert.equal(preserveCorruptSnapshot(storage, 'backup', '{"dati":"nuovi"}'), false);
    assert.equal(storage.getItem('backup'), previous);
});

test('se la scrittura o la rilettura falliscono, dichiara la copia non verificata', () => {
    const storage = {
        getItem() { return null; },
        setItem() { throw new Error('quota esaurita'); }
    };
    assert.equal(preserveCorruptSnapshot(storage, 'backup', 'raw'), false);
});

test('rifiuta argomenti non validi senza tentare scritture', () => {
    assert.equal(preserveCorruptSnapshot(null, 'backup', 'raw'), false);
    assert.equal(preserveCorruptSnapshot({}, 'backup', 'raw'), false);
    assert.equal(preserveCorruptSnapshot({ getItem() {}, setItem() {} }, '', 'raw'), false);
});


test('l’avvio valida il formato locale prima di idratare e blocca i salvataggi se la copia fallisce', async () => {
    const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
    const saveStart = app.indexOf('function saveNow()');
    const saveEnd = app.indexOf('function scheduleAutoSave()', saveStart);
    const initStart = app.indexOf('function initLocalSave()');
    const initEnd = app.indexOf('function renderActiveTab()', initStart);
    const saveBody = app.slice(saveStart, saveEnd);
    const initBody = app.slice(initStart, initEnd);
    assert.ok(saveStart >= 0 && saveEnd > saveStart);
    assert.ok(initStart >= 0 && initEnd > initStart);
    assert.ok(saveBody.indexOf('if (storageRecoveryBlocked)') < saveBody.indexOf('localStorage.setItem(STORAGE_KEY'));
    assert.ok(initBody.indexOf('isValidDiaryState(candidate)') < initBody.indexOf('hydrateState(candidate)'));
    assert.match(initBody, /preserveCorruptSnapshot\(localStorage, CORRUPT_KEY, raw\)/);
    assert.match(initBody, /storageRecoveryBlocked = !preserved/);
    assert.match(app, /if \(storageRecoveryBlocked\) \{\s*showToast\('Prima esporta la copia dei dati originali/);
    assert.match(app, /const LEGACY_KEY = 'sos-smell-journey-set01-v1'/);
});


test('l’esportazione non sblocca da sola la sovrascrittura: serve una conferma esplicita', async () => {
    const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
    const start = app.indexOf('async function exportCorruptCopy()');
    const end = app.indexOf('function initLocalSave()', start);
    const flow = app.slice(start, end);
    assert.ok(start >= 0 && end > start);
    assert.match(flow, /corruptCopyExported = true/);
    assert.match(flow, /function confirmCorruptRecovery\(\)/);
    assert.match(flow, /if \(!storageRecoveryBlocked \|\| !corruptCopyExported\) return/);
    assert.match(flow, /confirm\(/);
    assert.doesNotMatch(flow, /storageRecoveryBlocked = false/);
    assert.match(app, /onclick="confirmCorruptRecovery\(\)"/);
});
