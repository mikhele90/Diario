import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('le icone PWA esistono e corrispondono alle dimensioni dichiarate nel manifest', async () => {
    const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', root), 'utf8'));
    const expected = [
        { src: 'icon-192-v2.png', size: 192, purpose: 'any' },
        { src: 'icon-512-v2.png', size: 512, purpose: 'any' },
        { src: 'icon-maskable-512-v2.png', size: 512, purpose: 'maskable' }
    ];

    assert.equal(manifest.icons.length, expected.length + 2);

    for (const icon of expected) {
        const entry = manifest.icons.find(item => item.src === icon.src);
        assert.ok(entry, `Icona mancante nel manifest: ${icon.src}`);
        assert.equal(entry.sizes, `${icon.size}x${icon.size}`);
        assert.equal(entry.type, 'image/png');
        assert.equal(entry.purpose, icon.purpose);

        const png = await readFile(new URL(icon.src, root));
        assert.deepEqual(
            png.subarray(0, 8),
            Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
            `${icon.src} non è un PNG valido`
        );
        assert.equal(png.readUInt32BE(16), icon.size, `Larghezza errata: ${icon.src}`);
        assert.equal(png.readUInt32BE(20), icon.size, `Altezza errata: ${icon.src}`);
    }
});


test('le icone vettoriali versionate riproducono la composizione originale e rispettano la zona sicura maskable', async () => {
    const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', root), 'utf8'));
    const expected = [
        { src: 'icon-v2.svg', purpose: 'any', transform: 'translate(-42.6667 12.3333) scale(0.3333333)' },
        { src: 'icon-maskable-v2.svg', purpose: 'maskable', transform: 'translate(51.2 51.2) scale(0.8) translate(-42.6667 12.3333) scale(0.3333333)' }
    ];

    for (const icon of expected) {
        const entry = manifest.icons.find(item => item.src === icon.src);
        assert.ok(entry, `Icona vettoriale mancante: ${icon.src}`);
        assert.equal(entry.sizes, 'any');
        assert.equal(entry.type, 'image/svg+xml');
        assert.equal(entry.purpose, icon.purpose);

        const svg = await readFile(new URL(icon.src, root), 'utf8');
        assert.match(svg, /<svg[^>]*viewBox="0 0 512 512"/);
        assert.match(svg, /<radialGradient id="background"/);
        assert.equal((svg.match(/<path /g) || []).length, 5, 'Il disegno deve contenere naso, due flussi e due foglie separati');
        assert.ok(svg.includes(`transform="${icon.transform}"`), 'La composizione deve essere centrata e mantenere la scala prevista');
    }

    assert.deepEqual(
        manifest.icons.slice(0, 2).map(icon => icon.src),
        ['icon-maskable-v2.svg', 'icon-v2.svg'],
        'Chrome deve trovare prima le nuove icone versionate'
    );
});
