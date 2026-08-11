import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { authStatePath, credentialsFor, loginThroughUi, QaRole } from './support/auth';
import { readQaFixtureCache } from './support/qa-cache';

test('crea estados autenticados por rol sin conservar evidencia sensible', async ({ browser, browserName }) => {
    const fixtures = await readQaFixtureCache();
    for (const role of ['admin', 'moderator', 'userA', 'userB'] as QaRole[]) {
        const credentials = credentialsFor(role, fixtures);
        expect(credentials, `Faltan email de fixture o contraseña secreta para ${role}.`).not.toBeNull();
        const context = await browser.newContext();
        try {
            const page = await context.newPage();
            await loginThroughUi(page, credentials!);
            const statePath = authStatePath(role, browserName);
            await mkdir(path.dirname(statePath), { recursive: true });
            await context.storageState({ path: statePath });
        } finally {
            await context.close();
        }
    }
});
