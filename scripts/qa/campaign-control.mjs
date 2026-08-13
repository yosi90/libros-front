import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const EXPECTED = Object.freeze({
    apiUrl: 'https://qa-api.yosiftware.es',
    frontUrl: 'https://libros-qa.web.app',
    datasetVersion: '2026.08.2',
    firebaseProjectId: 'libros-qa',
    firebaseSiteId: 'libros-qa',
    realtimeUrl: 'wss://qa-ws.yosiftware.es'
});

const CONTROL_RETRY_OPTIONS = Object.freeze({
    retryCodes: ['qa_lease_busy', 'qa_reset_in_progress'],
    retryTimeoutMs: 120_000,
    retryIntervalMs: 1_000
});

export function qaSettings(environment = process.env) {
    const settings = {
        apiUrl: normalizedUrl(required(environment, 'QA_API_BASE_URL')),
        frontUrl: normalizedUrl(required(environment, 'QA_FRONT_BASE_URL')),
        datasetVersion: required(environment, 'QA_DATASET_VERSION'),
        firebaseProjectId: required(environment, 'QA_FIREBASE_PROJECT_ID'),
        firebaseSiteId: required(environment, 'QA_FIREBASE_SITE_ID'),
        resetToken: required(environment, 'QA_RESET_TOKEN'),
        leaseId: environment.QA_LEASE_ID?.trim() || '',
        runId: `${environment.GITHUB_RUN_ID || 'local'}-${environment.GITHUB_RUN_ATTEMPT || '1'}`
    };

    assertEqual(settings.apiUrl, EXPECTED.apiUrl, 'QA_API_BASE_URL');
    assertEqual(settings.frontUrl, EXPECTED.frontUrl, 'QA_FRONT_BASE_URL');
    assertEqual(settings.datasetVersion, EXPECTED.datasetVersion, 'QA_DATASET_VERSION');
    assertEqual(settings.firebaseProjectId, EXPECTED.firebaseProjectId, 'QA_FIREBASE_PROJECT_ID');
    assertEqual(settings.firebaseSiteId, EXPECTED.firebaseSiteId, 'QA_FIREBASE_SITE_ID');
    if (settings.runId.length > 120) throw new Error('El RunId QA supera 120 caracteres.');
    return settings;
}

export function assertVerifyContract(body, settings) {
    if (!body || typeof body !== 'object') throw new Error('GET /verify no devolvió un objeto JSON.');
    assertEqual(body.Entorno, 'qa', '/verify Entorno');
    assertEqual(body.VersionDatasetQa, settings.datasetVersion, '/verify VersionDatasetQa');
    const sql = body.Componentes?.sqlServer;
    if (!sql || sql.Estado !== 'healthy') throw new Error('GET /verify no confirma SQL Server saludable.');
    assertEqual(body.SourceDirty, false, '/verify SourceDirty');
    assertEqual(body.Componentes?.realtimeGateway?.SourceDirty, false, '/verify Componentes.realtimeGateway.SourceDirty');
    if (typeof body.ReleaseId !== 'string' || !body.ReleaseId.trim())
        throw new Error('GET /verify no publica una revisión desplegada.');
    assertEqual(body.Componentes?.realtimeGateway?.ReleaseId, body.ReleaseId, '/verify revisión API/gateway');
}

export function assertRuntimeContract(body, settings) {
    if (!body || typeof body !== 'object') throw new Error('GET /runtime-config no devolvió un objeto JSON.');
    assertEqual(body.Environment, 'qa', '/runtime-config Environment');
    assertEqual(body.QaDatasetVersion, settings.datasetVersion, '/runtime-config QaDatasetVersion');
    assertEqual(body.Firebase?.ProjectId, settings.firebaseProjectId, '/runtime-config Firebase.ProjectId');
    assertEqual(body.RealtimeWsUrl, EXPECTED.realtimeUrl, '/runtime-config RealtimeWsUrl');
}

export async function validateQaEnvironment(settings, fetchImpl = fetch) {
    const verify = await requestJson(fetchImpl, `${settings.apiUrl}/verify`);
    assertVerifyContract(verify, settings);
    const runtime = await requestJson(fetchImpl, `${settings.apiUrl}/runtime-config`);
    assertRuntimeContract(runtime, settings);
}

async function acquire(settings, fetchImpl = fetch) {
    await validateQaEnvironment(settings, fetchImpl);
    const lease = await requestJson(fetchImpl, `${settings.apiUrl}/qa/lease/acquire`, {
        method: 'POST',
        headers: qaHeaders(settings),
        body: JSON.stringify({ Owner: 'frontend-playwright', RunId: settings.runId })
    }, 201);
    if (typeof lease.LeaseId !== 'string' || !lease.LeaseId.trim())
        throw new Error('La adquisición QA no devolvió LeaseId.');
    await exportLeaseId(lease.LeaseId.trim());
    console.log('Lease QA adquirida y ocultada para los pasos posteriores.');
}

