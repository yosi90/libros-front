import { expect, test } from './fixtures/test';

test.describe('uso publico compacto @mobile', () => {
    test('Home sigue siendo utilizable sin overflow horizontal, con la cuenta de Yosiftware', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Cada libro deja una huella.' })).toBeVisible();
        // Lo que pinta `<yosi-acceso>` es del SDK: el doble lo deja vacío y se prueba contra la plataforma de QA.
        await expect(page.locator('yosi-acceso')).toHaveCount(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
    });
});
