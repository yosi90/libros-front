import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function prepareHostingConfig(sourcePath, outputPath, siteId) {
    if (siteId !== 'libros-qa') throw new Error('El sitio Hosting no coincide con QA.');

    const source = JSON.parse(await readFile(sourcePath, 'utf8'));
    if (!source.hosting || Array.isArray(source.hosting)) throw new Error('firebase.json debe contener un único bloque Hosting.');
    if (source.hosting.public !== 'dist/book-front/browser') throw new Error('El directorio Hosting no coincide con el artefacto Angular QA.');

    const sourceDirectory = path.dirname(path.resolve(sourcePath));
    const outputDirectory = path.dirname(path.resolve(outputPath));
    if (outputDirectory !== sourceDirectory)
        throw new Error('La configuración Hosting QA debe generarse junto al firebase.json para no cambiar el directorio del proyecto.');

    const qaConfig = { ...source, hosting: { ...source.hosting, site: siteId } };
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(qaConfig, null, 2)}\n`, 'utf8');
    console.log('Configuración Hosting QA temporal preparada.');
}

async function main() {
    const [sourcePath = 'firebase.json', outputPath = 'firebase.qa.generated.json'] = process.argv.slice(2);
    await prepareHostingConfig(sourcePath, outputPath, process.env.QA_FIREBASE_SITE_ID?.trim());
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch(error => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    });
}
