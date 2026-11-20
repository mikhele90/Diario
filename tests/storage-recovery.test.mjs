import test from 'node:test';
import assert from 'node:assert/strict';
import { preserveCorruptSnapshot } from '../src/storage-recovery.mjs';

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
