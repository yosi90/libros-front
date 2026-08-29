import { test as base } from './test';
import type { BrowserContext } from '@playwright/test';
import { qaEnvironmentFromProcess, QaEnvironment, verifyQaEnvironment } from '../support/qa-environment';
import { QaFixturesResponse, QaScenario, getQaFixtures, resetQaDataset } from '../support/qa-reset';
import { credentialsFor, loginThroughUi } from '../support/auth';
import { readQaFixtureCache } from '../support/qa-cache';

interface QaScenarioControl {
    apply(scenario: QaScenario): Promise<QaFixturesResponse>;
}

interface IntegrationFixtures {
    qaEnvironment: QaEnvironment;
    qaFixtures: QaFixturesResponse;
    mutatingDataset: void;
    qaScenario: QaScenarioControl;
}

interface AuthenticatedWorkerFixtures {
    authenticatedContext: BrowserContext;
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
        finally { await resetQaDataset(qaEnvironment, 'baseline', 'Cleanup'); }
    }, { timeout: 120_000 }],
    qaScenario: [async ({ qaEnvironment }, use) => {
        let changed = false;
        await use({
            apply: async scenario => {
                changed = true;
                return resetQaDataset(qaEnvironment, scenario);
            }
        });
        if (changed) await resetQaDataset(qaEnvironment, 'baseline', 'Cleanup');
    }, { timeout: 120_000 }]
});

export const authenticatedIntegrationTest = integrationTest.extend<{}, AuthenticatedWorkerFixtures>({
    authenticatedContext: [async ({ browser }, use) => {
        const credentials = credentialsFor('userA', await readQaFixtureCache());
        if (!credentials) throw new Error('Faltan las credenciales QA de member-a.');
        const baseURL = process.env['PLAYWRIGHT_BASE_URL']?.trim() || 'http://127.0.0.1:4200';
        const context = await browser.newContext({
            baseURL,
            serviceWorkers: 'block',
            viewport: { width: 1440, height: 900 },
            storageState: { cookies: [], origins: [] }
        });
        try {
            const loginPage = await context.newPage();
            await loginThroughUi(loginPage, credentials);
            await loginPage.close();
            await use(context);
        } finally {
            await context.close();
        }
    }, { scope: 'worker' }],
    page: async ({ authenticatedContext }, use) => {
        const page = await authenticatedContext.newPage();
        try { await use(page); }
        finally { await page.close(); }
    }
});

export async function assertDatasetCanBeReset(qa: QaEnvironment): Promise<void> {
    await resetQaDataset(qa);
}

export { expect } from '@playwright/test';
