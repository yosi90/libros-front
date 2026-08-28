import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/test';

const VIEWPORTS = [
    { name: 'compacta', width: 390, height: 844 },
    { name: 'tablet', width: 800, height: 1024 }
] as const;

test.describe('presentación pública Mobile local', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('book-front:mobile-presentation-preview', 'true');
        });
    });

    for (const viewport of VIEWPORTS) {
        test(`instancia solo Home y Login Mobile en ${viewport.name}`, async ({ page }, testInfo) => {
            await page.setViewportSize(viewport);
            await page.goto('/home');

            await expect(page.locator('html')).toHaveAttribute('data-presentation-active', 'mobile');
            await expect(page.getByRole('heading', { name: 'Cada libro deja una huella.' })).toBeVisible();
            await expect(page.locator('app-home-wood-view')).toHaveCount(0);
            if (process.env['CAPTURE_VISUAL_REVIEW'] === 'true')
                await page.screenshot({ path: testInfo.outputPath(`home-${viewport.name}.png`), fullPage: true });

            await page.getByRole('link', { name: 'Ya tengo cuenta' }).click();
            await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo.' })).toBeVisible();
            await expect(page.locator('.auth-page')).toHaveCount(0);
            await expect(page.locator('.mobile-public-shell__brand')).toBeVisible();
            if (process.env['CAPTURE_VISUAL_REVIEW'] === 'true')
                await page.screenshot({ path: testInfo.outputPath(`login-${viewport.name}.png`), fullPage: true });

            const layout = await page.evaluate(() => ({
                clientWidth: document.documentElement.clientWidth,
                scrollWidth: document.documentElement.scrollWidth,
                undersizedButtons: [...document.querySelectorAll<HTMLElement>('.mobile-ui button, .mobile-ui a.m-button, .mobile-ui a.m-icon-button')]
                    .filter(element => {
                        const box = element.getBoundingClientRect();
                        return box.width > 0 && box.height > 0 && (box.width < 44 || box.height < 44);
                    }).length
            }));
            expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
            expect(layout.undersizedButtons).toBe(0);

            const audit = await new AxeBuilder({ page }).include('.mobile-ui').analyze();
            expect(audit.violations.filter(item => item.impact === 'critical' || item.impact === 'serious')).toEqual([]);

            await page.goto('/register');
            await expect(page.getByRole('heading', { name: 'Crea tu biblioteca.' })).toBeVisible();
            await expect(page.locator('.auth-page')).toHaveCount(0);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
            const registerAudit = await new AxeBuilder({ page }).include('.mobile-ui').analyze();
            expect(registerAudit.violations.filter(item => item.impact === 'critical' || item.impact === 'serious')).toEqual([]);
            if (process.env['CAPTURE_VISUAL_REVIEW'] === 'true')
                await page.screenshot({ path: testInfo.outputPath(`register-${viewport.name}.png`), fullPage: true });

            const remainingRoutes = [
                { path: '/forgot-password', heading: 'Vuelve a tu biblioteca.' },
                { path: '/reset-password', heading: 'Recuperación completada.' },
                { path: '/verify-email', heading: 'Correo verificado.' }
            ];
            for (const route of remainingRoutes) {
                await page.goto(route.path);
                await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
                await expect(page.locator('.auth-page')).toHaveCount(0);
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
            }
        });
    }

    test('conserva el borrador al sustituir Mobile y Wood en 1050/1051', async ({ page }) => {
        await page.setViewportSize({ width: 800, height: 1024 });
        await page.goto('/register');
        const mobileAlias = page.getByLabel('Alias de usuario');
        await mobileAlias.fill('lectora_qa');
        await expect(mobileAlias).toHaveValue('lectora_qa');

        await page.setViewportSize({ width: 1051, height: 800 });
        await expect(page.locator('html')).toHaveAttribute('data-presentation-active', 'wood');
        await expect(page.getByLabel('Alias de usuario')).toHaveValue('lectora_qa');
        await expect(page.locator('app-register-mobile-view')).toHaveCount(0);

        await page.setViewportSize({ width: 800, height: 1024 });
        await expect(page.locator('html')).toHaveAttribute('data-presentation-active', 'mobile');
        await expect(page.getByLabel('Alias de usuario')).toHaveValue('lectora_qa');
        await expect(page.locator('app-register-wood-view')).toHaveCount(0);
    });
});
