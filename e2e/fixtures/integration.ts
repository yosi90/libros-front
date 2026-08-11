import { APIRequestContext, Page } from '@playwright/test';
import { test as base } from './test';
import { qaEnvironmentFromProcess, QaEnvironment, verifyQaEnvironment } from '../support/qa-environment';
import { QaFixturesResponse, QaScenario, getQaFixtures, resetQaDataset } from '../support/qa-reset';

interface IntegrationFixtures {
    qaEnvironment: QaEnvironment;
    qaFixtures: QaFixturesResponse;
    mutatingDataset: void;
    waitForRealtimeEvent: (eventName: string, timeoutMs?: number) => Promise<string>;
}

export const integrationTest = base.extend<IntegrationFixtures>({
    qaEnvironment: async ({ request }, use) => {
        const qa = qaEnvironmentFromProcess();
        if (!qa) throw new Error('QA_API_BASE_URL es obligatoria para la integracion real.');
        await use(await verifyQaEnvironment(request, qa));
    },
    qaFixtures: async ({ request, qaEnvironment }, use) => {
        await use(await getQaFixtures(request, qaEnvironment));
    },
    mutatingDataset: async ({ request, qaEnvironment }, use) => {
        await resetQaDataset(request, qaEnvironment);
        try { await use(); }
        finally { await resetQaDataset(request, qaEnvironment); }
    },
    waitForRealtimeEvent: async ({ page }, use) => {
        await use((eventName, timeoutMs = 10_000) => waitForRealtimeEvent(page, eventName, timeoutMs));
    }
});

async function waitForRealtimeEvent(page: Page, eventName: string, timeoutMs: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`No se recibio el evento realtime ${eventName} en ${timeoutMs} ms.`)), timeoutMs);
        page.on('websocket', socket => {
            socket.on('framereceived', frame => {
                const payload = String(frame.payload);
                if (!payload.includes(eventName)) return;
                clearTimeout(timer);
                resolve(payload);
            });
        });
    });
}

export async function assertDatasetCanBeReset(request: APIRequestContext, qa: QaEnvironment): Promise<void> {
    await resetQaDataset(request, qa);
}

export async function applyQaScenario(request: APIRequestContext, qa: QaEnvironment, scenario: QaScenario): Promise<QaFixturesResponse> {
    return resetQaDataset(request, qa, scenario);
}

export { expect } from '@playwright/test';
