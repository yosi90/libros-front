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
            // Mobile en navegador solo existe con la presentación Web desactivada (solo local).
            localStorage.setItem('book-front:web-presentation', 'off');
        });
    });

    for (const viewport of VIEWPORTS) {
        test(`instancia solo Home Mobile, con la cuenta de Yosiftware, en ${viewport.name}`, async ({ page }, testInfo) => {
            await page.setViewportSize(viewport);
            await page.goto('/home');

            await expect(page.locator('html')).toHaveAttribute('data-presentation-active', 'mobile');
            await expect(page.getByRole('heading', { name: 'Cada libro deja una huella.' })).toBeVisible();
            await expect(page.locator('app-home-wood-view')).toHaveCount(0);
            if (process.env['CAPTURE_VISUAL_REVIEW'] === 'true')
                await page.screenshot({ path: testInfo.outputPath(`home-${viewport.name}.png`), fullPage: true });

            await expect(page.locator('.mobile-public-shell__brand')).toBeVisible();
            await expect(page.locator('yosi-acceso')).toHaveCount(1);
            await expect(page.getByRole('button', { name: 'Ya tengo cuenta' })).toBeVisible();

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
        });
    }

    test('Home cabe sin scroll en el viewport plegado del Honor', async ({ page }) => {
        await page.setViewportSize({ width: 353, height: 792 });
        await page.goto('/home');
        await page.locator('html').evaluate(element => (element as HTMLElement).style.setProperty('--app-safe-top', '33px'));

        const content = page.locator('.mobile-public-shell__content');
        await expect(content).toBeVisible();
        expect(await content.evaluate(element => element.scrollHeight)).toBeLessThanOrEqual(
            await content.evaluate(element => element.clientHeight)
        );
    });

    test('cubre los anchos contractuales y ambas orientaciones', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'compact-390', 'La matriz contractual completa se ejecuta una sola vez en Chromium.');
        const widths = [360, 390, 600, 800, 1050, 1051] as const;

        for (const width of widths) {
            for (const height of [1200, 300]) {
                await page.setViewportSize({ width, height });
                await page.goto('/home');
                await expect(page.locator('html')).toHaveAttribute('data-presentation-active', width <= 1050 ? 'mobile' : 'wood');
                await expect(page.locator('html')).toHaveAttribute('data-orientation', width < height ? 'portrait' : 'landscape');
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
            }
        }
    });
});
