import { test as base } from './test';
import { qaEnvironmentFromProcess, QaEnvironment, verifyQaEnvironment } from '../support/qa-environment';
import { QaFixturesResponse, QaScenario, getQaFixtures, resetQaDataset } from '../support/qa-reset';

interface QaScenarioControl {
    apply(scenario: QaScenario): Promise<QaFixturesResponse>;
}

interface IntegrationFixtures {
    qaEnvironment: QaEnvironment;
    qaFixtures: QaFixturesResponse;
    mutatingDataset: void;
    qaScenario: QaScenarioControl;
}

export const integrationTest = base.extend<IntegrationFixtures>({
    qaEnvironment: async ({ request }, use) => {
        const qa = qaEnvironmentFromProcess();
        if (!qa) throw new Error('QA_API_BASE_URL es obligatoria para la integracion real.');
        await use(await verifyQaEnvironment(request, qa));
    },
    qaFixtures: async ({ qaEnvironment }, use) => {
        await use(await getQaFixtures(qaEnvironment));
    },
    mutatingDataset: [async ({ qaEnvironment }, use) => {
        await resetQaDataset(qaEnvironment);
        try { await use(); }
        finally { await resetQaDataset(qaEnvironment); }
    }, { timeout: 120_000 }],
    qaScenario: [async ({ qaEnvironment }, use) => {
        let changed = false;
        await use({
            apply: async scenario => {
                changed = true;
                return resetQaDataset(qaEnvironment, scenario);
            }
        });
        if (changed) await resetQaDataset(qaEnvironment, 'baseline');
    }, { timeout: 120_000 }]
});

export async function assertDatasetCanBeReset(qa: QaEnvironment): Promise<void> {
    await resetQaDataset(qa);
}

export { expect } from '@playwright/test';
