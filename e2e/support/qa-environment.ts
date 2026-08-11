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
    const verify = await verifyResponse.json() as {
        Entorno?: string;
        VersionDatasetQa?: string | null;
        Componentes?: { sqlServer?: { Estado?: string } };
    };
    expect(verify.Entorno, 'GET /verify debe identificar explicitamente QA').toBe('qa');
    expect(verify.VersionDatasetQa, 'GET /verify debe publicar la version QA esperada').toBe(qa.datasetVersion);
    expect(verify.Componentes?.sqlServer?.Estado, 'GET /verify debe confirmar SQL Server saludable').toBe('healthy');

    const runtimeResponse = await request.get(`${qa.apiUrl}runtime-config`);
    expect(runtimeResponse.ok(), 'GET /runtime-config debe responder antes de una campaña QA').toBeTruthy();
    const runtime = await runtimeResponse.json() as {
        Environment?: string;
        QaDatasetVersion?: string | null;
        RealtimeWsUrl?: string;
        Firebase?: { ProjectId?: string };
    };
    expect(runtime.Environment).toBe('qa');
    expect(runtime.Firebase?.ProjectId).toBe(qa.firebaseProjectId);
    expect(runtime.RealtimeWsUrl).toBe(EXPECTED_REALTIME_URL);
    expect(runtime.QaDatasetVersion, 'runtime-config debe publicar la version QA').toBe(qa.datasetVersion);

    return { ...qa, environmentId: 'qa' };
}

function requiredEnvironment(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`${name} es obligatoria para la campaña QA.`);
    return value;
}
