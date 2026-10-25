import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * La CSP de firebase.json es la de producción. QA usa la plataforma Yosiftware de QA (SDK, API y tiempo real) y su
 * propia API de Libros (ecosistema-kit/ACCESO.md, «Cabeceras de la web»).
 */
const QA_ORIGINS = [
    ['https://cuentas.yosiftware.es', 'https://qa-cuentas.yosiftware.es'],
    ['https://cuentas-api.yosiftware.es', 'https://qa-cuentas-api.yosiftware.es'],
    ['wss://cuentas-ws.yosiftware.es', 'wss://qa-cuentas-ws.yosiftware.es'],
    ['https://libros-api.yosiftware.es', 'https://qa-api.yosiftware.es']
];

export function qaContentSecurityPolicy(policy) {
    return QA_ORIGINS.reduce((current, [production, qa]) => {
        // Se cambian fuentes enteras, nunca trozos: `https://cuentas-api…` no es `https://cuentas…`.
        const parts = current.split(/(\s+)/);
        const isSource = part => part.replace(/;$/, '') === production;
        if (!parts.some(isSource)) throw new Error(`La CSP no incluye ${production}.`);
        return parts.map(part => isSource(part) ? part.replace(production, qa) : part).join('');
    }, policy);
}

function withQaHeaders(headers = []) {
    return headers.map(rule => ({
        ...rule,
        headers: (rule.headers ?? []).map(header => header.key.toLowerCase() === 'content-security-policy'
            ? { ...header, value: qaContentSecurityPolicy(header.value) }
            : header)
    }));
}

export async function prepareHostingConfig(sourcePath, outputPath, siteId) {
    if (siteId !== 'libros-qa') throw new Error('El sitio Hosting no coincide con QA.');

    const source = JSON.parse(await readFile(sourcePath, 'utf8'));
    if (!source.hosting || Array.isArray(source.hosting)) throw new Error('firebase.json debe contener un único bloque Hosting.');
    if (source.hosting.public !== 'dist/book-front/browser') throw new Error('El directorio Hosting no coincide con el artefacto Angular QA.');

    const sourceDirectory = path.dirname(path.resolve(sourcePath));
    const outputDirectory = path.dirname(path.resolve(outputPath));
    if (outputDirectory !== sourceDirectory)
        throw new Error('La configuración Hosting QA debe generarse junto al firebase.json para no cambiar el directorio del proyecto.');

    const qaConfig = { ...source, hosting: { ...source.hosting, site: siteId, headers: withQaHeaders(source.hosting.headers) } };
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
