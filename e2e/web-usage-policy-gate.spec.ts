import { Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import { installLocalVisualSession } from './support/local-visual-session';

// Las normas de uso bloquean casi toda la app: el aviso debe salir al entrar, sin esperar a un 403.
async function pendingUsagePolicy(page: Page): Promise<void> {
    await installLocalVisualSession(page, { webPresentation: true });
    await page.route('**/moderacion/mi-estado-acceso', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            success: true, AlcancesActivos: [], Restricciones: [], Sanciones: [],
            Politicas: [{ Tipo: 'uso', VersionId: 9, Pendiente: true }],
            RequiereLimpiarRealtime: false, AlcancesQueRevocanRealtime: []
        })
    }));
    await page.setViewportSize({ width: 1440, height: 900 });
}

test('avisa de las normas de uso pendientes nada más entrar', async ({ page }) => {
    await pendingUsagePolicy(page);
    await page.goto('/dashboard/books');

    const notice = page.locator('.decision-notice');
    await expect(notice).toBeVisible({ timeout: 15000 });
    await expect(notice).toContainText('Normas de comunidad pendientes');

    await notice.getByRole('button', { name: 'Revisar ahora' }).click();
    // Web redirige la sección de cuenta al Perfil.
    await expect(page).toHaveURL(/\/dashboard\/profile\?section=security&tab=policies/);
    await expect(notice).toHaveCount(0);
});

test('no tapa la sección donde se aceptan las normas', async ({ page }) => {
    await pendingUsagePolicy(page);
    const access = page.waitForResponse('**/moderacion/mi-estado-acceso');
    await page.goto('/dashboard/account-security?section=policies');
    await access;
    await expect(page).toHaveURL(/tab=policies/);
    await page.waitForTimeout(1000);
    await expect(page.locator('.decision-notice')).toHaveCount(0);
});
