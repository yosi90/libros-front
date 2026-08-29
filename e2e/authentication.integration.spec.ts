import { expect, integrationTest as test } from './fixtures/integration';
import { authStatePath, QaRole } from './support/auth';

test.describe('estados autenticados reutilizables por rol @integration', () => {
    for (const role of ['admin', 'moderator', 'userA', 'userB'] as QaRole[]) {
        test(`restaura la sesión de ${role}`, async ({ browser, baseURL }, testInfo) => {
            test.skip(!baseURL?.startsWith('https://qa-libros.yosiftware.es'), 'La cookie Strict solo puede restaurarse desde el Hosting QA del mismo sitio.');
            const context = await browser.newContext({
                baseURL,
                serviceWorkers: 'block',
                storageState: authStatePath(role, testInfo.project.name)
            });
            try {
                const page = await context.newPage();
                await page.goto('/dashboard');
                await expect(page).toHaveURL(/\/dashboard\/books(?:[?#]|$)/);
                await expect(page.locator('app-books')).toBeVisible({ timeout: 30_000 });
                await expect(page.locator('body')).not.toContainText('Iniciar sesión');
            } finally {
                await context.close();
            }
        });
    }

});

test.describe('acceso telefónico aislado @integration', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('accede con el teléfono ficticio sin enviar un SMS real', async ({ page, baseURL }) => {
        test.skip(!baseURL?.startsWith('https://qa-libros.yosiftware.es'), 'El login telefónico de aceptación se ejecuta en el Hosting QA canónico del mismo sitio.');
        test.setTimeout(90_000);
        const phone = process.env['QA_PHONE_TEST_NUMBER'];
        const code = process.env['QA_PHONE_TEST_CODE'];
        expect(phone, 'Falta QA_PHONE_TEST_NUMBER').toBeTruthy();
        expect(code, 'Falta QA_PHONE_TEST_CODE').toBeTruthy();

        await page.goto('/login');
        const phoneAccess = page.getByText('Acceder con teléfono', { exact: true });
        await expect(phoneAccess).toBeVisible({ timeout: 20_000 });
        await phoneAccess.click();
        await page.getByLabel('Teléfono en formato internacional').fill(phone!);

        const preflightPromise = page.waitForResponse(response => response.url().endsWith('/auth/phone/preflight') && response.request().method() === 'POST');
        await page.getByRole('button', { name: 'Enviar código' }).click();
        const preflight = await preflightPromise;
        expect(preflight.status(), `Preflight telefónico rechazado con ${await responseCode(preflight)}`).toBe(201);

        await page.getByLabel('Código de seis cifras').fill(code!);
        const sessionPromise = page.waitForResponse(response => response.url().endsWith('/auth/session') && response.request().method() === 'POST');
        await page.getByRole('button', { name: 'Confirmar código' }).click();
        const session = await sessionPromise;
        const sessionStatus = session.status();
        if (sessionStatus !== 200)
            throw new Error(`La API rechazó la identidad telefónica vinculada con ${sessionStatus} (${await responseCode(session)}).`);
        await expect(page).toHaveURL(/\/dashboard(?:\/|$)/, { timeout: 60_000 });
        await expect(page.locator('body')).not.toContainText('Iniciar sesión');
    });
});

async function responseCode(response: { json(): Promise<unknown> }): Promise<string> {
    try {
        const body = await response.json() as { code?: unknown };
        return typeof body.code === 'string' ? body.code : 'sin código contractual';
    } catch {
        return 'respuesta no JSON';
    }
}
