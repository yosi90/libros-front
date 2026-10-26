import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import { installLocalVisualSession } from './support/local-visual-session';
import { SDK_DOUBLE_TOKEN } from './support/yosiftware-sdk-double';

// Caso real (Siega, 20/10/2026): el alta de «Segador Goodall» se guardó en la API, la web no
// recibió la respuesta, la lista no lo mostró al volver y el segundo intento lo duplicó.

interface CharacterApiDouble {
    created: Array<{ Id: number; Nombre: string }>;
    createRequests: Array<Record<string, unknown>>;
    /** La cabecera `Authorization` de cada alta: la API de Libros se llama con el token de la plataforma. */
    createAuthorizations: string[];
}

/** API de personajes del libro 73 en memoria: crea de verdad aunque se pierda la respuesta. */
async function installCharacterApi(page: Page, options: { loseFirstCreateResponse: boolean }): Promise<CharacterApiDouble> {
    const server: CharacterApiDouble = { created: [], createRequests: [], createAuthorizations: [] };
    const byClientId = new Map<string, unknown>();
    const character = (id: number, name: string) => ({
        Id: id,
        Nombre: name,
        Sexo: 1,
        Entradas: [{ Id: id * 10, Nombre: 'Descripción', Descripcion: '{\\rtf1\\ansi Descripción del personaje}', Origen: 73 }],
        Apodos: [{ Id: id, ApodoId: id, Apodo: name, Origen: 73, Orden: null, Borrado: false }],
        Estados: [{ Id: 1, RelacionId: id, EstadoId: 1, Estado: 'Vivo', Origen: 73, Orden: null }],
        Relaciones: []
    });

    await page.route(url => url.pathname.endsWith('/libros/73/personajes/orden'), route => route.fulfill({
        json: [
            { Id: 21, Nombre: 'Iria Valverde', Grupo: 'Principales', OrdenGrupo: 0 },
            ...server.created.map(item => ({ Id: item.Id, Nombre: item.Nombre, Grupo: 'Secundarios', OrdenGrupo: 2 }))
        ]
    }));
    await page.route(url => /\/personajes\/\d+$/.test(url.pathname), route => {
        const id = Number(new URL(route.request().url()).pathname.split('/').pop());
        const found = server.created.find(item => item.Id === id);
        return found
            ? route.fulfill({ json: character(found.Id, found.Nombre) })
            : route.fulfill({ status: 404, json: { success: false, error: 'No hemos encontrado el personaje.', code: 'character_not_found' } });
    });
    await page.route(url => url.pathname.endsWith('/personajes'), async route => {
        if (route.request().method() !== 'POST')
            return route.fallback();
        const body = route.request().postDataJSON() as Record<string, unknown>;
        server.createRequests.push(body);
        server.createAuthorizations.push(route.request().headers()['authorization'] ?? '');
        const clientId = typeof body['IdCliente'] === 'string' ? body['IdCliente'] : null;
        const previous = clientId ? byClientId.get(clientId) : null;
        if (previous)
            return route.fulfill({ status: 200, json: previous });

        const created = character(1203 + server.created.length, String(body['Apodo']));
        server.created.push({ Id: created.Id, Nombre: created.Nombre });
        if (clientId)
            byClientId.set(clientId, created);
        if (options.loseFirstCreateResponse && server.createRequests.length === 1)
            return route.abort('failed');
        return route.fulfill({ status: 201, json: created });
    });
    return server;
}

/** La hoja de alta rápida (opción A del propietario, 26/10/2026): solo nombre, estado y sexo. */
function sheet(page: Page) {
    return page.getByRole('dialog', { name: 'Nuevo personaje' });
}

async function fillCharacterForm(page: Page, name: string): Promise<void> {
    await sheet(page).getByRole('textbox', { name: 'Nombre' }).fill(name);
    // En la hoja, el centro del select cae sobre su etiqueta, que pasa el clic al campo (como al tocarla).
    await sheet(page).getByRole('combobox', { name: 'Sexo / género' }).click({ force: true });
    await page.getByRole('option', { name: 'Chica' }).click();
}

