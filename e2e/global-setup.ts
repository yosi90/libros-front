import { request } from '@playwright/test';
import { qaEnvironmentFromProcess, verifyQaEnvironment } from './support/qa-environment';
import { resetQaDataset } from './support/qa-reset';
import { writeQaFixtureCache } from './support/qa-cache';

export default async function globalSetup(): Promise<void> {
    const qa = qaEnvironmentFromProcess();
    if (!qa) throw new Error('QA_API_BASE_URL es obligatoria para la campaña de integración.');

    const api = await request.newContext();
    try {
        const verified = await verifyQaEnvironment(api, qa);
        await writeQaFixtureCache(await resetQaDataset(api, verified, 'baseline'));
    } finally {
        await api.dispose();
    }
}
