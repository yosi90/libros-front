import { expect, test } from '@playwright/test';

test('loads the Angular application shell', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('Memoria bibiliográfica');
    await expect(page.locator('app-root')).toBeAttached();
});

test('keeps Material icon glyphs from being clipped by their host', async ({ page }) => {
    await page.goto('/');
    const icon = page.locator('mat-icon').first();

    await expect(icon).toBeVisible();
    await expect(icon).toHaveCSS('overflow', 'visible');
});