test.describe('Alta de personajes en la web', () => {
    test.beforeEach(async ({ page, expectedConsoleErrors }) => {
        // La respuesta perdida del alta se simula abortando la petición.
        expectedConsoleErrors.push(/ERR_FAILED|personajes/i);
        await installLocalVisualSession(page, { webPresentation: true });
        await page.setViewportSize({ width: 1440, height: 900 });
    });

    test('un reintento tras perder la respuesta del alta no duplica el personaje y el loader termina', async ({ page }) => {
        const server = await installCharacterApi(page, { loseFirstCreateResponse: true });
        await page.goto('/book/73/character');
        await fillCharacterForm(page, 'Segador Goodall');

        const submit = sheet(page).getByRole('button', { name: 'Crear', exact: true });
        await submit.click();
        await expect(page.locator('.dragon-loader')).toBeHidden();
        await expect(submit).toBeEnabled();
        expect(server.created).toHaveLength(1);

        // La lista ya sabe que el alta se guardó: el reintento lo avisa y, si se insiste,
        // la API reconoce el mismo IdCliente y devuelve el personaje ya creado.
        let question = '';
        page.once('dialog', dialog => {
            question = dialog.message();
            void dialog.accept();
        });
        await submit.click();
        // «Crear» abre la ficha del personaje para completarlo.
        await expect(page).toHaveURL(/\/book\/73\/characters\?selected=1203$/);
        expect(question).toContain('Ya hay un personaje llamado «Segador Goodall»');
        await expect(page.getByRole('heading', { name: 'Modificar personaje' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Nombre' })).toHaveValue('Segador Goodall');
        expect(server.created).toHaveLength(1);
        expect(server.createRequests).toHaveLength(2);
        expect(server.createRequests[1]['IdCliente']).toBe(server.createRequests[0]['IdCliente']);
        expect(server.createAuthorizations).toEqual([`Bearer ${SDK_DOUBLE_TOKEN}`, `Bearer ${SDK_DOUBLE_TOKEN}`]);
    });

    test('al volver a la lista aparece el alta cuya respuesta se perdió y crear otro igual pide confirmación', async ({ page }) => {
        const server = await installCharacterApi(page, { loseFirstCreateResponse: true });
        await page.goto('/book/73/character');
        await fillCharacterForm(page, 'Segador Goodall');
        await sheet(page).getByRole('button', { name: 'Crear', exact: true }).click();
        await expect(page.locator('.dragon-loader')).toBeHidden();

        await sheet(page).getByRole('button', { name: 'Cerrar' }).click();
        await expect(page).toHaveURL(/\/book\/73\/characters$/);
        const list = page.locator('app-web-narrative-entity-view');
        await expect(list.getByText('Segador Goodall', { exact: true })).toHaveCount(1);

        await page.getByRole('button', { name: 'Crear personaje' }).click();
        await fillCharacterForm(page, 'Segador Goodall');
        let question = '';
        page.once('dialog', dialog => {
            question = dialog.message();
            void dialog.dismiss();
        });
        await sheet(page).getByRole('button', { name: 'Crear', exact: true }).click();

        await expect.poll(() => question).toContain('Ya hay un personaje llamado «Segador Goodall»');
        expect(server.createRequests).toHaveLength(1);
        expect(server.created).toHaveLength(1);
    });

    test('«Crear y otro» deja la hoja vacía y «Crear» abre la ficha del nuevo, con un solo botón de guardar', async ({ page }) => {
        const server = await installCharacterApi(page, { loseFirstCreateResponse: false });
        await page.goto('/book/73/characters');
        await page.getByRole('button', { name: 'Crear personaje' }).click();
        await expect(sheet(page)).toBeVisible();
        await expect(sheet(page).getByText('Después podrás añadir su descripción, sus apodos y sus relaciones en su ficha.')).toBeVisible();
        await expect(sheet(page).getByText('Entradas narrativas')).toHaveCount(0);
        await expect(sheet(page).getByRole('textbox', { name: 'Nombre' })).toBeFocused();

        await fillCharacterForm(page, 'Segador Mandela');
        await sheet(page).getByRole('button', { name: 'Crear y otro' }).click();
        await expect.poll(() => server.created.length).toBe(1);
        await expect(sheet(page).getByRole('textbox', { name: 'Nombre' })).toHaveValue('');
        await expect(sheet(page).getByRole('textbox', { name: 'Nombre' })).toBeFocused();
        await expect(page).toHaveURL(/\/book\/73\/character$/);

        await fillCharacterForm(page, 'Segador Goodall');
        await sheet(page).getByRole('button', { name: 'Crear', exact: true }).click();
        await expect(page).toHaveURL(/\/book\/73\/characters\?selected=1204$/);
        await expect(page.getByRole('heading', { name: 'Modificar personaje' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Nombre' })).toHaveValue('Segador Goodall');
        await expect(page.getByRole('button', { name: /Guardar/ })).toHaveCount(1);
        expect(server.created.map(item => item.Nombre)).toEqual(['Segador Mandela', 'Segador Goodall']);
        expect(server.createRequests.every(body => Array.isArray(body['Entradas']) && (body['Entradas'] as unknown[]).length === 1)).toBe(true);
    });
});
