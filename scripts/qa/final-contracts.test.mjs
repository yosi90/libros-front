import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('las rutas internas publicadas son canonicas', async () => {
    const files = await sourceFiles(path.join(root, 'src', 'app'));
    const forbiddenRoutes = /["'`]\/?(?:dashboard\/)?(?:addAuthor|addUniverse|addSaga|addAntology|addBook|updateAuthor|updateUniverse|updateSaga|updateAntology|updateBook)(?:\/|["'`?#])|["'`]\/?dashboard\/chat(?:\/|["'`?#])/;
    const offenders = [];

    for (const file of files) {
        if (file.endsWith('.spec.ts')) continue;
        const source = await readFile(file, 'utf8');
        if (forbiddenRoutes.test(source)) offenders.push(path.relative(root, file));
    }

    assert.deepEqual(offenders, [], `Consumidores de rutas heredadas: ${offenders.join(', ')}`);
});

test('ningun token de autenticacion se persiste en Web Storage', async () => {
    const files = await sourceFiles(path.join(root, 'src', 'app'));
    const offenders = [];

    for (const file of files) {
        if (file.endsWith('.spec.ts')) continue;
        const source = await readFile(file, 'utf8');
        const calls = source.matchAll(/(?:localStorage|sessionStorage)\.setItem\(\s*(["'`])([^"'`]+)\1/g);
        for (const match of calls) {
            if (/(?:^|[-_:])(jwt|access[-_]?token|id[-_]?token|custom[-_]?token|refresh)(?:$|[-_:])/i.test(match[2]))
                offenders.push(`${path.relative(root, file)}:${match[2]}`);
        }
    }

    assert.deepEqual(offenders, [], `Tokens persistidos: ${offenders.join(', ')}`);
});

test('la PWA no cachea API privada y convive con Firebase Messaging', async () => {
    const ngsw = JSON.parse(await readFile(path.join(root, 'ngsw-config.json'), 'utf8'));
    const angular = JSON.parse(await readFile(path.join(root, 'angular.json'), 'utf8'));
    const build = angular.projects['book-front'].architect.build.options;
    const assetGlobs = build.assets.map(asset => typeof asset === 'string' ? asset : asset.glob);

    assert.equal(ngsw.dataGroups, undefined, 'No debe existir cache de respuestas de API.');
    assert.ok(ngsw.navigationUrls.includes('!/__/auth/**'), 'El handler OAuth debe quedar fuera del fallback SPA.');
    assert.ok(ngsw.navigationUrls.includes('!/firebase-cloud-messaging-push-scope/**'), 'El scope de Messaging debe quedar fuera del fallback SPA.');
    assert.equal(angular.projects['book-front'].architect.build.configurations.production.serviceWorker, 'ngsw-config.json');
    assert.equal(angular.projects['book-front'].architect.build.configurations.qa.serviceWorker, 'ngsw-config.json');
    assert.ok(assetGlobs.includes('firebase-messaging-sw.js'), 'El worker de Firebase Messaging debe copiarse al artefacto.');
});

test('Bootstrap permanece confinado a los dos puntos legacy declarados', async () => {
    const files = [
        ...(await sourceFiles(path.join(root, 'src'))),
        path.join(root, 'angular.json')
    ];
    const consumers = [];

    for (const file of files) {
        const source = await readFile(file, 'utf8');
        if (/bootstrap/i.test(source)) consumers.push(path.relative(root, file).replaceAll('\\', '/'));
    }

    assert.deepEqual(consumers.sort(), ['src/main.ts', 'src/styles.sass']);
});

test('Hosting publica CSP y cabeceras defensivas sin bloquear popup OAuth', async () => {
    const firebase = JSON.parse(await readFile(path.join(root, 'firebase.json'), 'utf8'));
    const globalHeaders = firebase.hosting.headers.find(rule => rule.source === '**')?.headers ?? [];
    const headers = Object.fromEntries(globalHeaders.map(header => [header.key.toLowerCase(), header.value]));

    assert.match(headers['content-security-policy'], /object-src 'none'/);
    assert.match(headers['content-security-policy'], /frame-ancestors 'self'/);
    assert.match(headers['content-security-policy'], /frame-src 'self' https:/);
    assert.equal(headers['x-content-type-options'], 'nosniff');
    assert.equal(headers['referrer-policy'], 'strict-origin-when-cross-origin');
    assert.equal(headers['cross-origin-opener-policy'], 'same-origin-allow-popups');
    assert.equal(headers['x-frame-options'], 'SAMEORIGIN');
});

async function sourceFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...await sourceFiles(target));
        else if (/\.(?:html|sass|scss|ts)$/.test(entry.name)) files.push(target);
    }
    return files;
}
