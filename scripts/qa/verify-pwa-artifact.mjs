import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Lo que la CSP sin 'unsafe-inline' en script-src no dejaría ejecutar (firebase.json): `<script>` sin `src` (salvo
 * bloques de datos JSON), manejadores `on…=` y direcciones `javascript:`. Si el build vuelve a meter alguno (por
 * ejemplo, el `onload` del CSS crítico de Angular), la página publicada se rompe en silencio.
 */
export function inlineScriptsIn(html) {
    const found = [];
    for (const [tag, attributes] of html.matchAll(/<script\b([^>]*)>/gi))
        if (!/\ssrc\s*=/i.test(attributes) && !/\stype\s*=\s*["']?application\/(?:ld\+)?json/i.test(attributes)) found.push(tag);
    for (const [tag] of html.matchAll(/<[a-z][^>]*?\son[a-z]+\s*=[^>]*>/gi)) found.push(tag);
    for (const [fragment] of html.matchAll(/\b(?:href|src|action|formaction)\s*=\s*["']?\s*javascript:/gi)) found.push(fragment);
    return found;
}

export async function verifyPwaArtifact(root = 'dist/book-front/browser') {
    const artifactRoot = path.resolve(root);
    const [index, manifestText] = await Promise.all([
        readFile(path.join(artifactRoot, 'index.html'), 'utf8'),
        readFile(path.join(artifactRoot, 'ngsw.json'), 'utf8'),
        access(path.join(artifactRoot, 'ngsw-worker.js'))
    ]);
    const manifest = JSON.parse(manifestText);
    const main = index.match(/src="(main-[A-Z0-9]+\.js)"/i)?.[1];

    if (!main)
        throw new Error('El artefacto QA debe referenciar un main con hash para evitar shells obsoletos.');
    if (!manifest.hashTable || manifest.hashTable[`/${main}`] === undefined)
        throw new Error('ngsw.json no contiene el main referenciado por index.html.');
    if (manifest.hashTable['/index.html'] === undefined)
        throw new Error('ngsw.json no versiona index.html.');
    const inline = inlineScriptsIn(index);
    if (inline.length > 0)
        throw new Error(`index.html lleva scripts en línea que la CSP bloquea: ${inline.join(' ')}`);
    const cachedDecorativeMedia = Object.keys(manifest.hashTable).filter(url =>
        url.startsWith('/assets/media/img/desechadas/') ||
        /^\/assets\/media\/img\/(?:escritorio_|fondo_|dragon.*-unscreen\.)/.test(url)
    );
    if (cachedDecorativeMedia.length > 0)
        throw new Error(`ngsw.json no debe cachear fondos o animaciones decorativas pesadas: ${cachedDecorativeMedia.join(', ')}`);
    const authHandlerExcluded = manifest.navigationUrls?.some(rule =>
        rule?.positive === false && typeof rule.regex === 'string' && new RegExp(rule.regex).test('/__/auth/handler')
    );
    if (!authHandlerExcluded)
        throw new Error('ngsw.json debe excluir /__/auth/** para no sustituir los handlers reservados de Firebase por la SPA.');

    console.log(`Artefacto PWA verificado con ${main}, sin scripts en línea.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    verifyPwaArtifact(process.argv[2]).catch(error => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    });
}
