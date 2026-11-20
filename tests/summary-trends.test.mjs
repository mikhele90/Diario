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

test('il riepilogo mostra quattro grafici responsive e mantiene il totale sessioni', () => {
    assert.match(html, /id="summary-trends-grid" class="diary-trends-grid"/);
    assert.match(html, /id="total-sessions-stat"/);
    assert.match(app, /SCENTS\.forEach\(scent => trendsGrid\.appendChild\(buildScentTrendCard\(scent\)\)\)/);
    assert.match(styles, /\.diary-trends-grid\s*\{/);
    assert.match(styles, /@media\s*\(min-width:\s*768px\)/);
});

test('ogni grafico è accessibile e usa una scala fissa da 0 a 5', () => {
    assert.match(app, /role="img" aria-labelledby="\$\{chartId\}-title \$\{chartId\}-desc"/);
    assert.match(app, /Array\.from\(\{ length: 6 \}, \(_, score\) =>/);
    assert.match(app, /stroke-width="3"/);
    assert.match(app, /<title id="\$\{chartId\}-title">Andamento di \$\{escapeHtml\(scent\.name\)\}<\/title>/);
});

test('le lacune interrompono il tracciato e non vengono unite da linee stimate', () => {
    assert.match(app, /if \(point\.score === null\)\s*\{\s*flushSegment\(\);\s*return;/);
    assert.match(html, /I tratti si interrompono dove manca una valutazione/);
    assert.match(app, /i punti null restano interruzioni, non valori stimati/);
});

test('le tappe principali e la tabella restano disponibili in sezioni espandibili', () => {
    assert.match(html, /<details class="diary-summary-details mt-6">\s*<summary>Confronto delle tappe principali/);
    assert.match(html, /<details class="diary-summary-details mt-4">\s*<summary>Tabella completa delle 12 settimane/);
    assert.match(html, /id="summary-milestones-grid"/);
    assert.match(html, /id="summary-full-table"/);
    assert.match(html, /overflow-x-auto/);
});

test('i quattro profumi usano il colore coerente con il set attivo', () => {
    assert.match(app, /TREND_CHART_COLORS\[scent\.colorClass\]/);
    for (const key of ['emerald', 'amber', 'pink', 'orange', 'violet', 'teal', 'lime']) {
        assert.match(app, new RegExp('^\\s*' + key + ':', 'm'));
    }
});

test('la cache PWA è aggiornata e precarica i file del riepilogo', () => {
    assert.match(serviceWorker, /const CACHE = 'diario-olfattivo-v17'/);
    for (const file of ['index.html', 'styles.css', 'app.js', 'src/diario-core.mjs']) {
        assert.ok(serviceWorker.includes(file), `File non precaricato: ${file}`);
    }
});
