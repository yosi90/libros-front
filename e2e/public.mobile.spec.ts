import { expect, test } from './fixtures/test';

test.describe('uso publico compacto @mobile', () => {
    test('Home sigue siendo utilizable sin overflow horizontal, con la cuenta de Yosiftware', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Cada libro deja una huella.' })).toBeVisible();
        await expect(page.locator('yosi-acceso').getByRole('button', { name: 'Entrar' })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
    });
});
