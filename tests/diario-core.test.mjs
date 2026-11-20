import test from 'node:test';
import assert from 'node:assert/strict';

import {
    escapeHtml,
    getRitualPosition,
    getScentTrendPoints,
    hasAnyDiaryData,
    isValidDiaryState
} from '../src/diario-core.mjs';

const SCENT_IDS = ['eucalipto', 'limone', 'geranio', 'garofano'];

function createDiaryState() {
    const scentRecords = () => Object.fromEntries(
        SCENT_IDS.map(id => [id, { score: null, impression: '' }])
    );
    const week = () => ({
        days: Array.from({ length: 7 }, () => ({ morning: false, evening: false })),
        scents: scentRecords(),
        reflection: '',
        otherNotes: ''
    });

    return {
        refill: { last: null },
        setId: 'set01',
        nextChoice: null,
        archive: [],
        currentWeek: 1,
        profile: {
            name: '',
            startDate: '2026-11-18',
            morningTime: '08:00',
            eveningTime: '19:00',
            initialNotes: '',
            finalReflection: '',
            nextStep: ''
        },
        baseline: scentRecords(),
        pauses: {
            4: { q1: '', q2: '', q3: '' },
            8: { q1: '', q2: '', q3: '' }
        },
        weeks: Object.fromEntries(
            Array.from({ length: 12 }, (_, index) => [index + 1, week()])
        )
    };
}

function localDate(year, month, day) {
    return new Date(year, month - 1, day, 12, 0, 0);
}

test('escapeHtml neutralizza markup, virgolette e apostrofi', () => {
    assert.equal(
        escapeHtml(`<img src=x onerror="alert('x')">`),
        '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;'
    );
});

test('escapeHtml gestisce null, undefined, numeri e stringhe vuote', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
    assert.equal(escapeHtml(42), '42');
    assert.equal(escapeHtml(''), '');
});

test('accetta un backup completo e coerente', () => {
    assert.equal(isValidDiaryState(createDiaryState()), true);
});

test('mantiene la compatibilità con campi opzionali assenti nei backup precedenti', () => {
    const state = createDiaryState();
    delete state.profile.nextStep;
    delete state.weeks[1].otherNotes;
    delete state.pauses[4].q3;
    assert.equal(isValidDiaryState(state), true);
});

test('rifiuta un oggetto che non contiene la mappa delle settimane', () => {
    assert.equal(isValidDiaryState({ profile: {} }), false);
    assert.equal(isValidDiaryState(null), false);
});

test('rifiuta identificativi di set e settimane non validi', () => {
    const badSet = createDiaryState();
    badSet.setId = 'set99';
    assert.equal(isValidDiaryState(badSet), false);

    const badWeek = createDiaryState();
    badWeek.currentWeek = 13;
    assert.equal(isValidDiaryState(badWeek), false);
});

test('rifiuta date impossibili e orari non validi', () => {
    const badDate = createDiaryState();
    badDate.profile.startDate = '2026-02-30';
    assert.equal(isValidDiaryState(badDate), false);

    const badTime = createDiaryState();
    badTime.profile.morningTime = '27:70';
    assert.equal(isValidDiaryState(badTime), false);
});

test('rifiuta punteggi fuori dalla scala 0–5', () => {
    const state = createDiaryState();
    state.weeks[2].scents.eucalipto.score = 6;
    assert.equal(isValidDiaryState(state), false);
});

test('rifiuta giorni e sessioni con tipi errati', () => {
    const state = createDiaryState();
    state.weeks[1].days[0].morning = 'yes';
    assert.equal(isValidDiaryState(state), false);
});

test('rifiuta note con un tipo non testuale', () => {
    const state = createDiaryState();
    state.weeks[1].reflection = { text: 'nota' };
    assert.equal(isValidDiaryState(state), false);
});

test('rifiuta un archivio incompleto ma accetta una fotografia completa', () => {
    const incomplete = createDiaryState();
    incomplete.archive = [{ setId: 'set01', state: { weeks: {} } }];
    assert.equal(isValidDiaryState(incomplete), false);

    const complete = createDiaryState();
    const archivedState = createDiaryState();
    delete archivedState.archive;
    complete.archive = [{
        setId: 'set01',
        archivedAt: '2026-11-18T12:00:00.000Z',
        state: archivedState
    }];
    assert.equal(isValidDiaryState(complete), true);
});


test('un diario vuoto non richiede ancora un backup', () => {
    assert.equal(hasAnyDiaryData(createDiaryState(), '2026-11-18'), false);
});

test('valutazioni e impressioni iniziali attivano il promemoria backup', () => {
    const state = createDiaryState();
    state.baseline.eucalipto.impression = 'Molto debole';
    assert.equal(hasAnyDiaryData(state, '2026-11-18'), true);
});