export async function renewQaLease(settings, fetchImpl = fetch) {
    if (!settings.leaseId) return console.log('No hay lease QA que renovar.');
    await requestJsonWithRetry(fetchImpl, `${settings.apiUrl}/qa/lease/${encodeURIComponent(settings.leaseId)}/renew`, {
        method: 'POST',
        headers: qaHeaders(settings)
    }, 200, CONTROL_RETRY_OPTIONS);
    console.log('Lease QA renovada.');
}

async function resetBaseline(settings, fetchImpl = fetch) {
    if (!settings.leaseId) return console.log('No hay lease QA; se omite la restauración.');
    await validateQaEnvironment(settings, fetchImpl);
    const body = await requestJsonWithRetry(fetchImpl, `${settings.apiUrl}/qa/reset`, {
        method: 'POST',
        headers: qaHeaders(settings, true),
        body: JSON.stringify({ Scenario: 'baseline' })
    }, 200, CONTROL_RETRY_OPTIONS);
    assertEqual(body.Environment, 'qa', 'reset Environment');
    assertEqual(body.DatasetVersion, settings.datasetVersion, 'reset DatasetVersion');
    assertEqual(body.Scenario, 'baseline', 'reset Scenario');
    console.log('Dataset QA restaurado a baseline.');
}

async function release(settings, fetchImpl = fetch) {
    if (!settings.leaseId) return console.log('No hay lease QA que liberar.');
    await requestJsonWithRetry(fetchImpl, `${settings.apiUrl}/qa/lease/${encodeURIComponent(settings.leaseId)}`, {
        method: 'DELETE',
        headers: qaHeaders(settings)
    }, 200, CONTROL_RETRY_OPTIONS);
    console.log('Lease QA liberada.');
}

function qaHeaders(settings, includeLease = false) {
    const headers = {
        'Content-Type': 'application/json',
        'X-QA-Reset-Token': settings.resetToken
    };
    if (includeLease) headers['X-QA-Lease-Id'] = settings.leaseId;
    return headers;
}

async function requestJson(fetchImpl, url, init = {}, expectedStatus = 200) {
    const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(15_000) });
    let body;
    try { body = await response.json(); }
    catch { throw new Error(`Respuesta no JSON de ${new URL(url).pathname} (${response.status}).`); }
    if (response.status !== expectedStatus) {
        const code = typeof body?.code === 'string' ? `, código ${body.code}` : '';
        throw new Error(`${new URL(url).pathname} respondió ${response.status}${code}.`);
    }
    return body;
}

export async function requestJsonWithRetry(fetchImpl, url, init = {}, expectedStatus = 200, options = {}) {
    const retryCodes = new Set(options.retryCodes || []);
    const retryTimeoutMs = options.retryTimeoutMs ?? 120_000;
    const retryIntervalMs = options.retryIntervalMs ?? 1_000;
    const wait = options.wait || (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)));
    const deadline = Date.now() + retryTimeoutMs;

    while (true) {
        const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(15_000) });
        let body;
        try { body = await response.json(); }
        catch { throw new Error(`Respuesta no JSON de ${new URL(url).pathname} (${response.status}).`); }
        if (response.status === expectedStatus) return body;

        const code = typeof body?.code === 'string' ? body.code : '';
        const canRetry = response.status === 409 && retryCodes.has(code) && Date.now() < deadline;
        if (!canRetry) {
            const codeSuffix = code ? `, código ${code}` : '';
            throw new Error(`${new URL(url).pathname} respondió ${response.status}${codeSuffix}.`);
        }
        await wait(retryIntervalMs);
    }
}

async function exportLeaseId(leaseId) {
    const githubEnvironment = process.env.GITHUB_ENV?.trim();
    if (!githubEnvironment) throw new Error('GITHUB_ENV es obligatorio para conservar la lease solo durante el job.');
    console.log(`::add-mask::${leaseId}`);
    await appendFile(githubEnvironment, `QA_LEASE_ID=${leaseId}\n`, { encoding: 'utf8', mode: 0o600 });
}

function required(environment, name) {
    const value = environment[name]?.trim();
    if (!value) throw new Error(`${name} es obligatoria.`);
    return value;
}

function normalizedUrl(value) {
    const url = new URL(value);
    return url.toString().replace(/\/$/, '');
}

function assertEqual(actual, expected, label) {
    if (actual !== expected) throw new Error(`${label} no coincide con el contrato QA.`);
}

async function main() {
    const command = process.argv[2];
    const settings = qaSettings();
    switch (command) {
        case 'validate': return validateQaEnvironment(settings);
        case 'acquire': return acquire(settings);
        case 'renew': return renewQaLease(settings);
        case 'reset-baseline': return resetBaseline(settings);
        case 'release': return release(settings);
        default: throw new Error('Comando esperado: validate, acquire, renew, reset-baseline o release.');
    }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch(error => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    });
}
