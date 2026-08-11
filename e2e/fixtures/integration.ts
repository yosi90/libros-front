import { APIRequestContext } from '@playwright/test';
import { test as base } from './test';
import { qaEnvironmentFromProcess, QaEnvironment, verifyQaEnvironment } from '../support/qa-environment';
import { QaFixturesResponse, QaScenario, getQaFixtures, resetQaDataset } from '../support/qa-reset';

interface IntegrationFixtures {
    qaEnvironment: QaEnvironment;
    qaFixtures: QaFixturesResponse;
    mutatingDataset: void;
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
    }
});

export async function assertDatasetCanBeReset(request: APIRequestContext, qa: QaEnvironment): Promise<void> {
    await resetQaDataset(request, qa);
}

export async function applyQaScenario(request: APIRequestContext, qa: QaEnvironment, scenario: QaScenario): Promise<QaFixturesResponse> {
    return resetQaDataset(request, qa, scenario);
}

export { expect } from '@playwright/test';
