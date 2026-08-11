import { expect, test } from './fixtures/test';

test.describe('uso publico compacto @mobile', () => {
    test('Home y Login siguen siendo utilizables sin overflow horizontal', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Tu biblioteca, tu memoria.' })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();

        await page.goto('/login');
        await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
    });
});
