import { expect, test } from './fixtures/test';
import { installLocalVisualSession } from './support/local-visual-session';

const firstEdition = { Id: 312, ISBN: '9780306406157', Portada: 'first.png', FechaPublicacion: '2026-01-01', EnMiBiblioteca: false };
const ownedEdition = { Id: 201, ISBN: '9788445016763', Portada: 'owned.png', FechaPublicacion: '2024-01-01', EnMiBiblioteca: true };
const book = {
    Tipo: 'libro', Id: 73, Nombre: 'El atlas de las historias', Portada: firstEdition.Portada,
    ISBN: firstEdition.ISBN, FechaPublicacion: firstEdition.FechaPublicacion,
    Autores: [{ Id: 8, Nombre: 'Ada Lectora' }], Estados: [], Ediciones: [firstEdition, ownedEdition]
};

for (const mode of [
    { name: 'Web claro', web: true, width: 1440, height: 900, light: true },
    { name: 'Web escritorio', web: true, width: 1440, height: 900 },
    { name: 'Web compacta', web: true, width: 390, height: 844 },
    { name: 'Wood', web: false, width: 1440, height: 900 },
    { name: 'Mobile', web: false, width: 390, height: 844 }
]) {
    test(`ediciones y posesión en ${mode.name}`, async ({ page }, testInfo) => {
        await installLocalVisualSession(page, { webPresentation: mode.web });
        if ('light' in mode && mode.light) {
            await page.addInitScript(() => {
                localStorage.setItem('libros:web-theme:last', 'light');
                localStorage.setItem('libros:web-theme:37', 'light');
            });
        }
        await page.setViewportSize({ width: mode.width, height: mode.height });
        await page.route('**/catalogo/**', route => route.fulfill({ status: 200, json: [] }));
        await page.route('**/catalogo/libros/73/detalle-publico', route => route.fulfill({ status: 200, json: {
            ...book, MiColeccion: { EnBiblioteca: true, EdicionesIds: [201], Estados: [] },
            Estadisticas: { UsuariosEnBiblioteca: 1, PuntuacionMedia: null, TotalPuntuaciones: 0,
                TotalLeidos: 0, TotalEnMarcha: 0, DistribucionEstados: [] }
        } }));
        await page.route('**/catalogo/libros/73/ediciones', route => route.fulfill({ status: 200, json: {
            Tipo: 'libro', ObraId: 73, Ediciones: [firstEdition, ownedEdition]
        } }));
        let submitted: number[] | null = null;
        await page.route('**/coleccion/libros/73/ediciones', async route => {
            submitted = route.request().postDataJSON().EdicionesIds;
            await route.fulfill({ status: 200, json: { Tipo: 'libro', ObraId: 73, Ediciones: [
                firstEdition, { ...ownedEdition, EnMiBiblioteca: false }
            ] } });
        });
        await page.route('**/catalogo/libros*', route => route.fulfill({ status: 200, json: [book] }));
        await page.goto('/dashboard/catalog');
        await page.locator('.catalog-card, .m-catalog-card').first().click();

        const editions = page.getByRole('region', { name: 'Ediciones de la obra' });
        await expect(editions).toBeVisible();
        const owned = editions.getByRole('button', { name: /9788445016763/ });
        await expect(owned).toHaveAttribute('aria-pressed', 'true');
        await expect(editions.getByRole('button', { name: 'Retirar esta edición' })).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath('ediciones.png') });

        await editions.getByRole('button', { name: 'Retirar esta edición' }).click();
        await expect.poll(() => submitted).toEqual([]);
        await expect(editions.getByRole('button', { name: 'Tengo esta edición' })).toBeVisible();
    });
}

for (const mode of [
    { name: 'Web', web: true, width: 1440, height: 900 },
    { name: 'Wood', web: false, width: 1440, height: 900 }
]) {
    test(`ediciones desde Perfil ${mode.name}`, async ({ page }, testInfo) => {
        await installLocalVisualSession(page, { webPresentation: mode.web });
        await page.setViewportSize({ width: mode.width, height: mode.height });
        await page.route('**/catalogo/**', route => route.fulfill({ status: 200, json: [] }));
        await page.route('**/coleccion/universos', route => route.fulfill({ status: 200, json: [{
            Id: 61, Nombre: 'Universo de prueba', Autores: [], Sagas: [], Antologias: [],
            Libros: [{ ...book, Estados: [{ Id: 1, EstadoId: 1, Nombre: 'En marcha', Fecha: '2026-08-20' }] }]
        }] }));
        await page.route('**/catalogo/libros/73/detalle-publico', route => route.fulfill({ status: 200, json: {
            ...book, MiColeccion: { EnBiblioteca: true, EdicionesIds: [201], Estados: [], Resena: 'Mi reseña' },
            Estadisticas: { UsuariosEnBiblioteca: 1, PuntuacionMedia: null, TotalPuntuaciones: 0,
                TotalLeidos: 0, TotalEnMarcha: 0, DistribucionEstados: [] }
        } }));
        await page.goto('/dashboard/profile?section=books');
        await page.getByText('El atlas de las historias').first().click();

        const editions = page.getByRole('region', { name: 'Ediciones de la obra' });
        await expect(editions).toBeVisible();
        await expect(editions.getByRole('button', { name: /9788445016763/ })).toHaveAttribute('aria-pressed', 'true');
        await expect(editions.getByRole('button', { name: 'Retirar esta edición' })).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath('perfil-ediciones.png') });
    });
}

