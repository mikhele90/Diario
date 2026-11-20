import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
    preserveCorruptSnapshot,
    collectRecoverySnapshots,
    createRecoveryBundle,
    shouldWriteInitialState,
    selectBestRecoverySnapshot
} from '../src/storage-recovery.mjs';

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

test('raccoglie in sola lettura tutte le chiavi e conserva snapshot diversi della stessa chiave', () => {
    const primary = '{"state":{"marker":"vuoto"}}';
    const backup = '{"state":{"marker":"originale"}}';
    let writes = 0;
    const storage = {
        getItem(key) {
            const values = new Map([
                ['diario', primary],
                ['diario-corrotto', backup],
                ['legacy', null]
            ]);
            return values.get(key) ?? null;
        },
        setItem() { writes += 1; }
    };

    const result = collectRecoverySnapshots(storage, ['diario', 'diario-corrotto', 'legacy'], [
        { key: 'diario', raw: '{"state":{"marker":"fotografia-in-memoria"}}' }
    ]);

    assert.deepEqual(result.snapshots, [
        { key: 'diario', raw: '{"state":{"marker":"fotografia-in-memoria"}}' },
        { key: 'diario', raw: primary },
        { key: 'diario-corrotto', raw: backup }
    ]);
    assert.deepEqual(result.unreadableKeys, []);
    assert.equal(writes, 0);
});

test('registra le chiavi illeggibili senza interrompere la raccolta delle altre copie', () => {
    const storage = {
        getItem(key) {
            if (key === 'bloccata') throw new Error('accesso negato');
            return 'disponibile';
        }
    };
    const result = collectRecoverySnapshots(storage, ['bloccata', 'disponibile']);
    assert.deepEqual(result.snapshots, [{ key: 'disponibile', raw: 'disponibile' }]);
    assert.deepEqual(result.unreadableKeys, ['bloccata']);
});

test('il pacchetto di recupero mantiene esattamente i valori originali', () => {
    const raw = '{"state":{"notes":"testo originale"}}';
    const bundle = JSON.parse(createRecoveryBundle({
        snapshots: [{ key: 'diario', raw }],
        unreadableKeys: ['legacy']
    }, '2026-11-20T12:00:00.000Z'));

    assert.equal(bundle.format, 'diario-olfattivo-recovery');
    assert.equal(bundle.version, 1);
    assert.equal(bundle.exportedAt, '2026-11-20T12:00:00.000Z');
    assert.deepEqual(bundle.snapshots, [{ key: 'diario', raw }]);
    assert.deepEqual(bundle.unreadableKeys, ['legacy']);
});

test('un avvio che richiede recupero non può scrivere lo stato iniziale', () => {
    assert.equal(shouldWriteInitialState({ loaded: false, fromLegacy: false, recoveryRequired: true }), false);
    assert.equal(shouldWriteInitialState({ loaded: true, fromLegacy: false, recoveryRequired: true }), false);
});

test('un nuovo avvio pulito e una migrazione valida possono inizializzare la chiave principale', () => {
    assert.equal(shouldWriteInitialState({ loaded: false, fromLegacy: false, recoveryRequired: false }), true);
    assert.equal(shouldWriteInitialState({ loaded: true, fromLegacy: true, recoveryRequired: false }), true);
    assert.equal(shouldWriteInitialState({ loaded: true, fromLegacy: false, recoveryRequired: false }), false);
});

test('sceglie una copia valida con progressi quando la chiave principale è vuota', () => {
    const empty = { key: 'diario-olfattivo-v1', state: { marker: 'vuoto' } };
    const recovered = { key: 'diario-olfattivo-v1-corrotto', state: { marker: 'progressi' } };
    const selected = selectBestRecoverySnapshot(
        [empty, recovered],
        state => state.marker === 'progressi'
    );
    assert.equal(selected, recovered);
});

test('a parità di copie con progressi mantiene la chiave principale', () => {
    const primary = { key: 'diario-olfattivo-v1', state: { marker: 'principale' } };
    const backup = { key: 'diario-olfattivo-v1-corrotto', state: { marker: 'backup' } };
    const selected = selectBestRecoverySnapshot([primary, backup], () => true);
    assert.equal(selected, primary);
});

