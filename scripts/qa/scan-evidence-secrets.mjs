import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { yauzl } = require('playwright-core/lib/utilsBundle');

const SECRET_NAMES = Object.freeze([
    'QA_RESET_TOKEN',
    'QA_ADMIN_PASSWORD',
    'QA_MODERATOR_PASSWORD',
    'QA_USER_A_PASSWORD',
    'QA_USER_B_PASSWORD',
    'QA_LEASE_ID'
]);

const EXCLUDED_EVIDENCE = Object.freeze([
    /^test-results\/auth(?:\/|$)/,
    /^test-results\/qa-fixtures\.json$/,
    /^test-results\/firebase\.qa\.json$/
]);

export async function findEvidenceSecretLeaks(roots, environment = process.env, cwd = process.cwd()) {
    const needles = secretNeedles(environment);
    const files = [];
    for (const root of roots) await collectFiles(path.resolve(cwd, root), files);

    const leaks = [];
    for (const file of files) {
        const relative = path.relative(cwd, file).split(path.sep).join('/');
        if (EXCLUDED_EVIDENCE.some(pattern => pattern.test(relative))) continue;
        const content = await readFile(file);
        addLeaks(leaks, relative, findNeedles(content, needles));
        if (relative.endsWith('.zip'))
            addLeaks(leaks, `${relative}::<zip>`, await findNeedlesInZip(content, needles));
        if (relative.endsWith('.html')) {
            const embeddedZip = /<template id="playwrightReportBase64">data:application\/zip;base64,([^<]+)<\/template>/.exec(content.toString('utf8'))?.[1];
            if (embeddedZip)
                addLeaks(leaks, `${relative}::<playwright-report>`, await findNeedlesInZip(Buffer.from(embeddedZip, 'base64'), needles));
        }
    }
    return leaks;
}

export function secretNeedles(environment = process.env) {
    return SECRET_NAMES.flatMap(name => {
        const raw = environment[name]?.trim();
        if (!raw || raw.length < 4) return [];
        const encoded = new Set([
            raw,
            encodeURIComponent(raw),
            JSON.stringify(raw).slice(1, -1),
            Buffer.from(raw, 'utf8').toString('base64'),
            Buffer.from(raw, 'utf8').toString('base64url')
        ]);
        return [{ name, values: [...encoded].map(value => Buffer.from(value, 'utf8')) }];
    });
}

async function collectFiles(target, files) {
    let entries;
    try { entries = await readdir(target, { withFileTypes: true }); }
    catch (error) {
        if (error?.code === 'ENOENT') return;
        throw error;
    }
    for (const entry of entries) {
        const candidate = path.join(target, entry.name);
        if (entry.isDirectory()) await collectFiles(candidate, files);
        else if (entry.isFile()) files.push(candidate);
    }
}

function findNeedles(content, needles) {
    return needles.filter(needle => needle.values.some(value => content.includes(value))).map(needle => needle.name);
}

function addLeaks(leaks, file, names) {
    for (const secret of names) {
        if (!leaks.some(leak => leak.file === file && leak.secret === secret))
            leaks.push({ file, secret });
    }
}

function findNeedlesInZip(content, needles) {
    return new Promise((resolve, reject) => {
        yauzl.fromBuffer(content, { lazyEntries: true }, (openError, archive) => {
            if (openError) return reject(new Error('No se pudo inspeccionar un ZIP de evidencia.'));
            const found = new Set();
            archive.on('error', () => reject(new Error('El ZIP de evidencia es invalido.')));
            archive.on('end', () => resolve([...found]));
            archive.on('entry', entry => {
                if (/\/$/.test(entry.fileName)) return archive.readEntry();
                archive.openReadStream(entry, (streamError, stream) => {
                    if (streamError || !stream) return reject(new Error('No se pudo leer una entrada ZIP de evidencia.'));
                    const maxNeedleLength = Math.max(1, ...needles.flatMap(needle => needle.values.map(value => value.length)));
                    let tail = Buffer.alloc(0);
                    stream.on('data', chunk => {
                        const combined = Buffer.concat([tail, chunk]);
                        for (const needle of needles) {
                            if (!found.has(needle.name) && needle.values.some(value => combined.includes(value)))
                                found.add(needle.name);
                        }
                        tail = combined.subarray(Math.max(0, combined.length - maxNeedleLength + 1));
                    });
                    stream.on('error', () => reject(new Error('No se pudo descomprimir una entrada ZIP de evidencia.')));
                    stream.on('end', () => archive.readEntry());
                });
            });
            archive.readEntry();
        });
    });
}

async function main() {
    const roots = process.argv.slice(2);
    if (!roots.length) throw new Error('Indica al menos un directorio de evidencia para revisar.');
    if (!secretNeedles().length) throw new Error('No hay valores QA disponibles para ejecutar la barrera anti-secretos.');

    const leaks = await findEvidenceSecretLeaks(roots);
    if (leaks.length) {
        for (const leak of leaks)
            console.error(`Evidencia rechazada: ${leak.file} contiene ${leak.secret}.`);
        throw new Error('La evidencia QA contiene valores sensibles y no se puede publicar.');
    }
    console.log('Barrera anti-secretos superada; la evidencia QA no contiene los valores controlados.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch(error => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    });
}
