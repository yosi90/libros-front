import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { prepareHostingConfig } from './prepare-hosting-config.mjs';

test('mantiene el directorio publico al generar la configuracion temporal junto a Firebase', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'libros-qa-hosting-'));
    try {
        const sourcePath = path.join(root, 'firebase.json');
        const outputPath = path.join(root, 'firebase.qa.generated.json');
        await mkdir(path.join(root, 'dist', 'book-front', 'browser'), { recursive: true });
        await writeFile(sourcePath, JSON.stringify({ hosting: { public: 'dist/book-front/browser' } }));

        await prepareHostingConfig(sourcePath, outputPath, 'libros-qa');

        const generated = JSON.parse(await readFile(outputPath, 'utf8'));
        assert.equal(generated.hosting.public, 'dist/book-front/browser');
        assert.equal(generated.hosting.site, 'libros-qa');
        assert.equal(path.resolve(path.dirname(outputPath), generated.hosting.public), path.join(root, 'dist', 'book-front', 'browser'));
    } finally { await rm(root, { recursive: true, force: true }); }
});

test('rechaza una configuracion temporal anidada porque Firebase cambiaria el directorio del proyecto', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'libros-qa-hosting-'));
    try {
        const sourcePath = path.join(root, 'firebase.json');
        await writeFile(sourcePath, JSON.stringify({ hosting: { public: 'dist/book-front/browser' } }));

        await assert.rejects(
            prepareHostingConfig(sourcePath, path.join(root, 'test-results', 'firebase.qa.json'), 'libros-qa'),
            /debe generarse junto al firebase\.json/
        );
    } finally { await rm(root, { recursive: true, force: true }); }
});

test('rechaza un sitio distinto del QA aislado', async () => {
    await assert.rejects(
        prepareHostingConfig('firebase.json', 'firebase.qa.generated.json', 'yosiftware-libros'),
        /no coincide con QA/
    );
});
