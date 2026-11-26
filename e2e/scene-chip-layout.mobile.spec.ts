import { expect, test } from './fixtures/test';
import { installLocalVisualSession, visualBook } from './support/local-visual-session';

for (const webPresentation of [false]) {
    // Capítulo compacto (opción A, 26/10/2026): fichas estrechas en una sola fila, sin ancho mínimo.
    test(`chips de escena en una fila con nombres largos (${webPresentation ? 'Web' : 'Mobile'})`, async ({ page }) => {
        await installLocalVisualSession(page, { webPresentation });
        const names = ['Ana', 'Luis', 'Un nombre de personaje extraordinariamente largo que supera todo el ancho disponible incluso en pantallas amplias y continúa con varios apellidos adicionales'];
        const characters = names.map((Nombre, index) => ({ ...visualBook.Personajes[0], Id: 21 + index, Nombre }));
        const assignments = characters.map(({ Id }) => ({ Id, Nombrado: false }));
        await page.route('**/libros/73', route => route.fulfill({
            json: {
                ...visualBook,
                Personajes: characters,
                Capitulos: visualBook.Capitulos.map(chapter => chapter.Id === 11 ? {
                    ...chapter,
                    Escenas: [{ ...visualBook.Capitulos[0].Escenas[0], Personajes: assignments, PersonajesDetalle: assignments }]
                } : chapter)
            }
        }));
        for (const width of [320, 390, 718]) {
            await page.setViewportSize({ width, height: 900 });
            await page.goto('/book/73/chapter/11');
            const list = page.locator(webPresentation ? '.chips' : '.m-scene__chips').first();
            const chips = list.locator(webPresentation ? '.chip' : ':scope > div');
            await expect(chips).toHaveCount(3);
            const geometry = await list.evaluate((listElement, web) => {
                const chips = [...listElement.querySelectorAll<HTMLElement>(web ? '.chip' : ':scope > div')];
                return {
                    available: listElement.getBoundingClientRect().width,
                    items: chips.map(chip => {
                        const box = chip.getBoundingClientRect();
                        const label = chip.querySelector('span')!;
                        // En Web (escenas plegadas, 6/11/2026) la ficha es solo el nombre: tocarla abre su menú.
                        const icons = [...chip.querySelectorAll('mat-icon')].map(icon => icon.getBoundingClientRect());
                        return { width: box.width, top: box.top, textWidth: label.clientWidth, textScroll: label.scrollWidth,
                            ellipsis: getComputedStyle(label).textOverflow, rightInset: icons[1] ? box.right - icons[1].right : 0,
                            iconGap: icons[1] ? icons[1].left - icons[0].right : 10 };
                    })
                };
            }, webPresentation);
            expect(geometry.items[0].top).toBeCloseTo(geometry.items[1].top, 0);
            expect(geometry.items[0].width).toBeLessThan(geometry.available / 2);
            expect(geometry.items[1].width).toBeLessThan(geometry.available / 2);
            expect(geometry.items[2].width).toBeCloseTo(geometry.available, 0);
            expect(geometry.items[2].textScroll).toBeGreaterThan(geometry.items[2].textWidth);
            expect(geometry.items[2].ellipsis).toBe('ellipsis');
            expect(geometry.items[0].rightInset).toBeLessThanOrEqual(10);
            expect(geometry.items[0].iconGap).toBeGreaterThanOrEqual(10);
            await list.screenshot({ path: `test-results/scene-chips-${webPresentation ? 'web' : 'mobile'}-${width}-${test.info().project.name}.png` });
        }
    });
}

// Web («Cuaderno», F2): el reparto es una apostilla. En el móvil va en una fila bajo el texto; con más ancho, en la
// columna del margen. Un nombre larguísimo se corta con «…» y nunca se sale.
test('reparto de la escena con nombres largos (Web)', async ({ page }) => {
    await installLocalVisualSession(page, { webPresentation: true });
    const names = ['Ana', 'Luis', 'Un nombre de personaje extraordinariamente largo que supera todo el ancho disponible incluso en pantallas amplias y continúa con varios apellidos adicionales'];
    const characters = names.map((Nombre, index) => ({ ...visualBook.Personajes[0], Id: 21 + index, Nombre }));
    const assignments = characters.map(({ Id }) => ({ Id, Nombrado: false }));
    await page.route('**/libros/73', route => route.fulfill({
        json: {
            ...visualBook,
            Personajes: characters,
            Capitulos: visualBook.Capitulos.map(chapter => chapter.Id === 11 ? {
                ...chapter,
                Escenas: [{ ...visualBook.Capitulos[0].Escenas[0], Personajes: assignments, PersonajesDetalle: assignments }]
            } : chapter)
        }
    }));
    for (const width of [320, 390, 718]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/book/73/chapter/11');
        const list = page.locator('.cast-list').first();
        await expect(list.locator('.cast-list__item')).toHaveCount(3);
        const geometry = await list.evaluate(listElement => {
            const margin = listElement.closest('.scene__margin')!.getBoundingClientRect();
            return {
                row: getComputedStyle(listElement).flexDirection === 'row',
                margin: { left: margin.left, right: margin.right },
                items: [...listElement.querySelectorAll<HTMLElement>('.cast-list__item')].map(item => {
                    const box = item.getBoundingClientRect();
                    return { left: box.left, right: box.right, top: box.top, width: box.width, scroll: item.scrollWidth, client: item.clientWidth,
                        ellipsis: getComputedStyle(item).textOverflow };
                })
            };
        });
        for (const item of geometry.items) {
            expect(item.left).toBeGreaterThanOrEqual(geometry.margin.left - 1);
            expect(item.right).toBeLessThanOrEqual(geometry.margin.right + 1);
        }
        if (geometry.row)
            expect(geometry.items[0].top).toBeCloseTo(geometry.items[1].top, 0);
        expect(geometry.items[0].width).toBeLessThan((geometry.margin.right - geometry.margin.left) / 2);
        expect(geometry.items[2].scroll).toBeGreaterThan(geometry.items[2].client);
        expect(geometry.items[2].ellipsis).toBe('ellipsis');
        await list.screenshot({ path: `test-results/scene-cast-web-${width}-${test.info().project.name}.png` });
    }
});
