import { qaEnvironmentFromProcess, verifyQaCampaignReadinessWithFetch } from './support/qa-environment';
import { resetQaDataset } from './support/qa-reset';
import { writeQaFixtureCache } from './support/qa-cache';

export default async function globalSetup(): Promise<void> {
    const qa = qaEnvironmentFromProcess();
    if (!qa) throw new Error('QA_API_BASE_URL es obligatoria para la campaña de integración.');

    await verifyQaCampaignReadinessWithFetch(qa);
    await writeQaFixtureCache(await resetQaDataset(qa, 'baseline'));
}
