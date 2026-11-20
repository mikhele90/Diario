import test from 'node:test';
import assert from 'node:assert/strict';
import { createRestoredState, hasPathProgress } from '../src/diario-core.mjs';

const empty = () => ({
    setId: 'set01',
    archive: [],
    nextChoice: null,
    refill: { last: null },
    profile: {
        name: '',
        startDate: '2026-11-13',
        morningTime: '08:00',
        eveningTime: '19:00',
        initialNotes: '',
        finalReflection: '',
        nextStep: ''
    },
    baseline: { a: { score: null, impression: '' } },
    weeks: {
        1: {
            days: [{ morning: false, evening: false }],
            scents: { a: { score: null, impression: '' } },
            reflection: '',
            otherNotes: ''
        }
    },
    pauses: { 4: { q1: '', q2: '', q3: '' } }
});

test('un percorso appena iniziato non ha avanzamento', () => {
    assert.equal(hasPathProgress(empty()), false);
    assert.equal(hasPathProgress(null), false);
});

test('nome, orari, set, archivio e data di inizio non sono avanzamento del percorso', () => {
    const state = empty();
    state.profile.name = 'Anna';
    state.profile.morningTime = '07:30';
    state.setId = 'set02';
    state.archive = [{}];
    state.profile.startDate = '2026-01-01';
    assert.equal(hasPathProgress(state), false);
});

test('sessioni, punteggi, note e riflessioni sono avanzamento', () => {
    const changes = [
        state => { state.weeks[1].days[0].evening = true; },
        state => { state.weeks[1].scents.a.score = 0; },
        state => { state.weeks[1].otherNotes = 'prova'; },
        state => { state.baseline.a.impression = 'fresco'; },
        state => { state.pauses[4].q2 = 'ricordo'; },
        state => { state.profile.finalReflection = 'bene'; },
        state => { state.profile.initialNotes = 'prima impressione'; },
        state => { state.profile.nextStep = 'continuare'; },
        state => { state.nextChoice = 'same'; },
        state => { state.refill.last = '2026-11-20'; }
    ];
    for (const change of changes) {
        const state = empty();
        change(state);
        assert.equal(hasPathProgress(state), true);
    }
});


test('ripristina l’indice originale dell’archivio dopo che l’elenco è mostrato al contrario', () => {
    const current = empty();
    const makeEntry = id => ({ setId: id, state: { ...empty(), setId: id } });
    current.archive = [makeEntry('set01'), makeEntry('set02'), makeEntry('set03')];
    const restored = createRestoredState(current, 0, '2026-11-20T08:00:00.000Z');
    assert.equal(restored.setId, 'set01');
    assert.deepEqual(restored.archive.map(entry => entry.setId), ['set02', 'set03']);
});

test('ripristinare archivia il percorso corrente senza perdere i dati e conserva le preferenze globali', () => {
    const current = empty();
    current.profile.name = 'Michele';
    current.profile.morningTime = '07:15';
    current.profile.eveningTime = '20:30';
    current.weeks[1].days[0].morning = true;
    current.weeks[1].otherNotes = 'nota da non perdere';
    current.archive = [{ setId: 'set02', state: { ...empty(), setId: 'set02' } }];
    const restored = createRestoredState(current, 0, '2026-11-20T08:00:00.000Z');
    assert.equal(restored.profile.name, 'Michele');
    assert.equal(restored.profile.morningTime, '07:15');
    assert.equal(restored.profile.eveningTime, '20:30');
    assert.equal(restored.archive.length, 1);
    assert.equal(restored.archive[0].setId, 'set01');
    assert.equal(restored.archive[0].state.weeks[1].days[0].morning, true);
    assert.equal(restored.archive[0].state.weeks[1].otherNotes, 'nota da non perdere');
    assert.equal(restored.archive[0].archivedAt, '2026-11-20T08:00:00.000Z');
});

test('una ricarica più recente viene mantenuta solo riprendendo lo stesso set', () => {
    const current = empty();
    current.refill.last = '2026-11-19';
    current.archive = [{ setId: 'set01', state: { ...empty(), setId: 'set01', refill: { last: '2026-10-01' } } }];
    assert.equal(createRestoredState(current, 0).refill.last, '2026-11-19');

    current.archive = [{ setId: 'set02', state: { ...empty(), setId: 'set02', refill: { last: '2026-10-01' } } }];
    assert.equal(createRestoredState(current, 0).refill.last, '2026-10-01');
});

test('il ripristino rifiuta indici fuori intervallo o voci incomplete', () => {
    const current = empty();
    current.archive = [{ setId: 'set01', state: empty() }];
    assert.equal(createRestoredState(current, -1), null);
    assert.equal(createRestoredState(current, 1), null);
    assert.equal(createRestoredState({ ...current, archive: [{ setId: 'set01' }] }, 0), null);
});
