import { expect, test } from './fixtures/test';
import { installLocalVisualSession, visualBook } from './support/local-visual-session';

for (const webPresentation of [false, true]) {
    test(`chips de escena en columnas con nombres largos (${webPresentation ? 'Web' : 'Mobile'})`, async ({ page }) => {
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
            const chips = list.locator(webPresentation ? '.chip:not(.chip--add)' : ':scope > div');
            await expect(chips).toHaveCount(3);
            const geometry = await list.evaluate((listElement, web) => {
                const chips = [...listElement.querySelectorAll<HTMLElement>(web ? '.chip:not(.chip--add)' : ':scope > div')];
                return {
                    available: listElement.getBoundingClientRect().width,
                    items: chips.map(chip => {
                        const box = chip.getBoundingClientRect();
                        const label = chip.querySelector('span')!;
                        const icons = [...chip.querySelectorAll('mat-icon')].map(icon => icon.getBoundingClientRect());
                        return { width: box.width, top: box.top, textWidth: label.clientWidth, textScroll: label.scrollWidth,
                            ellipsis: getComputedStyle(label).textOverflow, rightInset: box.right - icons[1].right,
                            iconGap: icons[1].left - icons[0].right };
                    })
                };
            }, webPresentation);
            expect(geometry.items[0].top).toBeCloseTo(geometry.items[1].top, 0);
            expect(geometry.items[0].width).toBeCloseTo(geometry.items[1].width, 0);
            expect(geometry.items[2].width).toBeCloseTo(geometry.available, 0);
            expect(geometry.items[2].textScroll).toBeGreaterThan(geometry.items[2].textWidth);
            expect(geometry.items[2].ellipsis).toBe('ellipsis');
            expect(geometry.items[0].rightInset).toBeLessThanOrEqual(10);
            expect(geometry.items[0].iconGap).toBeGreaterThanOrEqual(10);
            await list.screenshot({ path: `test-results/scene-chips-${webPresentation ? 'web' : 'mobile'}-${width}-${test.info().project.name}.png` });
        }
    });
}
