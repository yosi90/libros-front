import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function verifyHostedAppLinks(baseUrl, artifactRoot = 'dist/book-front/browser', fetchImpl = fetch) {
    const origin = new URL(baseUrl);
    const expectedText = await readFile(path.resolve(artifactRoot, '.well-known', 'assetlinks.json'), 'utf8');
    const expected = normalizeAssetLinks(JSON.parse(expectedText));

    if (expected.length === 0)
        throw new Error('El artefacto QA no contiene asociaciones Android App Links.');

    const endpoint = new URL('/.well-known/assetlinks.json', origin);
    endpoint.searchParams.set('verification', Date.now().toString());
    const response = await fetchImpl(endpoint, {
        headers: { accept: 'application/json' },
        cache: 'no-store',
        redirect: 'error'
    });
    if (!response.ok)
        throw new Error(`Hosting QA devolvió HTTP ${response.status} para assetlinks.json.`);

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json'))
        throw new Error(`Hosting QA publicó assetlinks.json con Content-Type inesperado: ${contentType || 'ausente'}.`);

    const actual = normalizeAssetLinks(await response.json());
    if (JSON.stringify(actual) !== JSON.stringify(expected))
        throw new Error('El assetlinks.json publicado no coincide con el artefacto QA desplegado.');

    console.log(`Android App Links publicados y verificados en ${origin.origin}.`);
}

function normalizeAssetLinks(value) {
    if (!Array.isArray(value))
        throw new Error('assetlinks.json debe contener un array JSON.');

    return value.map(entry => ({
        relation: [...(entry?.relation ?? [])].sort(),
        target: {
            namespace: entry?.target?.namespace,
            package_name: entry?.target?.package_name,
            sha256_cert_fingerprints: [...(entry?.target?.sha256_cert_fingerprints ?? [])].sort()
        }
    })).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const [baseUrl, artifactRoot] = process.argv.slice(2);
    if (!baseUrl) throw new Error('Falta la URL base de Hosting QA.');
    verifyHostedAppLinks(baseUrl, artifactRoot).catch(error => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    });
}
