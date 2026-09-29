import { expect, test } from './fixtures/test';
import { installLocalVisualSession } from './support/local-visual-session';

for (const theme of ['light', 'dark'] as const) {
    test(`Perfil Web ${theme}: el avatar señala la imagen y Cambiar permite subirla`, async ({ page }) => {
        await installLocalVisualSession(page, { webPresentation: true });
        await page.addInitScript(value => {
            localStorage.setItem('libros:web-theme:last', value);
            localStorage.setItem('libros:web-theme:37', value);
        }, theme);
        await page.setViewportSize({ width: 1440, height: 900 });
        let uploadedImage = false;
        await page.route('**/image/set/photo', async route => {
            const body = route.request().postDataBuffer()?.toString('utf8') || '';
            uploadedImage = body.includes('avatar.png') && body.includes('image/png');
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
        });
        await page.goto('/dashboard/profile');
        const view = page.locator('app-web-profile-view');
        await expect(view).toBeVisible({ timeout: 15000 });

        await view.getByRole('button', { name: 'Ir a cambiar imagen de perfil' }).click();
        const imageField = view.locator('.field--image');
        await expect(view.getByRole('heading', { name: 'Identidad pública' })).toBeVisible();
        await expect(imageField).toHaveClass(/is-highlighted/);
        await expect(imageField.getByRole('button', { name: 'Cambiar' })).toBeFocused();

        await imageField.getByRole('button', { name: 'Cambiar' }).click();
        await expect(imageField.getByRole('button', { name: 'Elegir imagen' })).toBeVisible();
        await expect(imageField.getByRole('button', { name: 'Guardar' })).toBeDisabled();
        await imageField.locator('input[type="file"]').setInputFiles({
            name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from('fake image')
        });
        await expect(imageField).toContainText('avatar.png');
        await imageField.getByRole('button', { name: 'Guardar' }).click();
        await expect.poll(() => uploadedImage).toBe(true);
        await expect(imageField.getByRole('button', { name: 'Cambiar' })).toBeVisible();
    });
}
