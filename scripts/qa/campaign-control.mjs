import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const EXPECTED = Object.freeze({
    apiUrl: 'https://qa-api.yosiftware.es',
    frontUrl: 'https://qa-libros.yosiftware.es',
    datasetVersion: '2026.08.3',
    firebaseProjectId: 'libros-qa',
    firebaseSiteId: 'libros-qa',
    realtimeUrl: 'wss://qa-ws.yosiftware.es'
});

const CONTROL_RETRY_OPTIONS = Object.freeze({
    retryCodes: ['qa_lease_busy', 'qa_reset_in_progress'],
    retryTimeoutMs: 120_000,
    retryIntervalMs: 1_000
});

const QA_SCENARIOS = new Set(['baseline', 'version-conflict', 'expired-sessions', 'rate-limited', 'realtime-recovery']);
const QA_STATUS_VALUES = new Set(['ready', 'degraded', 'blocked']);
const QA_STATUS_REASONS = new Set([
    'reset_in_progress',
    'campaign_lease_active',
    'caller_lease_invalid',
    'api_source_dirty',
    'gateway_source_dirty_or_unknown',
    'release_unavailable',
    'release_mismatch',
    'component_degraded',
    'component_unavailable'
]);
const QA_COMPONENT_STATUS = new Set(['healthy', 'degraded', 'unavailable']);
const QA_COMPONENTS = ['SqlServer', 'Nats', 'RealtimeGateway', 'OutboxRelay', 'FirestoreProjectionWorker', 'PushWorker', 'RetentionWorker'];
const QA_CAPABILITY_VALUES = Object.freeze({
    BeginCampaign: new Set(['allowed', 'blocked']),
    ContinueCampaign: new Set(['allowed', 'blocked']),
    Reset: new Set(['allowed', 'retry', 'blocked']),
    Cleanup: new Set(['allowed', 'retry', 'blocked', 'not-needed'])
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

export function assertVerifyIdentityContract(body, settings) {
    if (!body || typeof body !== 'object') throw new Error('GET /verify no devolvió un objeto JSON.');
    assertEqual(body.Entorno, 'qa', '/verify Entorno');
    assertEqual(body.VersionDatasetQa, settings.datasetVersion, '/verify VersionDatasetQa');
}

export function assertVerifyContract(body, settings) {
    assertVerifyIdentityContract(body, settings);
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

export function assertQaStatusContract(body, settings) {
    assertExactObject(body, ['success', 'Environment', 'DatasetVersion', 'Status', 'Reasons', 'Scenario', 'Lease', 'Capabilities', 'Deployment', 'Components'], 'GET /qa/status');
    assertEqual(body.success, true, '/qa/status success');
    assertEqual(body.Environment, 'qa', '/qa/status Environment');
    assertEqual(body.DatasetVersion, settings.datasetVersion, '/qa/status DatasetVersion');
    assertEnum(body.Status, QA_STATUS_VALUES, '/qa/status Status');
    if (!Array.isArray(body.Reasons) || new Set(body.Reasons).size !== body.Reasons.length)
        throw new Error('/qa/status Reasons debe ser una lista sin duplicados.');
    for (const reason of body.Reasons) assertEnum(reason, QA_STATUS_REASONS, '/qa/status Reasons');

    assertExactObject(body.Scenario, ['Active', 'ResetInProgress'], '/qa/status Scenario');
    assertEnum(body.Scenario.Active, QA_SCENARIOS, '/qa/status Scenario.Active');
    assertBoolean(body.Scenario.ResetInProgress, '/qa/status Scenario.ResetInProgress');

    assertExactObject(body.Lease, ['Active', 'CallerState'], '/qa/status Lease');
    assertBoolean(body.Lease.Active, '/qa/status Lease.Active');
    assertEnum(body.Lease.CallerState, new Set(['absent', 'active', 'invalid']), '/qa/status Lease.CallerState');

    assertExactObject(body.Capabilities, Object.keys(QA_CAPABILITY_VALUES), '/qa/status Capabilities');
    for (const [name, values] of Object.entries(QA_CAPABILITY_VALUES))
        assertEnum(body.Capabilities[name], values, `/qa/status Capabilities.${name}`);

    assertExactObject(body.Deployment, ['Api', 'RealtimeGateway'], '/qa/status Deployment');
    assertExactObject(body.Deployment.Api, ['ReleaseId', 'SourceDirty'], '/qa/status Deployment.Api');
    assertString(body.Deployment.Api.ReleaseId, '/qa/status Deployment.Api.ReleaseId');
    assertNullableBoolean(body.Deployment.Api.SourceDirty, '/qa/status Deployment.Api.SourceDirty');
    assertExactObject(body.Deployment.RealtimeGateway, ['Status', 'ReleaseId', 'SourceDirty'], '/qa/status Deployment.RealtimeGateway');
    assertEnum(body.Deployment.RealtimeGateway.Status, QA_COMPONENT_STATUS, '/qa/status Deployment.RealtimeGateway.Status');
    assertNullableString(body.Deployment.RealtimeGateway.ReleaseId, '/qa/status Deployment.RealtimeGateway.ReleaseId');
    assertNullableBoolean(body.Deployment.RealtimeGateway.SourceDirty, '/qa/status Deployment.RealtimeGateway.SourceDirty');

    assertExactObject(body.Components, QA_COMPONENTS, '/qa/status Components');
    for (const component of QA_COMPONENTS) {
        assertExactObject(body.Components[component], ['Status'], `/qa/status Components.${component}`);
        assertEnum(body.Components[component].Status, QA_COMPONENT_STATUS, `/qa/status Components.${component}.Status`);
    }
    return body;
}

export async function validateQaEnvironment(settings, fetchImpl = fetch) {
    const verify = await requestJson(fetchImpl, `${settings.apiUrl}/verify`);
    assertVerifyContract(verify, settings);
    const runtime = await requestJson(fetchImpl, `${settings.apiUrl}/runtime-config`);
    assertRuntimeContract(runtime, settings);
    const status = await requestQaStatus(settings, fetchImpl, false);
    assertEqual(status.Status, 'ready', '/qa/status Status antes de adquirir lease');
    assertEqual(status.Capabilities.BeginCampaign, 'allowed', '/qa/status BeginCampaign');
    assertEqual(status.Lease.Active, false, '/qa/status Lease.Active antes de campaña');
    assertEqual(status.Lease.CallerState, 'absent', '/qa/status Lease.CallerState antes de campaña');
}

export async function validateQaEnvironmentSafety(settings, fetchImpl = fetch) {
    const verify = await requestJson(fetchImpl, `${settings.apiUrl}/verify`);
    assertVerifyIdentityContract(verify, settings);
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
    settings.leaseId = lease.LeaseId.trim();
    await exportLeaseId(settings.leaseId);
    const status = await requestQaStatus(settings, fetchImpl, true);
    assertActiveCallerLease(status);
    assertEqual(status.Capabilities.ContinueCampaign, 'allowed', '/qa/status ContinueCampaign tras adquirir lease');
    assertEqual(status.Capabilities.Reset, 'allowed', '/qa/status Reset tras adquirir lease');
    assertEqual(status.Capabilities.Cleanup, 'allowed', '/qa/status Cleanup tras adquirir lease');
    console.log('Lease QA adquirida y ocultada para los pasos posteriores.');
}

export async function renewQaLease(settings, fetchImpl = fetch, capability = 'ContinueCampaign') {
    if (!settings.leaseId) return console.log('No hay lease QA que renovar.');
    await waitForQaCapability(settings, capability, fetchImpl);
    await requestJsonWithRetry(fetchImpl, `${settings.apiUrl}/qa/lease/${encodeURIComponent(settings.leaseId)}/renew`, {
        method: 'POST',
        headers: qaHeaders(settings)
    }, 200, CONTROL_RETRY_OPTIONS);
    console.log('Lease QA renovada.');
}

export async function resetBaseline(settings, fetchImpl = fetch) {
    if (!settings.leaseId) return console.log('No hay lease QA; se omite la restauración.');
    await validateQaEnvironmentSafety(settings, fetchImpl);
    await waitForQaCapability(settings, 'Cleanup', fetchImpl);
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

export async function waitForQaCapability(settings, capability, fetchImpl = fetch, options = {}) {
    if (!Object.hasOwn(QA_CAPABILITY_VALUES, capability))
        throw new Error(`Capacidad QA desconocida: ${capability}.`);
    if (!settings.leaseId) throw new Error(`QA_LEASE_ID es obligatoria para comprobar ${capability}.`);
    const retryTimeoutMs = options.retryTimeoutMs ?? CONTROL_RETRY_OPTIONS.retryTimeoutMs;
    const retryIntervalMs = options.retryIntervalMs ?? CONTROL_RETRY_OPTIONS.retryIntervalMs;
    const wait = options.wait || (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)));
    const deadline = Date.now() + retryTimeoutMs;

    while (true) {
        const status = await requestQaStatus(settings, fetchImpl, true);
        assertActiveCallerLease(status);
        const value = status.Capabilities[capability];
        if (value === 'allowed') return status;
        if (value === 'retry' && Date.now() < deadline) {
            await wait(retryIntervalMs);
            continue;
        }
        throw new Error(`/qa/status impide ${capability}: ${value}; Reasons=${status.Reasons.join(',') || 'none'}.`);
    }
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

async function requestQaStatus(settings, fetchImpl, includeLease) {
    const body = await requestJson(fetchImpl, `${settings.apiUrl}/qa/status`, {
        headers: qaHeaders(settings, includeLease)
    });
    return assertQaStatusContract(body, settings);
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

function assertActiveCallerLease(status) {
    assertEqual(status.Lease.Active, true, '/qa/status Lease.Active durante campaña');
    assertEqual(status.Lease.CallerState, 'active', '/qa/status Lease.CallerState durante campaña');
}

function assertExactObject(value, keys, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error(`${label} no devolvió un objeto tipado.`);
    const actual = Object.keys(value).sort();
    const expected = [...keys].sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index]))
        throw new Error(`${label} no coincide con la estructura cerrada del contrato QA.`);
}

function assertEnum(value, allowed, label) {
    if (typeof value !== 'string' || !allowed.has(value))
        throw new Error(`${label} contiene un valor fuera del contrato QA.`);
}

function assertBoolean(value, label) {
    if (typeof value !== 'boolean') throw new Error(`${label} debe ser booleano.`);
}

function assertNullableBoolean(value, label) {
    if (value !== null && typeof value !== 'boolean') throw new Error(`${label} debe ser booleano o null.`);
}

function assertString(value, label) {
    if (typeof value !== 'string') throw new Error(`${label} debe ser string.`);
}

function assertNullableString(value, label) {
    if (value !== null && typeof value !== 'string') throw new Error(`${label} debe ser string o null.`);
}

async function main() {
    const command = process.argv[2];
    const settings = qaSettings();
    switch (command) {
        case 'validate': return validateQaEnvironment(settings);
        case 'acquire': return acquire(settings);
        case 'renew': return renewQaLease(settings);
        case 'renew-cleanup': return renewQaLease(settings, fetch, 'Cleanup');
        case 'reset-baseline': return resetBaseline(settings);
        case 'release': return release(settings);
        default: throw new Error('Comando esperado: validate, acquire, renew, renew-cleanup, reset-baseline o release.');
    }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch(error => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    });
}
