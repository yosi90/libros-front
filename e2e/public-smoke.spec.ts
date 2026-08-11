import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/test';

test.describe('superficies publicas @smoke', () => {
    test('carga Home y expone las dos rutas de acceso', async ({ page }) => {
        await page.goto('/');

        await expect(page).toHaveTitle('Memoria bibiliográfica');
        await expect(page.getByRole('heading', { name: 'Tu biblioteca, tu memoria.' })).toBeVisible();
        await expect(page.getByRole('link', { name: /Date de alta/ })).toHaveAttribute('href', '/register');
        await expect(page.getByRole('link', { name: /Inicia sesión/ })).toHaveAttribute('href', '/login');
        await expect(page.locator('[data-testid="admin-health"]')).toHaveCount(0);

        const brandIcon = page.locator('.home-brand mat-icon');
        await expect(brandIcon).toHaveCount(1);
        await expect(brandIcon).toHaveCSS('overflow', 'visible');
    });

    test('mantiene accesible el formulario de login y sus enlaces', async ({ page }) => {
        await page.goto('/login');

        await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();
        await expect(page.getByLabel('Correo electrónico')).toBeVisible();
        await expect(page.getByLabel('Introduce tu contraseña')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeDisabled();
        await expect(page.getByText('Olvidé mi contraseña')).toBeVisible();
        await expect(page.getByText('No tienes cuenta? Registrate aqui')).toBeVisible();
    });

    test('valida las rutas publicas de cuenta sin depender del correo real', async ({ page }) => {
        await page.goto('/register');
        await expect(page.getByRole('heading', { name: 'Crea tu biblioteca' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Confirmar registro/ })).toBeDisabled();
        await page.getByLabel('Alias de usuario').fill('qa_lector');
        await page.getByLabel('Correo electrónico').fill('qa@example.test');
        await page.getByLabel('Introduce tu contraseña').fill('Segura123!');
        await expect(page.getByRole('button', { name: /Confirmar registro/ })).toBeEnabled();

        await page.goto('/forgot-password');
        await expect(page.getByRole('heading', { name: 'Recuperar contraseña' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Enviar instrucciones/ })).toBeDisabled();

        await page.goto('/reset-password');
        await expect(page.getByRole('heading', { name: 'Nueva contraseña' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Actualizar contraseña/ })).toBeDisabled();
    });

    test('trata igual la respuesta controlada de recuperacion y no revela cuentas', async ({ page, expectedConsoleErrors }) => {
        expectedConsoleErrors.push(/server responded with a status of 404/);
        await page.route('**/auth/password-reset/request', route => route.fulfill({ status: 404, json: { code: 'account_not_found' } }));
        await page.goto('/forgot-password');
        await page.getByLabel('Correo electrónico').fill('inexistente@example.test');
        await page.getByRole('button', { name: /Enviar instrucciones/ }).click();

        await expect(page).toHaveURL(/\/login\?resetRequested=true$/);
        await expect(page.getByText('Si el correo existe, recibirás instrucciones para recuperar la contraseña.')).toBeVisible();
    });

    test('aplica guards publicos y mantiene una salida para rutas desconocidas', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/home$/);
        await page.goto('/ruta-que-no-existe');
        await expect(page.getByRole('heading', { name: 'Tu biblioteca, tu memoria.' })).toBeVisible();
    });

    for (const route of ['/', '/login', '/register', '/forgot-password', '/reset-password']) {
        test(`no presenta infracciones automaticas WCAG A/AA en ${route}`, async ({ page }) => {
            await page.goto(route);
            const results = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
                .analyze();

            expect(results.violations.map(violation => ({
                id: violation.id,
                impact: violation.impact,
                targets: violation.nodes.map(node => node.target)
            }))).toEqual([]);
        });
    }
});
