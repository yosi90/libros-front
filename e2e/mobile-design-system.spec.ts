import { expect, test } from './fixtures/test';
import AxeBuilder from '@axe-core/playwright';

const SCREENS = ['login', 'library', 'chapter', 'community', 'security'] as const;
const VIEWPORTS = [
    { name: 'compacta', width: 390, height: 844 },
    { name: 'tablet', width: 800, height: 1024 }
] as const;

test.describe('laboratorio del sistema visual Mobile', () => {
    for (const viewport of VIEWPORTS) {
        test(`mantiene las cinco referencias usables en ${viewport.name}`, async ({ page }) => {
            await page.setViewportSize(viewport);

            for (const screen of SCREENS) {
                await page.goto(`/__mobile-design/${screen}`);
                const preview = page.locator('.mobile-preview');
                await expect(preview).toHaveAttribute('data-preview-screen', screen);

                const layout = await page.evaluate(() => {
                    const root = document.documentElement;
                    const previewElement = document.querySelector<HTMLElement>('.mobile-preview');
                    const navigation = document.querySelector<HTMLElement>('.m-navigation');
                    const firstNavigationAction = navigation?.querySelector<HTMLElement>('button');
                    const interactive = [...document.querySelectorAll<HTMLElement>('.mobile-preview button, .mobile-preview .m-field')];
                    return {
                        rootWidth: { client: root.clientWidth, scroll: root.scrollWidth },
                        hasPreview: !!previewElement,
                        backgroundImage: previewElement ? getComputedStyle(previewElement).backgroundImage : '',
                        navigationPosition: navigation ? getComputedStyle(navigation).position : null,
                        navigationActionHeight: firstNavigationAction?.getBoundingClientRect().height ?? null,
                        undersizedControls: interactive.filter(element => {
                            const box = element.getBoundingClientRect();
                            return box.width > 0 && box.height > 0 && (box.width < 44 || box.height < 44);
                        }).length
                    };
                });

                expect(layout.rootWidth.scroll, `${screen} no debe desbordar el documento a ${viewport.width}px`).toBeLessThanOrEqual(layout.rootWidth.client);
                expect(layout.hasPreview, `${screen} debe renderizar el laboratorio`).toBeTruthy();
                expect(layout.backgroundImage, `${screen} no debe heredar texturas Wood`).toBe('none');
                expect(layout.undersizedControls, `${screen} debe respetar targets táctiles de 44px`).toBe(0);

                if (screen === 'login') {
                    expect(layout.navigationPosition).toBeNull();
                } else {
                    expect(layout.navigationPosition).toBe(viewport.width < 600 ? 'fixed' : 'fixed');
                    expect(layout.navigationActionHeight).not.toBeNull();
                    expect(layout.navigationActionHeight!).toBeGreaterThanOrEqual(44);
                }
            }
        });
    }

    test('normaliza pantallas desconocidas a la biblioteca', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/__mobile-design/desconocida');
        await expect(page.locator('.mobile-preview')).toHaveAttribute('data-preview-screen', 'library');
        await expect(page.getByRole('heading', { name: 'Tu biblioteca', exact: true })).toBeVisible();
    });

    test('no introduce infracciones de accesibilidad críticas o serias', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });

        for (const screen of SCREENS) {
            await page.goto(`/__mobile-design/${screen}`);
            await expect(page.locator('.mobile-preview')).toHaveAttribute('data-preview-screen', screen);
            const audit = await new AxeBuilder({ page }).include('.mobile-preview').analyze();
            const blocking = audit.violations.filter(violation => violation.impact === 'critical' || violation.impact === 'serious');
            expect(blocking, `${screen} no debe introducir infracciones críticas o serias`).toEqual([]);
        }
    });
});
