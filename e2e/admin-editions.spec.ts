import { expect, test } from './fixtures/test';
import { installLocalVisualSession, visualBook } from './support/local-visual-session';

const firstEdition = { Id: 312, ISBN: '9780306406157', Portada: 'first.png', FechaPublicacion: '2026-01-01', EnMiBiblioteca: false };
const olderEdition = { Id: 201, ISBN: '9788445016763', Portada: 'older.png', FechaPublicacion: '2024-01-01', EnMiBiblioteca: false };
const listBook = {
    Tipo: 'libro', Id: 73, Nombre: visualBook.Nombre, Portada: firstEdition.Portada,
    ISBN: firstEdition.ISBN, FechaPublicacion: firstEdition.FechaPublicacion,
    Autores: visualBook.Autores, Estados: [], Ediciones: [firstEdition, olderEdition]
};

for (const mode of [
    { name: 'Web', web: true },
    { name: 'Wood', web: false }
]) {
    test(`administra ediciones por ID en ${mode.name}`, async ({ page, expectedHandledHttpErrors, expectedConsoleErrors }, testInfo) => {
        expectedConsoleErrors.push(/status (?:of )?409.*\/catalogo\/admin\/ediciones\/201/i);
        await installLocalVisualSession(page, { webPresentation: mode.web, admin: true });
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.route('**/catalogo/**', route => route.fulfill({ status: 200, json: [] }));
        await page.route('**/catalogo/autores?*', route => route.fulfill({ status: 200, json: {
            Items: visualBook.Autores, Page: 1, PageSize: 100, Total: 1, HasMore: false
        } }));
        await page.route('**/catalogo/universos*', route => route.fulfill({ status: 200, json: [{ Id: 61, Nombre: 'Archipiélago de tinta' }] }));
        await page.route('**/catalogo/libros?*', route => route.fulfill({ status: 200, json: {
            Items: [listBook], Page: 1, PageSize: 10, Total: 1, HasMore: false
        } }));
        let editionIsbn = olderEdition.ISBN;
        await page.route('**/catalogo/libros/73/ediciones', route => route.fulfill({ status: 200, json: {
            Tipo: 'libro', ObraId: 73, Ediciones: [firstEdition, { ...olderEdition, ISBN: editionIsbn }]
        } }));
        let editionPatch: unknown = null;
        let rejectEdition = false;
        let editionImageRequest = '';
        await page.route('**/catalogo/admin/ediciones/201', route => {
            if (rejectEdition) {
                expectedHandledHttpErrors.push({
                    method: 'PATCH', url: route.request().url(), status: 409, code: 'edition_isbn_conflict',
                    recovery: [{ method: 'PATCH', status: 200 }]
                });
                return route.fulfill({ status: 409, json: {
                    success: false, code: 'edition_isbn_conflict', field: 'ISBN', error: 'El ISBN ya pertenece a otra edición.'
                } });
            }
            if (route.request().headers()['content-type']?.includes('multipart/form-data')) {
                editionImageRequest = route.request().postDataBuffer()?.toString('utf8') ?? '';
            } else {
                editionPatch = route.request().postDataJSON();
            }
            editionIsbn = '9780804429573';
            return route.fulfill({ status: 200, json: { Id: 201, ISBN: editionIsbn, Portada: olderEdition.Portada } });
        });
        let editionCreate: unknown = null;
        await page.route('**/catalogo/admin/libros/73/ediciones', route => {
            editionCreate = route.request().postDataJSON();
            return route.fulfill({ status: 201, json: { Id: 401, ISBN: '9780306406157' } });
        });
        let workPatch: Record<string, unknown> | null = null;
        let workCreate: Record<string, unknown> | null = null;
        await page.route('**/catalogo/admin/libros', route => {
            workCreate = route.request().postDataJSON();
            return route.fulfill({ status: 201, json: { Id: 73, TipoEntidad: 'libro' } });
        });
        await page.route('**/catalogo/admin/libros/73', route => {
            workPatch = route.request().postDataJSON();
            return route.fulfill({ status: 200, json: { Id: 73, TipoEntidad: 'libro' } });
        });

        await page.goto('/dashboard/adminpanel?section=books');
        await page.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Obra nueva');
        await page.getByRole('textbox', { name: 'ISBN de la primera edición' }).fill('9780306406157');
        await page.getByRole('textbox', { name: 'Publicación de la primera edición' }).fill('2016');
        await page.getByRole('combobox', { name: 'Autores', exact: true }).click();
        await page.getByRole('option', { name: visualBook.Autores[0].Nombre, exact: true }).click();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('option', { name: visualBook.Autores[0].Nombre, exact: true })).toBeHidden();
        await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeEnabled();
        await page.screenshot({ path: testInfo.outputPath('alta-primera-edicion.png') });
        await page.getByRole('button', { name: 'Guardar', exact: true }).click();
        await expect.poll(() => workCreate).toMatchObject({ Nombre: 'Obra nueva', ISBN: '9780306406157', FechaPublicacion: '2016' });
        await expect(page.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveValue('');
        await page.getByRole('button', { name: `Editar ${visualBook.Nombre}` }).click();
        const editions = page.getByRole('region', { name: 'Ediciones de la obra' });
        await expect(editions).toBeVisible();
        await editions.getByRole('button', { name: /9788445016763/ }).click();
        await editions.getByRole('textbox', { name: /ISBN/ }).fill('9780804429573');
        await page.screenshot({ path: testInfo.outputPath('editor-ediciones.png') });
        await editions.getByRole('button', { name: 'Guardar edición' }).click();
        await expect.poll(() => editionPatch).toEqual({ ISBN: '9780804429573', FechaPublicacion: '2024-01-01' });

        await editions.getByRole('button', { name: 'Nueva edición' }).click();
        await editions.getByRole('textbox', { name: /ISBN/ }).fill('9780306406157');
        await editions.getByRole('button', { name: 'Crear edición' }).click();
        await expect.poll(() => editionCreate).toEqual({ ISBN: '9780306406157' });

        await editions.getByRole('button', { name: /9780804429573/ }).click();
        rejectEdition = true;
        await editions.getByRole('button', { name: 'Guardar edición' }).click();
        await expect(editions.getByText('El ISBN ya pertenece a otra edición.', { exact: true })).toBeVisible();
        await editions.getByRole('textbox', { name: /ISBN/ }).fill('0-306-40615-2');
        rejectEdition = false;
        await editions.locator('input[type=file]').setInputFiles('src/assets/icons/app-icon-192.png');
        await editions.getByRole('button', { name: 'Guardar edición' }).click();
        await expect.poll(() => editionImageRequest).toContain('name="payload"');
        expect(editionImageRequest).toContain('"ISBN":"0-306-40615-2"');
        expect(editionImageRequest).toContain('name="image"; filename="app-icon-192.png"');

        await page.getByRole('button', { name: 'Guardar', exact: true }).click();
        await expect.poll(() => workPatch).not.toBeNull();
        expect(workPatch).not.toHaveProperty('ISBN');
        expect(workPatch).not.toHaveProperty('FechaPublicacion');
    });
}

