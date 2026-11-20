import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('importazione e ripristino usano dialog accessibili con annullamento iniziale', () => {
    for (const name of ['restore', 'import']) {
        assert.match(html, new RegExp(\`id="\${name}-modal" role="dialog" aria-modal="true" aria-labelledby="\${name}-dialog-title" aria-describedby="\${name}-dialog-description\`));
        assert.match(html, new RegExp(\`id="\${name}-dialog-cancel" data-dialog-initial-focus\`));
        assert.match(app, new RegExp(\`modal\\\\.id === '\${name}-modal'\`), \`Escape non chiude \${name}-modal\`);
    }
    assert.doesNotMatch(app, /\bconfirm\s*\(/, 'non devono restare popup di conferma del browser');
});

test('la lista mostra i percorsi più recenti per primi mantenendo l’indice originale', () => {
    assert.match(app, /arch\.map\(\(entry, index\) => \(\{ entry, index \}\)\)\.reverse\(\)\.map\(\(\{ entry: e, index \}\)/);
    assert.match(app, /onclick="openRestoreDialog\(\$\{index\}\)"/);
    assert.match(app, /function restoreArchived\(index\)/);
});

test('riprendere un percorso archivia l’avanzamento attuale e conserva le preferenze condivise', () => {
    const start = app.indexOf('function restoreArchived(index)');
    const end = app.indexOf('let pendingImport', start);
    assert.ok(start >= 0 && end > start, 'funzione di ripristino non trovata');
    const body = app.slice(start, end);
    assert.match(body, /if \(hasPathProgress\(previous\)\)/);
    assert.match(body, /archive\.push\(/);
    assert.match(body, /for \(const key of \['name', 'morningTime', 'eveningTime'\]\)/);
    assert.match(body, /previous\.setId === entry\.setId && previous\.refill && previous\.refill\.last/);
});

test('il ripristino da backup esplicita la sostituzione di tutti i dati e dell’archivio', () => {
    assert.match(html, /id="import-dialog-title"/);
    assert.match(html, /il diario attuale, compreso l'archivio/);
    assert.match(html, /Importa e sostituisci/);
    assert.match(app, /function confirmImport\(\)/);
    assert.match(app, /openAccessibleModal\(document\.getElementById\('import-modal'\), '#import-dialog-cancel'\)/);
});

test('il calendario non mostra orari statici potenzialmente non aggiornati', () => {
    assert.doesNotMatch(html, /schedule-times-display|Orari target:/);
    assert.match(html, /Modifica orari/);
});
