import { expect, test } from './fixtures/test';

import { installLocalVisualSession, visualBook } from './support/local-visual-session';

test.describe('regresion visual Wood autenticada @visual', () => {
    test.skip(({ browserName }) => browserName !== 'chromium', 'Los baselines visuales se mantienen en Chromium.');

    test.beforeEach(async ({ page }) => installLocalVisualSession(page));

    test('Cuenta y seguridad se integra en el escritorio Wood', async ({ page }) => {
        await page.goto('/dashboard/account-security');
        await expect(page.getByRole('heading', { name: 'Cuenta y seguridad' })).toBeVisible();
        await expect(page.locator('.dragon-loader')).toBeHidden();
        await expect(page.locator('html')).toHaveAttribute('data-presentation-active', 'wood');
        await expect(page.locator('.library-shell')).toHaveClass(/library-shell--wood/);
        await expect(page).toHaveScreenshot('account-security.webp', {
            fullPage: true,
            animations: 'disabled',
            maxDiffPixels: 200
        });
    });

    test('Administracion no se puede abrir desde Mobile', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/dashboard/adminpanel');
        await expect(page).toHaveURL(/\/dashboard\/books(?:[?#]|$)/);
        await expect(page.locator('html')).toHaveAttribute('data-presentation-target', 'mobile');
    });

    test('El shell, indice y busqueda del libro conservan Wood', async ({ page }) => {
        await page.goto('/book/73/search');
        await expect(page.getByRole('heading', { name: 'Búsqueda avanzada' })).toBeVisible();
        await expect(page.locator('.dragon-loader')).toBeHidden();
        await expect(page.locator('html')).toHaveAttribute('data-presentation-target', 'wood');
        await expect(page.locator('html')).toHaveAttribute('data-presentation-active', 'wood');
        await expect(page).toHaveScreenshot('book-search.webp', { fullPage: true, animations: 'disabled' });
    });

    test('El editor de capítulo conserva la composición Wood', async ({ page }) => {
        await page.goto('/book/73/chapter/11');
        await expect(page.getByRole('heading', { name: 'Escenas' })).toBeVisible();
        await expect(page.locator('.dragon-loader')).toBeHidden();
        await expect(page.locator('html')).toHaveAttribute('data-presentation-target', 'wood');
        await expect(page.locator('html')).toHaveAttribute('data-presentation-active', 'wood');
        await page.evaluate(() => {
            window.scrollTo(0, 0);
            document.querySelectorAll<HTMLElement>('.book-content, .book-router-frame, .chapter-editor')
                .forEach(element => element.scrollTop = 0);
        });
        await expect(page).toHaveScreenshot('chapter-editor.webp', {
            fullPage: true,
            animations: 'disabled',
            maxDiffPixels: 100
        });
    });

    test('El alta Mobile de capítulo y sus selectores narrativos usan la composición compacta', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/book/73/chapter');
        await expect(page.locator('.dragon-loader')).toBeHidden();
        await expect(page.locator('html')).toHaveAttribute('data-presentation-active', 'mobile');
        await expect(page.locator('.m-chapter')).toHaveClass(/is-create-mode/);
        await expect(page.locator('.m-chapter .m-card')).toHaveCount(0);
        await expect(page.locator('.m-chapter__heading h1')).toHaveCount(0);
        await expect(page.getByLabel('Localización')).toHaveValue('Sin localización');
        await expect(page.locator('.m-chapter mat-form-field')).toHaveCount(0);

        const compactTool = await page.locator('.rtf-tool').first().boundingBox();
        expect(compactTool?.width).toBeCloseTo(28, 0);
        expect(compactTool?.height).toBeCloseTo(28, 0);

        const compactColorMenu = page.locator('.rtf-color-menu').first();
        await compactColorMenu.locator('summary').click();
        const compactColorPanel = compactColorMenu.locator('.rtf-color-menu__panel');
        await expect(compactColorPanel).toBeVisible();
        const compactColorBox = await compactColorPanel.boundingBox();
        expect(compactColorBox!.x).toBeGreaterThanOrEqual(0);
        expect(compactColorBox!.x + compactColorBox!.width).toBeLessThanOrEqual(390);
        await page.keyboard.press('Escape');

        await page.setViewportSize({ width: 718, height: 781 });
        const mediumGeometry = await page.evaluate(() => {
            const toolbar = document.querySelector<HTMLElement>('.rtf-toolbar')!.getBoundingClientRect();
            const editor = document.querySelector<HTMLElement>('.rtf-editor')!.getBoundingClientRect();
            return {
                toolbarWidth: toolbar.width,
                editorWidth: editor.width,
                rightGap: Math.abs(editor.right - toolbar.right),
                overflow: document.querySelector<HTMLElement>('.m-chapter')!.scrollWidth
                    - document.querySelector<HTMLElement>('.m-chapter')!.clientWidth
            };
        });
        expect(mediumGeometry.toolbarWidth).toBeLessThan(mediumGeometry.editorWidth);
        expect(mediumGeometry.rightGap).toBeLessThanOrEqual(1);
        expect(mediumGeometry.overflow).toBe(0);

        const fontTrigger = page.locator('.rtf-font-select').first();
        const originalMobileTheme = await page.locator('html').getAttribute('data-mobile-theme');
        const triggerThemeColors = await page.evaluate(() => {
            const root = document.documentElement;
            const values = [...document.querySelectorAll<HTMLElement>('.rtf-font-select .mat-mdc-select-min-line')].slice(0, 2);
            const probe = document.createElement('span');
            probe.style.color = 'var(--mobile-color-ink)';
            document.body.appendChild(probe);
            const read = (theme: 'light' | 'dark') => {
                root.dataset['mobileTheme'] = theme;
                return {
                    token: getComputedStyle(probe).color,
                    controls: values.map(value => getComputedStyle(value).color)
                };
            };
            const result = { light: read('light'), dark: read('dark') };
            probe.remove();
            return result;
        });
        expect(triggerThemeColors.light.controls).toEqual([
            triggerThemeColors.light.token,
            triggerThemeColors.light.token
        ]);
        expect(triggerThemeColors.dark.controls).toEqual([
            triggerThemeColors.dark.token,
            triggerThemeColors.dark.token
        ]);
        expect(triggerThemeColors.dark.token).not.toBe(triggerThemeColors.light.token);
        await page.evaluate(theme => {
            if (theme) document.documentElement.dataset['mobileTheme'] = theme;
            else delete document.documentElement.dataset['mobileTheme'];
        }, originalMobileTheme);
        await fontTrigger.click();
        const fontPanel = page.locator('.rtf-font-select-panel');
        await expect(fontPanel).toBeVisible();
        const [fontTriggerBox, fontPanelBox] = await Promise.all([fontTrigger.boundingBox(), fontPanel.boundingBox()]);
        expect(fontPanelBox!.width).toBeGreaterThan(fontTriggerBox!.width);
        expect(parseFloat(await fontPanel.evaluate(element => getComputedStyle(element).borderRadius))).toBeLessThanOrEqual(6);
        await page.keyboard.press('Escape');

        const sizeTrigger = page.locator('.rtf-size-select').first();
        await sizeTrigger.click();
        const sizePanel = page.locator('.rtf-size-select-panel');
        await expect(sizePanel).toBeVisible();
        expect(parseFloat(await sizePanel.evaluate(element => getComputedStyle(element).borderRadius))).toBeLessThanOrEqual(2);
        await page.keyboard.press('Escape');

        const colorMenu = page.locator('.rtf-color-menu').first();
        await colorMenu.locator('summary').click();
        const colorPanel = colorMenu.locator('.rtf-color-menu__panel');
        await expect(colorPanel).toBeVisible();
        await expect(colorPanel).toHaveCSS('position', 'fixed');

        const sceneLocation = page.getByLabel('Localización').first();
        await sceneLocation.click();
        await expect(page.getByRole('option', { name: 'Sin localización' })).toBeVisible();
        await page.keyboard.press('Escape');
        await page.getByPlaceholder('Añadir personaje presente').click();
        await expect(page.getByRole('option', { name: 'Iria Valverde' })).toBeVisible();
        await page.keyboard.press('Escape');
        await page.getByPlaceholder('Añadir personaje nombrado').click();
        await page.getByRole('option', { name: 'Iria Valverde' }).click();
        await expect(page.locator('.m-scene__chips').filter({ hasText: 'Iria Valverde' })).toBeVisible();

        const newSceneButton = page.getByRole('button', { name: 'Nueva escena' });
        await newSceneButton.click();
        await expect(page.locator('.m-scene')).toHaveCount(2);
        await expect.poll(async () => {
            const box = await page.locator('[data-scene-index="1"]').boundingBox();
            return box ? box.y < 781 && box.y + box.height > 0 : false;
        }).toBe(true);

        await page.locator('[data-scene-index="1"] input[formControlName="nombre"]').fill('');
        await newSceneButton.click();
        await expect(page.locator('.m-scene')).toHaveCount(2);
        const invalidSceneToast = page.locator('.app-toast--info').filter({ hasText: 'primero las escenas existentes deben ser válidas' });
        await expect(invalidSceneToast).toBeVisible();
        await expect(invalidSceneToast.locator('mat-icon').first()).toHaveText('help_outline');
        const toastUsesInfoColor = await invalidSceneToast.locator('mat-icon').first().evaluate(icon => {
            const probe = document.createElement('span');
            probe.style.color = 'var(--mobile-color-info)';
            document.body.append(probe);
            const matches = getComputedStyle(icon).color === getComputedStyle(probe).color;
            probe.remove();
            return matches;
        });
        expect(toastUsesInfoColor).toBe(true);

        await page.goto('/book/73/event');
        const defaultEventDescription = page.locator('.rtf-editor').first();
        await expect(defaultEventDescription).toHaveText('Descripción del evento');
        await defaultEventDescription.click();
        await expect.poll(() => page.evaluate(() => window.getSelection()?.toString()))
            .toBe('Descripción del evento');
        const locationAutocomplete = page.getByLabel('Localización');
        await locationAutocomplete.click();
        await expect(page.getByRole('option', { name: 'Sin localización' })).toBeVisible();
        await expect(locationAutocomplete.locator('xpath=ancestor::mat-form-field').locator('mat-icon[matSuffix]')).toBeVisible();
        await page.keyboard.press('Escape');

        const newEntryButton = page.getByRole('button', { name: 'Nueva entrada' });
        await newEntryButton.click();
        await expect(page.locator('[data-entry-index]')).toHaveCount(2);
        await expect.poll(async () => {
            const box = await page.locator('[data-entry-index="1"]').boundingBox();
            return box ? box.y < 781 && box.y + box.height > 0 : false;
        }).toBe(true);
        await page.locator('[data-entry-index="1"] input').first().fill('');
        await newEntryButton.click();
        await expect(page.locator('[data-entry-index]')).toHaveCount(2);
        await expect(page.locator('.app-toast--info').filter({ hasText: 'primero las entradas existentes deben ser válidas' })).toBeVisible();

        await page.goto('/book/73/quote');
        const characterAutocomplete = page.getByLabel('Personaje');
        await characterAutocomplete.click();
        await expect(page.getByRole('option', { name: 'Iria Valverde' })).toBeVisible();
    });

    test('El dashboard Android medium reserva la safe area solo para el contenido', async ({ page }) => {
        await page.setViewportSize({ width: 718, height: 781 });
        await page.goto('/dashboard/books');
        await expect(page.locator('.dragon-loader')).toBeHidden();
        await page.locator('html').evaluate(element => {
            element.setAttribute('data-presentation-active', 'native-mobile');
            (element as HTMLElement).style.setProperty('--app-safe-top', '33px');
        });

        const geometry = await page.evaluate(() => ({
            mainTop: document.querySelector<HTMLElement>('.library-main')!.getBoundingClientRect().top,
            contentTop: document.querySelector<HTMLElement>('app-user-router')!.getBoundingClientRect().top,
            railTop: document.querySelector<HTMLElement>('.m-navigation')!.getBoundingClientRect().top
        }));

        expect(geometry.mainTop).toBe(0);
        expect(geometry.contentTop).toBeCloseTo(33, 0);
        expect(geometry.railTop).toBe(0);
    });

    test('Las entidades narrativas conservan la superficie Wood', async ({ page }) => {
        await page.goto('/book/73/characters');
        await expect(page.getByRole('heading', { name: 'Personajes' })).toBeVisible();
        await expect(page.getByText('Iria Valverde', { exact: true })).toBeVisible();
        await expect(page.locator('.dragon-loader')).toBeHidden();
        await expect(page.locator('html')).toHaveAttribute('data-presentation-target', 'wood');
        await expect(page.locator('html')).toHaveAttribute('data-presentation-active', 'wood');
        await page.evaluate(() => {
            window.scrollTo(0, 0);
            document.querySelectorAll<HTMLElement>('.book-content, .book-router-frame, .narrative-entity-page')
                .forEach(element => element.scrollTop = 0);
        });
        await expect(page).toHaveScreenshot('narrative-characters.webp', { fullPage: true, animations: 'disabled' });
    });
});
