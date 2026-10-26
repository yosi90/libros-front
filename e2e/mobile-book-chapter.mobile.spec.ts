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
        // Capítulo compacto (opción A, 26/10/2026): guardado y sin errores, sus datos en una línea que se despliega.
        await expect(page.locator('.m-chapter__fields')).toHaveCount(0);
        const summary = page.getByRole('button', { name: /^Editar los datos del capítulo: / });
        await expect(summary).toHaveText(/La puerta entreabierta · págs\. 1–14 · nº 1/);
        await summary.click();
        await expect(page.locator('.m-chapter__fields > .m-native-field:not(.m-chapter__name)')).toHaveCount(3);
        await expect(page.getByText('/ 200')).toHaveCount(0);
        // La barra de formato de la escena, solo al escribir en ella.
        await expect(page.locator('.rtf-toolbar')).toHaveCount(0);
        await page.getByRole('textbox', { name: 'Descripción de la escena 1' }).click();
        await expect(page.locator('.rtf-toolbar')).toHaveCount(1);

        const compactGeometry = await page.evaluate(() => {
            const fields = [...document.querySelectorAll<HTMLElement>('.m-chapter__fields > .m-native-field:not(.m-chapter__name)')];
            const boxes = fields.map(field => field.getBoundingClientRect());
            const input = fields[0]?.querySelector('input');
            const locationControl = document.querySelector<HTMLElement>('.m-native-field--autocomplete .m-native-field__control');
            const locationInput = locationControl?.querySelector('input');
            const characterPicker = document.querySelector<HTMLElement>('.m-scene__add');
            const fontTrigger = document.querySelector<HTMLElement>('.rtf-size-select .mat-mdc-select-value-text');
            const rtfEditor = document.querySelector<HTMLElement>('.rtf-editor');
            const scenesTitle = document.querySelector<HTMLElement>('.m-chapter__scenes > header h2');
            const addSceneButton = document.querySelector<HTMLElement>('.m-chapter__scenes > header .m-button');
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
                scenesTitleFontSize: scenesTitle ? getComputedStyle(scenesTitle).fontSize : '',
                addSceneButtonHeight: addSceneButton ? Math.round(addSceneButton.getBoundingClientRect().height) : 0,
                addSceneButtonFontSize: addSceneButton ? getComputedStyle(addSceneButton).fontSize : '',
                rtfInputFontSize: fontTrigger ? getComputedStyle(fontTrigger).fontSize : '',
                rtfSelectedFontSize: fontTrigger?.textContent?.trim() ?? '',
                rtfEditorFontSize: rtfEditor ? getComputedStyle(rtfEditor).fontSize : ''
            };
        });
        expect(compactGeometry.fieldCount).toBe(3);
        expect(new Set(compactGeometry.tops).size).toBe(1);
        expect(compactGeometry.right).toBeLessThanOrEqual(compactGeometry.viewport);
        expect(compactGeometry.inputFontSize).toBe('12.72px');
        expect(compactGeometry.inputHeight).toBe(38);
        expect(compactGeometry.inputPaddingInline).toEqual(['8px', '8px']);
        expect(compactGeometry.locationControlHeight).toBe(38);
        expect(compactGeometry.locationInputHeight).toBe(36);
        expect(compactGeometry.locationInputFontSize).toBe('12.72px');
        expect(compactGeometry.locationInputPaddingLeft).toBe('8px');
        expect(compactGeometry.characterPickerHeight).toBe(44);
        expect(compactGeometry.scenesTitleFontSize).toBe('16px');
        expect(compactGeometry.addSceneButtonHeight).toBe(36);
        expect(compactGeometry.addSceneButtonFontSize).toBe('11.52px');
        expect(compactGeometry.rtfInputFontSize).toBe('8px');
        expect(compactGeometry.rtfSelectedFontSize).toBe('12');
        expect(compactGeometry.rtfEditorFontSize).toBe('10px');

        // El teclado virtual del navegador (lo detecta `AdaptiveLayoutService` por `visualViewport` y lo publica en
        // `data-virtual-keyboard`); los eventos del teclado de Capacitor se retiraron con la APK.
        await page.evaluate(() => { document.documentElement.dataset['virtualKeyboard'] = 'open'; });
        await expect(page.locator('.m-book-navigation--compact')).toBeHidden();
        await page.evaluate(() => { document.documentElement.dataset['virtualKeyboard'] = 'closed'; });
        await expect(page.locator('.m-book-navigation--compact')).toBeVisible();

        await page.setViewportSize({ width: 718, height: 781 });
        await expect(page.locator('.m-chapter__heading')).toHaveCount(0);
        // En medium, el título, la localización y la papelera de la escena en una fila, y los personajes en otra.
        const mediumRows = await page.evaluate(() => {
            const top = (selector: string) => Math.round(document.querySelector<HTMLElement>(selector)!.getBoundingClientRect().top);
            return {
                fields: [top('.m-scene__title'), top('.m-scene__location'), top('.m-scene__delete')],
                people: [...document.querySelectorAll<HTMLElement>('.m-scene__chips > *')].map(item => Math.round(item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2))
            };
        });
        expect(new Set(mediumRows.fields).size).toBe(1);
        expect(new Set(mediumRows.people).size).toBe(1);
    });

    test('muestra el aviso de guardado tras completar un autoguardado real', async ({ page }) => {
        await page.route('**/capitulos/11', async route => {
            const payload = route.request().postDataJSON() as Record<string, unknown>;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    Id: 11,
                    Nombre: payload['Nombre'],
                    Orden: payload['Orden'],
                    Pagina: payload['Pagina'],
                    PaginaFinal: payload['PaginaFinal'],
                    Escenas: []
                })
            });
        });

        await page.goto('/book/73/chapter/11');
        await expect(page.locator('.dragon-loader')).toBeHidden();
        await page.getByRole('button', { name: /^Editar los datos del capítulo: / }).click();
        await expect(page.getByLabel('Título del capítulo')).toHaveValue('La puerta entreabierta');

        await page.getByLabel('Título del capítulo').fill('La puerta entreabierta, revisada');

        await expect(page.locator('.m-book-bar__saved')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('.m-book-bar__saved')).toHaveAttribute('aria-label', 'Guardado');
        const indicatorPresentation = await page.locator('.m-book-bar__saved').evaluate(element => {
            const style = getComputedStyle(element);
            return {
                width: Math.round(Number.parseFloat(style.width)),
                backgroundColor: style.backgroundColor,
                minimumOpacity: style.animationName === 'mobile-book-saved-pulse' ? .68 : 1
            };
        });
        expect(indicatorPresentation.width).toBe(40);
        expect(indicatorPresentation.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(indicatorPresentation.minimumOpacity).toBeGreaterThanOrEqual(.68);
    });
});
