import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { pathToFileURL } from 'node:url';
import { acquireQaLease, qaSettings, releaseQaLease, renewQaLease, resetBaseline } from './campaign-control.mjs';
import { runWithLeaseKeepalive } from './run-with-lease.mjs';

const PUBLIC_NAMES = ['QA_API_BASE_URL', 'QA_FRONT_BASE_URL', 'QA_DATASET_VERSION', 'QA_FIREBASE_PROJECT_ID', 'QA_FIREBASE_SITE_ID'];
const PRIVATE_NAMES = ['QA_RESET_TOKEN', 'QA_ADMIN_PASSWORD', 'QA_MODERATOR_PASSWORD', 'QA_USER_A_PASSWORD', 'QA_USER_B_PASSWORD', 'QA_PHONE_TEST_NUMBER', 'QA_PHONE_TEST_CODE'];

export function localQaEnvironment(source, defaults) {
    const supplied = parseEnv(source.replace(/^\uFEFF/, ''));
    const publicDefaults = parseEnv(defaults);
    if (supplied.QA_LEASE_ID?.trim()) throw new Error('El archivo privado no puede fijar QA_LEASE_ID; se adquiere en cada campaña.');
    if (supplied.QA_RESET_TOKEN && supplied.LIBROS_QA_RESET_TOKEN && supplied.QA_RESET_TOKEN !== supplied.LIBROS_QA_RESET_TOKEN)
        throw new Error('El archivo privado contiene dos tokens de control QA distintos.');
    const environment = {};
    for (const name of PUBLIC_NAMES) environment[name] = supplied[name] || publicDefaults[name] || '';
    for (const name of PRIVATE_NAMES) if (supplied[name]) environment[name] = supplied[name];
    environment.QA_RESET_TOKEN ||= supplied.LIBROS_QA_RESET_TOKEN || '';
    return environment;
}

export async function runLocalCampaign(settings, command, args, operations = {}) {
    const acquire = operations.acquire || acquireQaLease;
    const run = operations.run || runWithLeaseKeepalive;
    const renew = operations.renew || renewQaLease;
    const reset = operations.reset || resetBaseline;
    const release = operations.release || releaseQaLease;
    const exportLease = operations.exportLease || (id => { process.env.QA_LEASE_ID = id; });
    const errors = [];
    try {
        await acquire(settings, fetch, exportLease);
        await run(settings, command, args);
    } catch (error) { errors.push(error); }
    finally {
        if (settings.leaseId) {
            try { await renew(settings, fetch, 'Cleanup'); } catch (error) { errors.push(error); }
            try { await reset(settings); } catch (error) { errors.push(error); }
            try { await release(settings); } catch (error) { errors.push(error); }
        }
        delete process.env.QA_LEASE_ID;
    }
    if (errors.length) throw new AggregateError(errors, 'La campaña local QA no completó todos sus pasos.');
}

async function main() {
    const [option, envFile, separator, command, ...args] = process.argv.slice(2);
    if (option !== '--env-file' || !envFile || separator !== '--' || !command)
        throw new Error('Uso: node scripts/qa/run-local-campaign.mjs --env-file <archivo privado> -- <comando> [argumentos]');
    const environment = localQaEnvironment(await readFile(envFile, 'utf8'), await readFile('.env.qa.example', 'utf8'));
    Object.assign(process.env, environment);
    delete process.env.QA_LEASE_ID;
    process.env.GITHUB_RUN_ID ||= `local-editions-${Date.now()}`;
    const settings = qaSettings(process.env);
    try { await runLocalCampaign(settings, command, args); }
    catch (error) {
        const secrets = [...PRIVATE_NAMES.map(name => environment[name]), settings.leaseId].filter(Boolean);
        const errors = error instanceof AggregateError ? error.errors : [error];
        for (const failure of errors) {
            let message = failure instanceof Error ? failure.message : 'Error de campaña QA.';
            for (const secret of secrets) message = message.split(secret).join('[secreto]');
            console.error(message);
        }
        process.exitCode = 1;
    }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch(() => { console.error('No se pudo preparar la campaña QA desde el archivo privado.'); process.exitCode = 1; });
}
