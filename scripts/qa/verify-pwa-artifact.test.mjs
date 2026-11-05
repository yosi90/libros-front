import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { inlineScriptsIn, verifyPwaArtifact } from './verify-pwa-artifact.mjs';

test('acepta un artefacto QA versionado por Angular Service Worker', async () => {
    const root = await createArtifact('main-ABC123.js', {
        '/index.html': 'index-hash',
        '/main-ABC123.js': 'main-hash'
    });
    try {
        await assert.doesNotReject(verifyPwaArtifact(root));
    } finally { await rm(root, { recursive: true, force: true }); }
});

test('rechaza un artefacto QA sin output hashing aunque conserve un manifiesto', async () => {
    const root = await createArtifact('main.js', {
        '/index.html': 'index-hash',
        '/main.js': 'main-hash'
    });
    try {
        await assert.rejects(verifyPwaArtifact(root), /main con hash/);
    } finally { await rm(root, { recursive: true, force: true }); }
});

test('rechaza fondos decorativos pesados dentro del cache PWA', async () => {
    const root = await createArtifact('main-ABC123.js', {
        '/index.html': 'index-hash',
        '/main-ABC123.js': 'main-hash',
        '/assets/media/img/fondo_menu.png': 'background-hash'
    });
    try {
        await assert.rejects(verifyPwaArtifact(root), /no debe cachear fondos o animaciones decorativas pesadas/);
    } finally { await rm(root, { recursive: true, force: true }); }
});

test('rechaza un worker que pueda sustituir el handler reservado de Firebase Auth', async () => {
    const root = await createArtifact('main-ABC123.js', {
        '/index.html': 'index-hash',
        '/main-ABC123.js': 'main-hash'
    }, []);
    try {
        await assert.rejects(verifyPwaArtifact(root), /debe excluir \/__\/auth\/\*\*/);
    } finally { await rm(root, { recursive: true, force: true }); }
});

test('rechaza un index con scripts o manejadores en línea, que la CSP bloquea', async () => {
    const root = await createArtifact('main-ABC123.js', {
        '/index.html': 'index-hash',
        '/main-ABC123.js': 'main-hash'
    }, undefined, `<link rel="stylesheet" href="styles-X.css" media="print" onload="this.media='all'">`);
    try {
        await assert.rejects(verifyPwaArtifact(root), /scripts en línea/);
    } finally { await rm(root, { recursive: true, force: true }); }
});

test('distingue los scripts en línea de los externos y de los bloques de datos', () => {
    assert.deepEqual(inlineScriptsIn('<script src="tema-inicial.js"></script><script defer src="https://estadisticas.yosiftware.es/s.js"></script>'
        + '<script type="application/ld+json">{}</script><a href="/onboarding">ir</a><p data-online="x">sí</p>'), []);
    assert.equal(inlineScriptsIn('<script>alert(1)</script>').length, 1);
    assert.equal(inlineScriptsIn('<script type="module">import "x"</script>').length, 1);
    assert.equal(inlineScriptsIn('<img src="x" onerror="alert(1)">').length, 1);
    assert.equal(inlineScriptsIn('<a href="javascript:void(0)">x</a>').length, 1);
});

async function createArtifact(main, hashTable, navigationUrls = [{ positive: false, regex: '^\\/__\\/auth\\/.*$' }], extraHead = '') {
    const root = await mkdtemp(path.join(os.tmpdir(), 'libros-qa-pwa-'));
    await mkdir(root, { recursive: true });
    await Promise.all([
        writeFile(path.join(root, 'index.html'), `${extraHead}<script src="${main}" type="module"></script>`),
        writeFile(path.join(root, 'ngsw.json'), JSON.stringify({ hashTable, navigationUrls })),
        writeFile(path.join(root, 'ngsw-worker.js'), '/* test worker */')
    ]);
    return root;
}
