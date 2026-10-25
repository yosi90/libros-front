// Sirve la web de desarrollo en https://libros.dev.yosiftware.es (127.0.0.15:443) contra la plataforma Yosiftware de
// QA y la API de QA de Libros por el proxy (MIGRACION.md del kit, paso 7). Ver docs/codex/PROJECT_WORKING_NOTES.md.
//
// El certificado comodín *.dev.yosiftware.es es del servidor y nunca entra en el repositorio. Sus rutas llegan por
// variables (LIBROS_DEV_CERT y LIBROS_DEV_KEY) o por la configuración privada e ignorada `.runtime/dev-plataforma.json`:
//   { "certificado": "C:/…/_.dev.yosiftware.es.crt", "clave": "C:/…/_.dev.yosiftware.es.key" }
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const privateConfigPath = path.join(root, '.runtime', 'dev-plataforma.json');

export function resolveCertificate(env = process.env, readPrivateConfig = () => JSON.parse(readFileSync(privateConfigPath, 'utf8'))) {
    let certificado = env['LIBROS_DEV_CERT']?.trim();
    let clave = env['LIBROS_DEV_KEY']?.trim();
    if (!certificado || !clave) {
        let privateConfig = {};
        try { privateConfig = readPrivateConfig(); } catch { /* Sin configuración privada: se explica abajo. */ }
        certificado ||= privateConfig.certificado;
        clave ||= privateConfig.clave;
    }
    if (!certificado || !clave)
        throw new Error('Falta el certificado de *.dev.yosiftware.es: define LIBROS_DEV_CERT y LIBROS_DEV_KEY o crea .runtime/dev-plataforma.json con «certificado» y «clave».');
    return { certificado, clave };
}

async function main() {
    const { certificado, clave } = resolveCertificate();
    for (const file of [certificado, clave])
        if (!existsSync(file)) throw new Error(`No existe ${file}.`);

    const ng = path.join(root, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');
    const child = spawn(process.execPath, [ng, 'serve', '--configuration', 'dev-plataforma', '--ssl-cert', certificado, '--ssl-key', clave, ...process.argv.slice(2)], {
        cwd: root,
        stdio: 'inherit'
    });
    const stop = () => child.kill('SIGINT');
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
    child.on('exit', code => process.exit(code ?? 0));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch(error => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    });
}
