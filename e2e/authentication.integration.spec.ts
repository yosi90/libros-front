import { expect, integrationTest as test } from './fixtures/integration';
import { authStatePath, QaRole } from './support/auth';

test.describe('estados autenticados reutilizables por rol @integration', () => {
    for (const role of ['admin', 'moderator', 'userA', 'userB'] as QaRole[]) {
        test(`restaura la sesión de ${role}`, async ({ browser, baseURL }, testInfo) => {
            test.skip(!baseURL?.startsWith('https://qa-libros.yosiftware.es'), 'La cookie Strict solo puede restaurarse desde el Hosting QA del mismo sitio.');
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

    test('accede con el teléfono ficticio sin enviar un SMS real', async ({ browser }) => {
        const phone = process.env['QA_PHONE_TEST_NUMBER'];
        const code = process.env['QA_PHONE_TEST_CODE'];
        expect(phone, 'Falta QA_PHONE_TEST_NUMBER').toBeTruthy();
        expect(code, 'Falta QA_PHONE_TEST_CODE').toBeTruthy();

        const context = await browser.newContext();
        try {
            const page = await context.newPage();
            await page.goto('/login');
            await page.getByText('Acceder con teléfono').click();
            await page.getByLabel('Teléfono en formato internacional').fill(phone!);
            await page.getByRole('button', { name: 'Enviar código' }).click();
            await page.getByLabel('Código de seis cifras').fill(code!);
            await page.getByRole('button', { name: 'Confirmar código' }).click();
            await page.waitForURL(/\/dashboard(?:\/|$)/, { timeout: 30_000 });
        } finally {
            await context.close();
        }
    });
});