test('vincula explícitamente una edición de otra obra por su ID', async ({ page }, testInfo) => {
    await installLocalVisualSession(page, { webPresentation: true, admin: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.route('**/catalogo/**', route => route.fulfill({ status: 200, json: [] }));
    await page.route('**/catalogo/autores?*', route => route.fulfill({ status: 200, json: {
        Items: visualBook.Autores, Page: 1, PageSize: 100, Total: 1, HasMore: false
    } }));
    await page.route('**/catalogo/universos*', route => route.fulfill({ status: 200, json: [{ Id: 61, Nombre: 'Archipiélago de tinta' }] }));
    await page.route('**/catalogo/libros?*', route => route.fulfill({ status: 200, json: {
        Items: [listBook], Page: 1, PageSize: 10, Total: 1, HasMore: false
    } }));
    await page.route('**/catalogo/libros/73/ediciones', route => route.fulfill({ status: 200, json: {
        Tipo: 'libro', ObraId: 73, Ediciones: [firstEdition, olderEdition]
    } }));
    const sourceEdition = { Id: 500, ISBN: '9788400000001', Portada: 'shared.png', FechaPublicacion: '2025-01-01', EnMiBiblioteca: false };
    await page.route('**/catalogo/antologias?*', route => route.fulfill({ status: 200, json: [{
        Tipo: 'antologia', Id: 91, Nombre: 'Ómnibus del norte', Autores: visualBook.Autores,
        ISBN: sourceEdition.ISBN, Portada: sourceEdition.Portada, FechaPublicacion: sourceEdition.FechaPublicacion
    }] }));
    await page.route('**/catalogo/antologias/91/ediciones', route => route.fulfill({ status: 200, json: {
        Tipo: 'antologia', ObraId: 91, Ediciones: [sourceEdition]
    } }));
    let linkPayload: unknown = null;
    await page.route('**/catalogo/admin/libros/73/ediciones', route => {
        linkPayload = route.request().postDataJSON();
        return route.fulfill({ status: 200, json: { Id: 500, ISBN: sourceEdition.ISBN } });
    });

    await page.goto('/dashboard/adminpanel?section=books');
    await page.getByRole('button', { name: `Editar ${visualBook.Nombre}` }).click();
    const link = page.getByRole('region', { name: 'Vincular edición existente' });
    await link.getByRole('textbox', { name: 'Nombre de la otra obra' }).fill('Ómnibus');
    await link.getByRole('button', { name: 'Buscar obra' }).click();
    await link.getByRole('button', { name: /Ómnibus del norte/ }).click();
    await link.getByRole('button', { name: /9788400000001/ }).click();
    await link.getByRole('button', { name: 'Revisar vínculo' }).click();
    await expect(link.getByRole('status')).toContainText('Ómnibus del norte');
    await link.screenshot({ path: testInfo.outputPath('vinculo-edicion.png') });
    expect(linkPayload).toBeNull();
    await link.getByRole('button', { name: 'Confirmar vínculo' }).click();
    await expect.poll(() => linkPayload).toEqual({ VincularEdicionId: 500 });
});