test('sessioni, note settimanali e note di pausa attivano il promemoria backup', () => {
    const session = createDiaryState();
    session.weeks[1].days[0].morning = true;
    assert.equal(hasAnyDiaryData(session, '2026-11-18'), true);

    const weekNote = createDiaryState();
    weekNote.weeks[1].otherNotes = 'Raffreddore';
    assert.equal(hasAnyDiaryData(weekNote, '2026-11-18'), true);

    const pauseNote = createDiaryState();
    pauseNote.pauses[4].q1 = 'Una nota';
    assert.equal(hasAnyDiaryData(pauseNote, '2026-11-18'), true);
});

test('personalizzazioni, ricariche e percorsi archiviati attivano il promemoria backup', () => {
    const customDate = createDiaryState();
    customDate.profile.startDate = '2026-11-01';
    assert.equal(hasAnyDiaryData(customDate, '2026-11-18'), true);

    const refill = createDiaryState();
    refill.refill.last = '2026-11-18';
    assert.equal(hasAnyDiaryData(refill, '2026-11-18'), true);

    const archive = createDiaryState();
    archive.archive.push({ setId: 'set01', state: createDiaryState() });
    assert.equal(hasAnyDiaryData(archive, '2026-11-18'), true);
});

test('calcola correttamente settimana e giorno del percorso', () => {
    assert.deepEqual(
        getRitualPosition('2026-11-18', localDate(2026, 11, 18)),
        { week: 1, dayIndex: 0 }
    );
    assert.deepEqual(
        getRitualPosition('2026-11-18', localDate(2026, 11, 25)),
        { week: 2, dayIndex: 0 }
    );
    assert.deepEqual(
        getRitualPosition('2026-11-18', localDate(2027, 2, 9)),
        { week: 12, dayIndex: 6 }
    );
});

test('non assegna sessioni prima o dopo le 12 settimane', () => {
    assert.equal(getRitualPosition('2026-11-18', localDate(2026, 11, 17)), null);
    assert.equal(getRitualPosition('2026-11-18', localDate(2027, 2, 10)), null);
});

test('calcola correttamente i giorni a cavallo dell’anno e del 29 febbraio', () => {
    assert.deepEqual(
        getRitualPosition('2026-12-30', localDate(2027, 1, 1)),
        { week: 1, dayIndex: 2 }
    );
    assert.deepEqual(
        getRitualPosition('2028-02-28', localDate(2028, 3, 1)),
        { week: 1, dayIndex: 2 }
    );
});

test('il calcolo del calendario resta stabile durante il cambio ora legale', () => {
    assert.deepEqual(
        getRitualPosition('2026-03-28', localDate(2026, 3, 29)),
        { week: 1, dayIndex: 1 }
    );
});


test('serie olfattiva contiene il punto iniziale e le dodici settimane in ordine', () => {
    const weeks = Object.fromEntries(
        Array.from({ length: 12 }, (_, index) => [index + 1, {
            scents: { eucalipto: { score: index % 6, impression: '' } }
        }])
    );
    const points = getScentTrendPoints(
        { eucalipto: { score: 5 } },
        weeks,
        'eucalipto'
    );
    assert.equal(points.length, 13);
    assert.deepEqual(points[0], { label: 'Inizio', week: 0, score: 5 });
    assert.deepEqual(points[1], { label: 'Settimana 1', week: 1, score: 0 });
    assert.deepEqual(points[12], { label: 'Settimana 12', week: 12, score: 5 });
});

test('la serie conserva lo zero come valutazione e non lo confonde con un dato mancante', () => {
    const points = getScentTrendPoints(
        { eucalipto: { score: 0 } },
        { 1: { scents: { eucalipto: { score: 0 } } } },
        'eucalipto'
    );
    assert.equal(points[0].score, 0);
    assert.equal(points[1].score, 0);
});

test('la serie mantiene null per le settimane non valutate senza interpolare i dati', () => {
    const points = getScentTrendPoints(
        { eucalipto: { score: null } },
        {
            1: { scents: { eucalipto: { score: 2 } } },
            2: { scents: { eucalipto: { score: null } } },
            3: { scents: { eucalipto: { score: 4 } } }
        },
        'eucalipto'
    );
    assert.equal(points[0].score, null);
    assert.equal(points[1].score, 2);
    assert.equal(points[2].score, null);
    assert.equal(points[3].score, 4);
    assert.equal(points[4].score, null);
});

test('la serie gestisce in modo sicuro campi mancanti e punteggi non validi', () => {
    const points = getScentTrendPoints(
        null,
        {
            1: { scents: { eucalipto: { score: 7 } } },
            2: { scents: { eucalipto: { score: '3' } } }
        },
        'eucalipto'
    );
    assert.equal(points[0].score, null);
    assert.equal(points[1].score, null);
    assert.equal(points[2].score, null);
    assert.equal(points[12].score, null);
});