test('l’avvio non sovrascrive un archivio non valido dopo aver tentato la copia', async () => {
    const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
    const start = app.indexOf('function initLocalSave()');
    const end = app.indexOf('function renderActiveTab()', start);
    const init = app.slice(start, end);

    assert.ok(start >= 0 && end > start);
    assert.ok(init.indexOf('if (isValidDiaryState(candidate))') < init.indexOf('appState = hydrateState(selected.state)'));
    assert.match(init, /collectRecoverySnapshots\(/);
    assert.match(init, /\[STORAGE_KEY, CORRUPT_KEY, LEGACY_KEY\]/);
    assert.match(init, /preserveCorruptSnapshot\(localStorage, CORRUPT_KEY, invalidPrimary\.raw\)/);
    assert.match(init, /storageRecoveryBlocked = recoveryRequired/);
    assert.match(init, /if \(recoveryRequired\) \{\s*updateSyncBadge\('error'\);/);
    assert.match(init, /shouldWriteInitialState\(\{ loaded, fromLegacy, recoveryRequired \}\)/);
});

test('l’esportazione raccoglie tutte le chiavi locali e la fotografia tenuta in memoria', async () => {
    const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
    const start = app.indexOf('async function exportCorruptCopy()');
    const end = app.indexOf('function confirmCorruptRecovery()', start);
    const flow = app.slice(start, end);

    assert.ok(start >= 0 && end > start);
    assert.match(flow, /collectRecoverySnapshots\(/);
    assert.match(flow, /\[STORAGE_KEY, CORRUPT_KEY, LEGACY_KEY\]/);
    assert.match(flow, /createRecoveryBundle\(collected\)/);
    assert.match(flow, /Diario-recupero-completo\.json/);
    assert.match(flow, /corruptCopyExported = true/);
});

test('l’esportazione non sblocca da sola la scrittura: serve conferma esplicita', async () => {
    const [app, html] = await Promise.all([
        readFile(new URL('../app.js', import.meta.url), 'utf8'),
        readFile(new URL('../index.html', import.meta.url), 'utf8')
    ]);
    const start = app.indexOf('async function exportCorruptCopy()');
    const confirmStart = app.indexOf('function confirmCorruptRecovery()', start);
    const end = app.indexOf('function initLocalSave()', confirmStart);
    const exportFlow = app.slice(start, confirmStart);
    const confirmFlow = app.slice(confirmStart, end);

    assert.ok(start >= 0 && confirmStart > start && end > confirmStart);
    assert.match(exportFlow, /corruptCopyExported = true/);
    assert.doesNotMatch(exportFlow, /storageRecoveryBlocked = false/);
    assert.match(confirmFlow, /if \(!storageRecoveryBlocked \|\| !corruptCopyExported\) return/);
    assert.match(confirmFlow, /confirm\(/);
    assert.match(confirmFlow, /storageRecoveryBlocked = false/);
    assert.match(html, /onclick="confirmCorruptRecovery\(\)"/);
});

test('se una chiave locale non è leggibile, il diario resta bloccato e non salva il default', async () => {
    const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
    const start = app.indexOf('function initLocalSave()');
    const end = app.indexOf('function renderActiveTab()', start);
    const init = app.slice(start, end);

    assert.ok(start >= 0 && end > start);
    assert.match(init, /primaryUnreadable/);
    assert.match(init, /alternativeUnreadableWithoutProgress/);
    assert.match(init, /storageRecoveryBlocked = recoveryRequired/);
    assert.match(init, /if \(recoveryRequired\) \{\s*updateSyncBadge\('error'\);/);
    assert.match(init, /shouldWriteInitialState\(\{ loaded, fromLegacy, recoveryRequired \}\)/);
});

test('esamina anche la chiave legacy invece di fermarsi alla chiave principale', async () => {
    const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
    const start = app.indexOf('function initLocalSave()');
    const end = app.indexOf('function renderActiveTab()', start);
    const init = app.slice(start, end);

    assert.ok(start >= 0 && end > start);
    assert.match(init, /collectRecoverySnapshots\([\s\S]*?\[STORAGE_KEY, CORRUPT_KEY, LEGACY_KEY\]/);
    assert.match(init, /fromLegacy = selected\.key !== STORAGE_KEY/);
});

test('pagehide e cambio visibilità non scrivono se non c’è un salvataggio pendente', async () => {
    const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
    const start = app.indexOf('function flushSave()');
    const end = app.indexOf('const BACKUP_KEY', start);
    const flush = app.slice(start, end);

    assert.ok(start >= 0 && end > start);
    assert.match(flush, /if \(!saveTimeout\) return/);
    assert.match(flush, /if \(!storageRecoveryBlocked\) saveNow\(\)/);
});
