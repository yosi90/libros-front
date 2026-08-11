import { expect, test } from './fixtures/test';

test.describe('regresion visual publica @visual', () => {
    test.skip(({ browserName }) => browserName !== 'chromium', 'Los baselines visuales se mantienen en Chromium.');

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => { Math.random = () => 0.25; });
    });

    test('Home conserva su composicion editorial', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveScreenshot('home.webp', { fullPage: true, animations: 'disabled' });
    });

    test('Login conserva su composicion editorial', async ({ page }) => {
        await page.goto('/login');
        await expect(page).toHaveScreenshot('login.webp', { fullPage: true, animations: 'disabled' });
    });
});
