import { request } from '@playwright/test';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { qaEnvironmentFromProcess, verifyQaEnvironment } from './support/qa-environment';
import { resetQaDataset } from './support/qa-reset';

export default async function globalTeardown(): Promise<void> {
    try {
        const qa = qaEnvironmentFromProcess();
        if (qa) {
            const api = await request.newContext();
            try {
                await resetQaDataset(api, await verifyQaEnvironment(api, qa), 'baseline');
            } finally {
                await api.dispose();
            }
        }
    } finally {
        const authDirectory = path.resolve('test-results', 'auth');
        const testResultsDirectory = path.resolve('test-results');
        if (authDirectory.startsWith(`${testResultsDirectory}${path.sep}`))
            await rm(authDirectory, { recursive: true, force: true });
        await rm(path.resolve('test-results', 'qa-fixtures.json'), { force: true });
    }
}
