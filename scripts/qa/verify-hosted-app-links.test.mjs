import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { verifyHostedAppLinks } from './verify-hosted-app-links.mjs';

const association = [{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
        namespace: 'android_app',
        package_name: 'es.yosiftware.libros.qa',
        sha256_cert_fingerprints: ['AA:BB']
    }
}];

test('acepta la asociación Android publicada por el mismo artefacto QA', async () => {
    const root = await createArtifact(association);
    const fetchImpl = async () => new Response(JSON.stringify(association), {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' }
    });
    try {
        await assert.doesNotReject(verifyHostedAppLinks('https://qa-libros.yosiftware.es', root, fetchImpl));
    } finally { await rm(root, { recursive: true, force: true }); }
});

test('rechaza el array vacío que ocultaba una publicación obsoleta', async () => {
    const root = await createArtifact(association);
    const fetchImpl = async () => new Response('[]', {
        status: 200,
        headers: { 'content-type': 'application/json' }
    });
    try {
        await assert.rejects(
            verifyHostedAppLinks('https://qa-libros.yosiftware.es', root, fetchImpl),
            /no coincide con el artefacto/
        );
    } finally { await rm(root, { recursive: true, force: true }); }
});

test('rechaza una respuesta HTML aunque tenga estado 200', async () => {
    const root = await createArtifact(association);
    const fetchImpl = async () => new Response('<html></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' }
    });
    try {
        await assert.rejects(
            verifyHostedAppLinks('https://qa-libros.yosiftware.es', root, fetchImpl),
            /Content-Type inesperado/
        );
    } finally { await rm(root, { recursive: true, force: true }); }
});

async function createArtifact(value) {
    const root = await mkdtemp(path.join(os.tmpdir(), 'libros-app-links-'));
    const directory = path.join(root, '.well-known');
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'assetlinks.json'), JSON.stringify(value));
    return root;
}
