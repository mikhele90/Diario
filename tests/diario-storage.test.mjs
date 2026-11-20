import test from 'node:test';
import assert from 'node:assert/strict';
import {
    loadDiarySnapshot,
    saveDiarySnapshot
} from '../src/diario-storage.mjs';
import { isValidDiaryState } from '../src/diario-core.mjs';

const STORAGE_KEY = 'diario-olfattivo-v1';
const LEGACY_KEY = 'sos-smell-journey-set01-v1';

function createState() {
    return {
        setId: 'set01',
        currentWeek: 1,
        nextChoice: null,
        profile: {
            name: 'Prova riapertura',
            startDate: '2026-11-20',
            morningTime: '08:00',
            eveningTime: '19:00',
            initialNotes: '',
            finalReflection: '',
            nextStep: ''
        },
        baseline: {},
        pauses: {},
        refill: { last: null },
        archive: [],
        weeks: {
            1: {
                days: Array.from({ length: 7 }, () => ({ morning: false, evening: false })),
                scents: {},
                reflection: 'Annotazione che deve restare dopo la riapertura',
                otherNotes: ''
            }
        }
    };
}

function createStorage(backing = new Map()) {
    return {
        getItem(key) { return backing.has(key) ? backing.get(key) : null; },
        setItem(key, value) { backing.set(key, String(value)); },
        removeItem(key) { backing.delete(key); },
        backing
    };
}

test('salva il diario e lo recupera identico da una nuova istanza dopo la chiusura', () => {
    const backing = new Map();
    const firstSessionStorage = createStorage(backing);
    const stateBeforeClose = createState();

    assert.equal(isValidDiaryState(stateBeforeClose), true);
    assert.equal(saveDiarySnapshot(firstSessionStorage, {
        key: STORAGE_KEY,
        state: stateBeforeClose,
        savedAt: '2026-11-20T14:00:00.000Z',
        validateState: isValidDiaryState
    }), true);

    // Una nuova istanza simula il riavvio della PWA: resta solo la memoria persistente.
    const reopenedStorage = createStorage(backing);
    const reopened = loadDiarySnapshot(reopenedStorage, {
        key: STORAGE_KEY,
        legacyKey: LEGACY_KEY,
        validateState: isValidDiaryState
    });

    assert.equal(reopened.found, true);
    assert.equal(reopened.fromLegacy, false);
    assert.deepEqual(reopened.state, stateBeforeClose);
    assert.equal(reopened.state.weeks[1].reflection, 'Annotazione che deve restare dopo la riapertura');
});

test('usa una sola chiave principale e ignora eventuali vecchie bozze o copie alternative', () => {
    const backing = new Map([
        [STORAGE_KEY, JSON.stringify({ state: createState() })],
        [STORAGE_KEY + '-bozza-recupero', JSON.stringify({ state: { weeks: {} } })],
        [STORAGE_KEY + '-corrotto', JSON.stringify({ state: { weeks: {} } })]
    ]);
    const reopened = loadDiarySnapshot(createStorage(backing), {
        key: STORAGE_KEY,
        legacyKey: LEGACY_KEY,
        validateState: isValidDiaryState
    });

    assert.equal(reopened.found, true);
    assert.equal(reopened.state.profile.name, 'Prova riapertura');
    assert.equal(reopened.state.weeks[1].reflection, 'Annotazione che deve restare dopo la riapertura');
});

test('usa la vecchia chiave soltanto quando la chiave principale è assente', () => {
    const state = createState();
    const storage = createStorage(new Map([
        [LEGACY_KEY, JSON.stringify({ state })]
    ]));

    const loaded = loadDiarySnapshot(storage, {
        key: STORAGE_KEY,
        legacyKey: LEGACY_KEY,
        validateState: isValidDiaryState
    });

    assert.equal(loaded.found, true);
    assert.equal(loaded.fromLegacy, true);
    assert.deepEqual(loaded.state, state);
});

test('un contenuto locale danneggiato non viene trattato come un diario valido', () => {
    const storage = createStorage(new Map([[STORAGE_KEY, '{"state":']]));
    assert.throws(() => loadDiarySnapshot(storage, {
        key: STORAGE_KEY,
        legacyKey: LEGACY_KEY,
        validateState: isValidDiaryState
    }));
});

test('non mostra il salvataggio come riuscito se la scrittura non è rileggibile', () => {
    const storage = {
        getItem() { return null; },
        setItem() {}
    };
    assert.throws(() => saveDiarySnapshot(storage, {
        key: STORAGE_KEY,
        state: createState(),
        savedAt: '2026-11-20T14:00:00.000Z',
        validateState: isValidDiaryState
    }), /verifica del salvataggio/);
});

test('non scrive uno stato che non supera la validazione', () => {
    const storage = createStorage();
    const invalid = { profile: { startDate: 'data impossibile' }, weeks: {} };
    assert.throws(() => saveDiarySnapshot(storage, {
        key: STORAGE_KEY,
        state: invalid,
        validateState: isValidDiaryState
    }), /validazione/);
    assert.equal(storage.getItem(STORAGE_KEY), null);
});
