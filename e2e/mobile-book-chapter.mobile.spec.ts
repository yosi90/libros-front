import { expect, test } from './fixtures/test';
import { installLocalVisualSession } from './support/local-visual-session';

test.describe('formulario Mobile de capítulo', () => {
    test.beforeEach(async ({ page }) => installLocalVisualSession(page));

    test('mantiene la densidad pedida en compact y medium', async ({ page }) => {
        await page.goto('/book/73/chapter/11');
        await expect(page.locator('.dragon-loader')).toBeHidden();
        await expect(page.locator('html')).toHaveAttribute('data-presentation-active', 'mobile');
        await expect(page.locator('.m-chapter__heading')).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Personajes' })).toHaveCount(0);

        const compactGeometry = await page.evaluate(() => {
            const fields = [...document.querySelectorAll<HTMLElement>('.m-chapter__fields > .m-native-field:not(.m-chapter__name)')];
            const boxes = fields.map(field => field.getBoundingClientRect());
            const input = fields[0]?.querySelector('input');
            const fontTrigger = document.querySelector<HTMLElement>('.rtf-font-select .mat-mdc-select-value-text');
            return {
                fieldCount: fields.length,
                tops: boxes.map(box => Math.round(box.top)),
                right: Math.max(...boxes.map(box => box.right)),
                viewport: document.documentElement.clientWidth,
                inputFontSize: input ? getComputedStyle(input).fontSize : '',
                rtfInputFontSize: fontTrigger ? getComputedStyle(fontTrigger).fontSize : ''
            };
        });
        expect(compactGeometry.fieldCount).toBe(3);
        expect(new Set(compactGeometry.tops).size).toBe(1);
        expect(compactGeometry.right).toBeLessThanOrEqual(compactGeometry.viewport);
        expect(compactGeometry.inputFontSize).toBe('12.72px');
        expect(compactGeometry.rtfInputFontSize).toBe('8px');

        await page.setViewportSize({ width: 718, height: 781 });
        await expect(page.locator('.m-chapter__heading')).toHaveCount(0);
        const assignmentHeights = await page.evaluate(() =>
            [...document.querySelectorAll<HTMLElement>('.m-scene__assignments > article')]
                .map(article => Math.round(article.getBoundingClientRect().height))
        );
        expect(assignmentHeights).toHaveLength(2);
        expect(assignmentHeights[1]).toBeLessThan(assignmentHeights[0]);
    });
});
