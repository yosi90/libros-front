import { expect, test } from './fixtures/test';
import { installLocalVisualSession } from './support/local-visual-session';

const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
const state = (id: number, name: string) => [{ EstadoId: id, Nombre: name, Fecha: '2026-07-12T10:00:00' }];
let seq = 100;
const book = (name: string, status: [number, string], order = 1) => ({
    Id: seq++, Nombre: name, Autores: [{ Id: 1, Nombre: 'Autor' }], Estados: state(...status), Orden: order, Portada: 'missing.png', PorcentajeCompletado: 10
});
const filler = Array.from({ length: 14 }, (_, index) => ({ Id: 40 + index, Nombre: 'Saga ' + (index + 1), Autores: [], Libros: [book('Libro ' + index, [0, 'En espera'])], Antologias: [] }));
const universes = [
    { Id: 1, Nombre: 'Sin universo', Autores: [], Libros: [], Antologias: [], Sagas: [
        { Id: 12, Nombre: 'El arco de la guadaña', Autores: [], Libros: [book('Siega', [1, 'En marcha']), book('Nimbo', [3, 'Por comprar'], 2)], Antologias: [] },
        ...filler
    ] },
    { Id: 2, Nombre: 'El cosmere', Autores: [{ Id: 2, Nombre: 'Brandon Sanderson' }], Libros: Array.from({ length: 30 }, (_, index) => book('Cosmere ' + index, [2, 'Leído'], index)), Antologias: [], Sagas: [] }
];

// Regresión del 25/9: al hacer scroll, la Biblioteca reaplicaba la expansión automática
// del libro en marcha y deshacía lo que el usuario había abierto o cerrado.
test('Wood conserva la expansión manual al hacer scroll', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'El gesto de rueda se valida en Chromium.');
    await installLocalVisualSession(page);
    await page.route('**/coleccion/universos', r => r.fulfill(json(universes)));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard/books'); await page.waitForTimeout(2500);
    const panel = (name: string) => page.locator(`mat-expansion-panel:has(> mat-expansion-panel-header:has-text("${name}"))`).last();

    await expect(panel('El arco de la guadaña')).toHaveClass(/mat-expanded/);
    await panel('El arco de la guadaña').locator('> mat-expansion-panel-header').click();
    await panel('Sin universo').locator('> mat-expansion-panel-header').click();
    await panel('El cosmere').locator('> mat-expansion-panel-header').click();
    await page.waitForTimeout(500);

    for (let step = 0; step < 6; step++) {
        await page.mouse.move(900, 600);
        await page.mouse.wheel(0, step % 2 ? -200 : 500);
        await page.waitForTimeout(200);
    }
    await page.waitForTimeout(600);
    // Sin contenido desplazable no se reproduce el fallo original.
    expect(await page.locator('app-books').evaluate(element => element.scrollTop)).toBeGreaterThan(0);

    await expect(panel('Sin universo')).not.toHaveClass(/mat-expanded/);
    await expect(panel('El cosmere')).toHaveClass(/mat-expanded/);
});
