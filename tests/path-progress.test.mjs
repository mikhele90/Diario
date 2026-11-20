import test from 'node:test';
import assert from 'node:assert/strict';
import { hasPathProgress } from '../src/diario-core.mjs';

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
