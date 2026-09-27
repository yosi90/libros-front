import { expect, test } from './fixtures/test';
import { installLocalVisualSession } from './support/local-visual-session';

// Primera visita de una cuenta nueva: la bienvenida de estilo va antes que el aviso de normas.
test('la bienvenida de estilo retiene el aviso de normas hasta elegir el estilo', async ({ page, expectedConsoleErrors }) => {
    expectedConsoleErrors.push(/status (?:of )?403/i);
    await installLocalVisualSession(page, { webPresentation: true });
    await page.route('**/usuarios/me/preferencias-interfaz', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, Preferencias: { Tema: 'light', Version: 1, FechaActualizacion: null } })
    }));
    // Estado real de una cuenta nueva: las normas de creación siguen pendientes.
    await page.route('**/moderacion/mi-estado-acceso', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            success: true, AlcancesActivos: [], Restricciones: [], Sanciones: [],
            Politicas: [{ Tipo: 'creacion', VersionId: 5, Pendiente: true }],
            RequiereLimpiarRealtime: false, AlcancesQueRevocanRealtime: []
        })
    }));
    await page.route('**/notificaciones*', route => route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
            success: false,
            error: 'Debes aceptar la política de creación antes de publicar o modificar contenido.',
            code: 'creation_policy_acceptance_required',
            debug: { message: 'HTTP 403: creation_policy_acceptance_required', requestId: 'e2e' }
        })
    }));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard/books');

    const welcome = page.getByRole('dialog', { name: 'Elige tu estilo' });
    await expect(welcome).toBeVisible({ timeout: 15000 });
    const policyNotice = page.locator('.decision-notice');
    await page.waitForTimeout(1500);
    await expect(policyNotice).toHaveCount(0);

    await welcome.getByRole('button', { name: /Usar el estilo/ }).click();
    await expect(welcome).toBeHidden();
    await expect(policyNotice).toBeVisible();
    await expect(policyNotice).toContainText('Normas de creación pendientes');
});
