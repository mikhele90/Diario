import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

const [html, app, styles, serviceWorker] = await Promise.all([
    readFile(new URL('index.html', root), 'utf8'),
    readFile(new URL('app.js', root), 'utf8'),
    readFile(new URL('styles.css', root), 'utf8'),
    readFile(new URL('sw.js', root), 'utf8')
]);

test('il Calendario espone un ritorno rapido alla settimana corrente', () => {
    assert.match(html, /id="btn-go-today"[^>]*onclick="goToToday\(\)"/);
    assert.match(app, /function goToToday\(\)\s*\{/);
    assert.match(app, /goToToday,/);
    assert.match(app, /todayButton\.classList\.toggle\('hidden', todayWeek === -1 \|\| \(w === todayWeek && !inPause\)\)/);
});

test('il progresso settimanale è visibile e aggiornato in modo accessibile', () => {
    assert.match(html, /id="weekly-sessions-progress-track"[^>]*role="progressbar"/);
    assert.match(html, /aria-valuemin="0" aria-valuemax="14" aria-valuenow="0"/);
    assert.match(app, /setAttribute\('aria-valuenow', String\(completedCount\)\)/);
    assert.match(app, /weekly-sessions-progress'\)\.style\.width = `\$\{weeklyPercent\}%`/);
    assert.match(app, /weekly-progress-text'\)\.textContent/);
});

test('i controlli quotidiani hanno target touch da almeno 44 px e stato leggibile', () => {
    assert.match(app, /class="diary-session-toggle[^"]*"/);
    assert.match(app, /aria-pressed="\$\{dayObj\.morning\}"/);
    assert.match(app, /aria-pressed="\$\{dayObj\.evening\}"/);
    assert.match(styles, /\.diary-session-toggle\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/s);
});

test('i punteggi dei profumi comunicano nome, valore e selezione', () => {
    assert.match(app, /aria-label="Valutazione \$\{scent\.name\}: \$\{val\} - \$\{SCALE_LABELS\[val\]\}"/);
    assert.match(app, /aria-pressed="\$\{isSelected\}"/);
    assert.match(app, /role="group" aria-label="Scala di intensità per \$\{scent\.name\}, da 0 a 5"/);
    assert.match(styles, /\.diary-score-button\s*\{[^}]*min-height:\s*44px/s);
});

test('la nuova interfaccia è servita anche dopo l’aggiornamento della cache PWA', () => {
    assert.match(serviceWorker, /const CACHE = 'diario-olfattivo-v10'/);
    for (const file of ['index.html', 'styles.css', 'app.js']) {
        assert.match(serviceWorker, new RegExp(file.replace('.', '\.') ));
    }
});
