import { expect, test } from './fixtures/test';

import { installLocalVisualSession, visualBook } from './support/local-visual-session';

test.describe('Regresiones Mobile de campaña QA @visual', () => {
    test.beforeEach(async ({ page }) => installLocalVisualSession(page));

    for (const width of [390, 800]) test('plegado manual ' + width, async ({ page }) => {
        await page.route('**/coleccion/universos', route => route.fulfill({ json: [{
            Id: 1, Nombre: 'Sin universo', Autores: [], Libros: [], Antologias: [],
            Sagas: [{Id: 21, Nombre: 'Saga QA', Libros: Array.from({length: 8}, (_, index) => ({...visualBook, Id: 73 + index, Estados: [{Nombre: 'Pendiente'}]})), Antologias: []}]
        }, {Id: 30, Nombre: 'Universo activo', Autores: [], Libros: [visualBook], Sagas: [], Antologias: []}] }));
        await page.setViewportSize({width, height: width === 390 ? 844 : 900});
        await page.goto('/dashboard/books');
        await expect(page.locator('.dragon-loader')).toBeHidden();
        await page.waitForFunction(() => Array.from(document.images).every(image => image.complete));
        await page.getByRole('button', {name: 'Filtros', exact: true}).click();
        await page.getByRole('button', {name: 'Universos', exact: true}).click();
        const toggle = page.locator('.m-library__universe > .m-library__section-toggle').first();
        if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
        await expect(page.locator('.m-library__universe-content').first()).toBeVisible();
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });

    test('el panel medium respeta la app bar web y el lienzo Android', async ({ page }, testInfo) => {
        await page.setViewportSize({width: 800, height: 900});
        await page.goto('/dashboard/books');
        await page.locator('.m-navigation').getByRole('button', {name: 'Abrir notificaciones', exact: true}).click();
        const panel = page.locator('.m-notifications');
        await expect(panel).toBeVisible();
        await expect.poll(async () => (await panel.boundingBox())!.y).toBeGreaterThanOrEqual((await page.locator('.m-appbar').boundingBox())!.height);
        await panel.evaluate(async element => { await Promise.all(element.getAnimations().map(animation => animation.finished)); });
        await page.screenshot({path: testInfo.outputPath('medium-notifications.png')});
        await page.evaluate(() => document.documentElement.setAttribute('data-presentation-active', 'native-mobile'));
        await expect.poll(async () => (await panel.boundingBox())!.y).toBe(16);
    });

    test('el fondo router del artefacto se decodifica completo', async ({ page }) => {
        await page.goto('/home');
        const size = await page.evaluate(async () => {
            const image = new Image();
            image.src = '/assets/media/img/fondo_router.png';
            await image.decode();
            return {width: image.naturalWidth, height: image.naturalHeight};
        });
        expect(size.width).toBeGreaterThan(0);
        expect(size.height).toBeGreaterThan(0);
    });
});
