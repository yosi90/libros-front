import { expect, integrationTest as test } from './fixtures/integration';
import { authStatePath, QaRole } from './support/auth';

test.describe('estados autenticados reutilizables por rol @integration', () => {
    for (const role of ['admin', 'moderator', 'userA', 'userB'] as QaRole[]) {
        test(`restaura la sesión de ${role}`, async ({ browser }, testInfo) => {
            const context = await browser.newContext({ storageState: authStatePath(role, testInfo.project.name) });
            try {
                const page = await context.newPage();
                await page.goto('/dashboard');
                await expect(page).toHaveURL(/\/dashboard(?:\/|$)/);
                await expect(page.locator('body')).not.toContainText('Iniciar sesión');
            } finally {
                await context.close();
            }
        });
    }
});
