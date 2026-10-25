import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { prepareHostingConfig, qaContentSecurityPolicy } from './prepare-hosting-config.mjs';

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

test('la CSP de QA usa la plataforma Yosiftware y la API de QA', async () => {
    const firebase = JSON.parse(await readFile(path.join(process.cwd(), 'firebase.json'), 'utf8'));
    const production = firebase.hosting.headers.find(rule => rule.source === '**').headers
        .find(header => header.key === 'Content-Security-Policy').value;

    const qa = qaContentSecurityPolicy(production);

    assert.match(qa, /script-src [^;]*https:\/\/qa-cuentas\.yosiftware\.es/);
    assert.match(qa, /connect-src [^;]*https:\/\/qa-api\.yosiftware\.es [^;]*https:\/\/qa-cuentas-api\.yosiftware\.es [^;]*wss:\/\/qa-cuentas-ws\.yosiftware\.es/);
    assert.match(qa, /frame-src https:\/\/qa-cuentas\.yosiftware\.es;/);
    assert.match(qa, /img-src [^;]*https:\/\/qa-cuentas-api\.yosiftware\.es/);
    assert.doesNotMatch(qa, /\/\/(?:cuentas|cuentas-api|cuentas-ws|libros-api)\.yosiftware\.es/);
});

test('rechaza una CSP sin las fuentes de la plataforma', () => {
    assert.throws(() => qaContentSecurityPolicy("default-src 'self'"), /no incluye https:\/\/cuentas\.yosiftware\.es/);
});
