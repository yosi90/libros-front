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

async function fillCharacterForm(page: Page, name: string): Promise<void> {
    await page.getByRole('textbox', { name: 'Nombre' }).first().fill(name);
    await page.getByRole('combobox', { name: 'Sexo / género' }).click();
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

        const submit = page.getByRole('button', { name: 'Crear personaje' });
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
        await expect(page).toHaveURL(/\/book\/73\/characters$/);
        expect(question).toContain('Ya hay un personaje llamado «Segador Goodall»');
        const list = page.locator('app-web-narrative-entity-view');
        await expect(list.getByText('Segador Goodall', { exact: true })).toHaveCount(1);
        expect(server.created).toHaveLength(1);
        expect(server.createRequests).toHaveLength(2);
        expect(server.createRequests[1]['IdCliente']).toBe(server.createRequests[0]['IdCliente']);
        expect(server.createAuthorizations).toEqual([`Bearer ${SDK_DOUBLE_TOKEN}`, `Bearer ${SDK_DOUBLE_TOKEN}`]);
    });

    test('al volver a la lista aparece el alta cuya respuesta se perdió y crear otro igual pide confirmación', async ({ page }) => {
        const server = await installCharacterApi(page, { loseFirstCreateResponse: true });
        await page.goto('/book/73/character');
        await fillCharacterForm(page, 'Segador Goodall');
        await page.getByRole('button', { name: 'Crear personaje' }).click();
        await expect(page.locator('.dragon-loader')).toBeHidden();

        await page.locator('.entity__head .web-button--ghost').click();
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
        await page.getByRole('button', { name: 'Crear personaje' }).click();

        await expect.poll(() => question).toContain('Ya hay un personaje llamado «Segador Goodall»');
        expect(server.createRequests).toHaveLength(1);
        expect(server.created).toHaveLength(1);
    });
});
