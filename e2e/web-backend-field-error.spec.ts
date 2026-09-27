import { expect, test } from './fixtures/test';
import { installLocalVisualSession } from './support/local-visual-session';

// El backend señala con `field` el dato que rechaza; la Web lo muestra junto al propio control.
test('Perfil Web marca el alias que rechaza el backend y lo retira al editarlo', async ({ page, expectedConsoleErrors }) => {
    // El 409 simulado es la respuesta esperada; Chromium lo registra como recurso fallido.
    expectedConsoleErrors.push(/status (?:of )?409/i);
    await installLocalVisualSession(page, { webPresentation: true });
    await page.route('**/update', route => route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
            success: false,
            error: 'Ese alias ya está en uso. Elige otro.',
            code: 'username_taken',
            field: 'username',
            debug: { message: 'HTTP 409: username_taken; field=username', requestId: 'e2e' }
        })
    }));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard/profile');
    await expect(page.locator('app-web-profile-view')).toBeVisible({ timeout: 15000 });

    await page.getByRole('navigation', { name: 'Apartados del perfil' }).getByRole('button', { name: 'Identidad pública' }).click();
    await page.getByRole('button', { name: 'Editar alias' }).click();
    const alias = page.getByRole('textbox', { name: 'Alias' });
    await alias.fill('lector_ocupado');
    await page.getByRole('button', { name: 'Guardar' }).click();

    const fieldError = page.locator('.field.is-editing .field__error');
    await expect(fieldError).toHaveText('Ese alias ya está en uso. Elige otro.');
    await expect(alias).toHaveClass(/ng-invalid/);

    await alias.fill('lector_libre');
    await expect(fieldError).toBeHidden();
    await expect(page.getByRole('button', { name: 'Guardar' })).toBeEnabled();
});
