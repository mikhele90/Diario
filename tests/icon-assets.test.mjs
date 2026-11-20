import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('le icone PWA esistono e corrispondono alle dimensioni dichiarate nel manifest', async () => {
    const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', root), 'utf8'));
    const expected = [
        { src: 'icon-192.png', size: 192, purpose: 'any' },
        { src: 'icon-512.png', size: 512, purpose: 'any' },
        { src: 'icon-maskable-512.png', size: 512, purpose: 'maskable' }
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


test('le icone vettoriali sono dichiarate correttamente e includono una zona sicura maskable', async () => {
    const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', root), 'utf8'));
    const expected = [
        { src: 'icon.svg', purpose: 'any' },
        { src: 'icon-maskable.svg', purpose: 'maskable' }
    ];

    for (const icon of expected) {
        const entry = manifest.icons.find(item => item.src === icon.src);
        assert.ok(entry, `Icona vettoriale mancante: ${icon.src}`);
        assert.equal(entry.sizes, 'any');
        assert.equal(entry.type, 'image/svg+xml');
        assert.equal(entry.purpose, icon.purpose);

        const svg = await readFile(new URL(icon.src, root), 'utf8');
        assert.match(svg, /<svg[^>]*viewBox="0 0 512 512"/);
        assert.match(svg, /<radialGradient id="bg"/);
        assert.match(svg, /<linearGradient id="ivory"/);
        assert.match(svg, /<linearGradient id="gold"/);
    }

    const regular = await readFile(new URL('icon.svg', root), 'utf8');
    const maskable = await readFile(new URL('icon-maskable.svg', root), 'utf8');
    assert.match(regular, /transform="translate\(-26 -20\)"/);
    assert.match(maskable, /translate\(64 61\.4\) scale\(0\.75\) translate\(-26 -20\)/);
});
