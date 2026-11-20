import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('importazione e ripristino usano dialog accessibili con annullamento iniziale', () => {
    for (const name of ['restore', 'import']) {
        assert.match(html, new RegExp('id="' + name + '-modal" role="dialog" aria-modal="true" aria-labelledby="' + name + '-dialog-title" aria-describedby="' + name + '-dialog-description'));
        assert.match(html, new RegExp('id="' + name + '-dialog-cancel" data-dialog-initial-focus'));
        assert.match(app, new RegExp('modal\\.id === \'' + name + '-modal\''), 'Escape non chiude ' + name + '-modal');
    }
    assert.doesNotMatch(app, /\bconfirm\s*\(/, 'non devono restare popup di conferma del browser');
});

test('la lista mostra i percorsi più recenti per primi mantenendo l’indice originale', () => {
    assert.match(app, /arch\.map\(\(entry, index\) => \(\{ entry, index \}\)\)\.reverse\(\)\.map\(\(\{ entry: e, index \}\)/);
    assert.match(app, /onclick="openRestoreDialog\(\$\{index\}\)"/);
    assert.match(app, /function restoreArchived\(index\)/);
});

test('l’interfaccia delega il ripristino alla funzione pura e mantiene il controllo dell’indice', () => {
    assert.match(app, /import \{ createRestoredState,/);
    assert.match(app, /function restoreArchived\(index\) \{[\\s\\S]*?createRestoredState\(appState, index\)/);
    assert.match(app, /const index = pendingRestore/);
    assert.match(app, /if \(index !== null\) restoreArchived\(index\)/);
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
