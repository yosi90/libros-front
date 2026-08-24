import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

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
    const cachedDecorativeMedia = Object.keys(manifest.hashTable).filter(url =>
        url.startsWith('/assets/media/img/desechadas/') ||
        /^\/assets\/media\/img\/(?:escritorio_|fondo_|dragon.*-unscreen\.)/.test(url)
    );
    if (cachedDecorativeMedia.length > 0)
        throw new Error(`ngsw.json no debe cachear fondos o animaciones decorativas pesadas: ${cachedDecorativeMedia.join(', ')}`);

    console.log(`Artefacto PWA QA verificado con ${main}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    verifyPwaArtifact(process.argv[2]).catch(error => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    });
}
