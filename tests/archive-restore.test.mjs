import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getArchiveEntriesNewestFirst,
    hasPathProgress,
    restoreArchivedPath
} from '../src/diario-core.mjs';

const SCENT_IDS = ['eucalipto', 'limone', 'geranio', 'garofano'];
function createState(setId = 'set01', startDate = '2026-01-01') {
    const records = () => Object.fromEntries(SCENT_IDS.map(id => [id, { score: null, impression: '' }]));
    const week = () => ({
        days: Array.from({ length: 7 }, () => ({ morning: false, evening: false })),
        scents: records(),
        reflection: '',
        otherNotes: ''
    });
    return {
        setId,
        nextChoice: null,
        currentWeek: 1,
        refill: { last: null },
        profile: {
            name: 'Nome percorso',
            startDate,
            morningTime: '08:00',
            eveningTime: '19:00',
            initialNotes: '',
            finalReflection: '',
            nextStep: ''
        },
        baseline: records(),
        pauses: {
            4: { q1: '', q2: '', q3: '' },
            8: { q1: '', q2: '', q3: '' }
        },
        weeks: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, week()]))
    };
}
const archived = (setId, date) => ({
    setId,
    archivedAt: date + 'T12:00:00.000Z',
    state: createState(setId, date)
});

test('l’ordine più recente non altera gli indici originali delle voci archiviate', () => {
    const archive = [archived('set01', '2026-01-01'), archived('set02', '2026-02-01'), archived('set01', '2026-03-01')];
    const displayed = getArchiveEntriesNewestFirst(archive);
    assert.deepEqual(displayed.map(item => item.index), [2, 1, 0]);
    assert.equal(displayed[0].entry.state.profile.startDate, '2026-03-01');
});

test('riprendere un percorso archivia quello corrente e conserva le preferenze globali', () => {
    const current = createState('set01', '2026-04-01');
    current.profile.name = 'Nome aggiornato';
    current.profile.morningTime = '07:30';
    current.profile.eveningTime = '20:15';
    current.weeks[2].days[1].morning = true;
    current.archive = [archived('set02', '2026-02-01'), archived('set01', '2026-03-01')];

    const restored = restoreArchivedPath(current, 0, '2026-11-20T10:00:00.000Z');
    assert.ok(restored);
    assert.equal(restored.setId, 'set02');
    assert.equal(restored.profile.startDate, '2026-02-01');
    assert.equal(restored.profile.name, 'Nome aggiornato');
    assert.equal(restored.profile.morningTime, '07:30');
    assert.equal(restored.profile.eveningTime, '20:15');
    assert.equal(restored.archive.length, 2);
    assert.equal(restored.archive[0].state.profile.startDate, '2026-03-01');
    assert.equal(restored.archive[1].state.profile.startDate, '2026-04-01');
    assert.equal(restored.archive[1].archivedAt, '2026-11-20T10:00:00.000Z');
    assert.equal(hasPathProgress(restored.archive[1].state), true);
});

test('riprendere un percorso vuoto non crea un archivio vuoto', () => {
    const current = createState();
    current.profile.name = 'Nome corrente';
    current.archive = [archived('set02', '2026-02-01'), archived('set01', '2026-03-01')];

    const restored = restoreArchivedPath(current, 1, '2026-11-20T10:00:00.000Z');
    assert.ok(restored);
    assert.equal(restored.profile.startDate, '2026-03-01');
    assert.equal(restored.archive.length, 1);
    assert.equal(restored.archive[0].state.profile.startDate, '2026-02-01');
});

test('la data di ricarica si conserva solo quando il set ripreso coincide', () => {
    const current = createState('set01');
    current.refill.last = '2026-11-10';
    current.archive = [archived('set01', '2026-02-01')];
    const same = restoreArchivedPath(current, 0);
    assert.equal(same.refill.last, '2026-11-10');

    current.archive = [archived('set02', '2026-03-01')];
    const different = restoreArchivedPath(current, 0);
    assert.equal(different.refill.last, null);
});

test('rifiuta indici e voci non validi e non supera il limite dell’archivio', () => {
    const current = createState();
    current.weeks[1].days[0].evening = true;
    current.archive = [archived('set02', '2026-02-01')];
    assert.equal(restoreArchivedPath(current, -1), null);
    assert.equal(restoreArchivedPath(current, 2), null);

    current.archive = Array.from({ length: 501 }, (_, i) => archived(i % 2 ? 'set01' : 'set02', '2026-01-01'));
    assert.equal(restoreArchivedPath(current, 0), null);
});
