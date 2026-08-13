import { APIRequestContext, expect } from '@playwright/test';

export interface QaEnvironment {
    apiUrl: string;
    datasetVersion: string;
    firebaseProjectId: string;
    environmentId?: 'qa';
}

const PRODUCTION_HOST = 'libros-api.yosiftware.es';
const EXPECTED_API_URL = 'https://qa-api.yosiftware.es/';
const EXPECTED_REALTIME_URL = 'wss://qa-ws.yosiftware.es';

export function qaEnvironmentFromProcess(): QaEnvironment | null {
    const apiUrl = process.env['QA_API_BASE_URL']?.trim();
    if (!apiUrl) return null;

    const url = new URL(apiUrl);
    if (url.hostname === PRODUCTION_HOST)
        throw new Error('Las pruebas QA se niegan a usar el host de produccion.');

    const normalizedApiUrl = apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`;
    if (normalizedApiUrl !== EXPECTED_API_URL)
        throw new Error('QA_API_BASE_URL no coincide con el host QA autorizado.');

    const datasetVersion = requiredEnvironment('QA_DATASET_VERSION');
    const firebaseProjectId = requiredEnvironment('QA_FIREBASE_PROJECT_ID');
    if (datasetVersion !== '2026.08.2' || firebaseProjectId !== 'libros-qa')
        throw new Error('La version o el proyecto Firebase no coinciden con el contrato QA.');

    return { apiUrl: normalizedApiUrl, datasetVersion, firebaseProjectId };
}

export async function verifyQaEnvironment(request: APIRequestContext, qa: QaEnvironment): Promise<QaEnvironment> {
    const verifyResponse = await request.get(`${qa.apiUrl}verify`);
    expect(verifyResponse.ok(), 'GET /verify debe responder antes de una campaña QA').toBeTruthy();
    const verify = await verifyResponse.json() as VerifyResponse;

    const runtimeResponse = await request.get(`${qa.apiUrl}runtime-config`);
    expect(runtimeResponse.ok(), 'GET /runtime-config debe responder antes de una campaña QA').toBeTruthy();
    const runtime = await runtimeResponse.json() as RuntimeConfigResponse;

    assertQaContracts(verify, runtime, qa);

    return { ...qa, environmentId: 'qa' };
}

export async function verifyQaEnvironmentWithFetch(qa: QaEnvironment, timeoutMs = 20_000): Promise<QaEnvironment> {
    const verify = await fetchJson<VerifyResponse>(`${qa.apiUrl}verify`, timeoutMs);
    const runtime = await fetchJson<RuntimeConfigResponse>(`${qa.apiUrl}runtime-config`, timeoutMs);
    assertQaContracts(verify, runtime, qa);

    return { ...qa, environmentId: 'qa' };
}

interface VerifyResponse {
    Entorno?: string;
    VersionDatasetQa?: string | null;
    ReleaseId?: string | null;
    SourceDirty?: boolean;
    Componentes?: {
        sqlServer?: { Estado?: string };
        realtimeGateway?: { ReleaseId?: string | null; SourceDirty?: boolean };
    };
}

interface RuntimeConfigResponse {
    Environment?: string;
    QaDatasetVersion?: string | null;
    RealtimeWsUrl?: string;
    Firebase?: { ProjectId?: string };
}

function assertQaContracts(verify: VerifyResponse, runtime: RuntimeConfigResponse, qa: QaEnvironment): void {
    assertEqual(verify.Entorno, 'qa', 'GET /verify debe identificar explicitamente QA');
    assertEqual(verify.VersionDatasetQa, qa.datasetVersion, 'GET /verify debe publicar la version QA esperada');
    assertEqual(verify.Componentes?.sqlServer?.Estado, 'healthy', 'GET /verify debe confirmar SQL Server saludable');
    assertEqual(verify.SourceDirty, false, 'GET /verify debe acreditar un despliegue limpio');
    assertEqual(verify.Componentes?.realtimeGateway?.SourceDirty, false, 'GET /verify debe acreditar un gateway limpio');
    if (typeof verify.ReleaseId !== 'string' || !verify.ReleaseId.trim())
        throw new Error('GET /verify debe publicar ReleaseId antes de la campaña QA');
    assertEqual(verify.Componentes?.realtimeGateway?.ReleaseId, verify.ReleaseId, 'API y gateway realtime deben publicar la misma revision');
    assertEqual(runtime.Environment, 'qa', 'runtime-config debe identificar explicitamente QA');
    assertEqual(runtime.Firebase?.ProjectId, qa.firebaseProjectId, 'runtime-config debe publicar el proyecto Firebase QA');
    assertEqual(runtime.RealtimeWsUrl, EXPECTED_REALTIME_URL, 'runtime-config debe publicar el WebSocket QA');
    assertEqual(runtime.QaDatasetVersion, qa.datasetVersion, 'runtime-config debe publicar la version QA');
}

async function fetchJson<T>(url: string, timeoutMs: number): Promise<T> {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok)
        throw new Error(`${new URL(url).pathname} respondio ${response.status} durante la barrera QA.`);
    try { return await response.json() as T; }
    catch { throw new Error(`${new URL(url).pathname} no devolvio JSON durante la barrera QA.`); }
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
    if (actual !== expected) throw new Error(message);
}

function requiredEnvironment(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`${name} es obligatoria para la campaña QA.`);
    return value;
}