for (const mode of [
    { name: 'Web escritorio', web: true, width: 1440, height: 900 },
    { name: 'Web compacta', web: true, width: 390, height: 844 },
    { name: 'Wood', web: false, width: 1440, height: 900 },
    { name: 'Mobile', web: false, width: 390, height: 844 }
]) {
    test(`ediciones desde Biblioteca y conservación de obra en ${mode.name}`, async ({ page }, testInfo) => {
        await installLocalVisualSession(page, { webPresentation: mode.web });
        await page.setViewportSize({ width: mode.width, height: mode.height });
        let ownedIds = [312, 201];
        let submitted: number[] | null = null;
        const editions = () => [firstEdition, ownedEdition].map(edition => ({ ...edition, EnMiBiblioteca: ownedIds.includes(edition.Id) }));
        const states = [{ Id: 1, EstadoId: 1, Nombre: 'En marcha', Fecha: '2026-08-20' }];
        await page.route('**/coleccion/universos', route => route.fulfill({ status: 200, json: [{
            Id: 61, Nombre: 'Universo de prueba', Autores: [], Sagas: [], Antologias: [],
            Libros: [
                { ...book, Estados: states, Resena: 'Mi reseña', Ediciones: editions() },
                { ...book, Id: 74, Nombre: 'Solo una edición', Estados: states, Ediciones: [firstEdition, ownedEdition] },
                { ...book, Id: 75, Nombre: 'Sin ejemplares', Estados: states, Ediciones: [firstEdition] }
            ]
        }] }));
        await page.route('**/catalogo/**', route => route.fulfill({ status: 200, json: [] }));
        await page.route('**/catalogo/libros/73/detalle-publico', route => route.fulfill({ status: 200, json: {
            ...book, Ediciones: editions(), MiColeccion: {
                EnBiblioteca: true, EdicionesIds: ownedIds, Estados: states, Resena: 'Mi reseña'
            }, Estadisticas: { UsuariosEnBiblioteca: 1, PuntuacionMedia: null, TotalPuntuaciones: 0,
                TotalLeidos: 0, TotalEnMarcha: 1, DistribucionEstados: [] }
        } }));
        await page.route('**/catalogo/libros/73/ediciones', route => route.fulfill({ status: 200, json: {
            Tipo: 'libro', ObraId: 73, Ediciones: editions()
        } }));
        await page.route('**/coleccion/libros/73/ediciones', route => {
            submitted = route.request().postDataJSON().EdicionesIds;
            ownedIds = submitted!;
            return route.fulfill({ status: 200, json: { Tipo: 'libro', ObraId: 73, Ediciones: editions() } });
        });
        await page.goto('/dashboard/books');
        const access = page.getByRole('button', { name: `Ver ediciones de ${book.Nombre}` });
        await expect(access).toBeVisible();
        await expect(page.getByRole('button', { name: 'Ver ediciones de Solo una edición' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Ver ediciones de Sin ejemplares' })).toHaveCount(0);
        await page.screenshot({ path: testInfo.outputPath('biblioteca-ediciones.png') });
        await access.focus();
        await access.press('Enter');
        await expect(page).toHaveURL(/\/dashboard\/catalog/);
        const panel = page.getByRole('region', { name: 'Ediciones de la obra' });
        await panel.getByRole('button', { name: /9788445016763/ }).click();
        await expect(panel.getByRole('button', { name: /9788445016763/ })).toHaveAttribute('aria-pressed', 'true');
        await panel.getByRole('button', { name: 'Retirar esta edición' }).click();
        await expect.poll(() => submitted).toEqual([312]);
        await panel.getByRole('button', { name: /9780306406157/ }).click();
        await panel.getByRole('button', { name: 'Retirar esta edición' }).click();
        await expect.poll(() => submitted).toEqual([]);
        await expect(panel.getByRole('button', { name: 'Tengo esta edición' })).toBeVisible();
        await page.getByRole('button', { name: mode.web ? 'Cerrar ficha' : mode.width < 600 ? 'Volver al catálogo' : 'Cerrar', exact: true }).last().click();
        await expect(page).toHaveURL(/\/dashboard\/books/);
        await expect(access).toHaveCount(0);
        await expect(page.getByText(/En marcha/).first()).toBeVisible();
        await expect(page.getByRole('heading', { name: book.Nombre, exact: true, level: 3 })).toBeVisible();
    });
}
