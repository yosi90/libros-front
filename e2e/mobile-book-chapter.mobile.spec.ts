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
            const locationControl = document.querySelector<HTMLElement>('.m-native-field--autocomplete .m-native-field__control');
            const locationInput = locationControl?.querySelector('input');
            const characterPicker = document.querySelector<HTMLElement>('.m-character-picker');
            const fontTrigger = document.querySelector<HTMLElement>('.rtf-size-select .mat-mdc-select-value-text');
            const rtfEditor = document.querySelector<HTMLElement>('.rtf-editor');
            const inputStyle = input ? getComputedStyle(input) : null;
            const locationInputStyle = locationInput ? getComputedStyle(locationInput) : null;
            return {
                fieldCount: fields.length,
                tops: boxes.map(box => Math.round(box.top)),
                right: Math.max(...boxes.map(box => box.right)),
                viewport: document.documentElement.clientWidth,
                inputFontSize: inputStyle?.fontSize ?? '',
                inputHeight: input ? Math.round(input.getBoundingClientRect().height) : 0,
                inputPaddingInline: inputStyle ? [inputStyle.paddingLeft, inputStyle.paddingRight] : [],
                locationControlHeight: locationControl ? Math.round(locationControl.getBoundingClientRect().height) : 0,
                locationInputHeight: locationInput ? Math.round(locationInput.getBoundingClientRect().height) : 0,
                locationInputFontSize: locationInputStyle?.fontSize ?? '',
                locationInputPaddingLeft: locationInputStyle?.paddingLeft ?? '',
                characterPickerHeight: characterPicker ? Math.round(characterPicker.getBoundingClientRect().height) : 0,
                rtfInputFontSize: fontTrigger ? getComputedStyle(fontTrigger).fontSize : '',
                rtfSelectedFontSize: fontTrigger?.textContent?.trim() ?? '',
                rtfEditorFontSize: rtfEditor ? getComputedStyle(rtfEditor).fontSize : ''
            };
        });
        expect(compactGeometry.fieldCount).toBe(3);
        expect(new Set(compactGeometry.tops).size).toBe(1);
        expect(compactGeometry.right).toBeLessThanOrEqual(compactGeometry.viewport);
        expect(compactGeometry.inputFontSize).toBe('12.72px');
        expect(compactGeometry.inputHeight).toBe(44);
        expect(compactGeometry.inputPaddingInline).toEqual(['8px', '8px']);
        expect(compactGeometry.locationControlHeight).toBe(44);
        expect(compactGeometry.locationInputHeight).toBe(42);
        expect(compactGeometry.locationInputFontSize).toBe('12.72px');
        expect(compactGeometry.locationInputPaddingLeft).toBe('8px');
        expect(compactGeometry.characterPickerHeight).toBe(44);
        expect(compactGeometry.rtfInputFontSize).toBe('8px');
        expect(compactGeometry.rtfSelectedFontSize).toBe('10');
        expect(compactGeometry.rtfEditorFontSize).toBe('10px');

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
