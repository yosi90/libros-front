import { randomInt } from 'node:crypto';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect, integrationTest as test } from './fixtures/integration';
import { credentialsFor, loginThroughApi, loginThroughUi, type QaRole } from './support/auth';
import { fixture, type QaFixturesResponse } from './support/qa-reset';
import type { QaEnvironment } from './support/qa-environment';
import type { Book } from '../src/app/interfaces/book';
import type { CatalogItem, CatalogOwnCollection, CatalogPublicDetail, CatalogRequest, CatalogRequestCreated, CatalogRequestResolved, EditionSaved, WorkEditions } from '../src/app/interfaces/catalog';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('contrato real de ediciones @integration @editions-contract', () => {
    test.describe.configure({ timeout: 120_000 });

    for (const theme of ['light', 'dark', 'wood'] as const) {
        test(`${theme} destaca la edicion poseida y retira solo el ejemplar`, async ({ page, request, qaEnvironment, qaScenario }) => {
            const fixtures = await qaScenario.apply('baseline');
            const { admin, member } = await authenticate(request, qaEnvironment, fixtures);
            const bookId = fixture(fixtures, 'catalog.book-primary').Id;
            const owned = await createEdition(request, qaEnvironment, admin, bookId, '2024-01-01');
            await createEdition(request, qaEnvironment, admin, bookId, '2026-01-01');
            const ownershipUrl = `${qaEnvironment.apiUrl}coleccion/libros/${bookId}/ediciones`;
            await json(await request.put(ownershipUrl, { headers: bearer(member), data: { EdicionesIds: [owned.Id] } }));
            const detailUrl = `${qaEnvironment.apiUrl}catalogo/libros/${bookId}/detalle-publico`;
            const before = await json<CatalogPublicDetail>(await request.get(detailUrl, { headers: bearer(member) }));
            expect(before.ISBN).not.toBe(owned.ISBN);
            const userId = fixture(fixtures, 'user.member-a').Id;
            await page.addInitScript(({ theme, userId }) => {
                localStorage.setItem('libros:web-theme:last', theme);
                localStorage.setItem(`libros:web-theme:${userId}`, theme);
                localStorage.setItem(`libros:theme-onboarded:${userId}`, '1');
            }, { theme, userId });
            await page.setViewportSize({ width: 1440, height: 900 });
            await loginThroughUi(page, credentialsFor('userA', fixtures)!);
            // Navegacion Angular: conservar la sesion en memoria tambien desde localhost.
            await page.getByRole('link', { name: /Catálogo/ }).first().click();
            await page.locator('.catalog-card').filter({ has: page.getByRole('heading', { name: before.Nombre, exact: true }) }).click();
            const region = page.getByRole('region', { name: 'Ediciones de la obra' });
            expect(owned.ISBN).toBeTruthy();
            await expect(region.getByRole('button', { name: new RegExp(owned.ISBN!) })).toHaveAttribute('aria-pressed', 'true');
            const save = page.waitForResponse(response => response.url() === ownershipUrl && response.request().method() === 'PUT');
            await region.getByRole('button', { name: 'Retirar esta edición' }).click();
            const response = await save;
            expect(response.status()).toBe(200);
            expect(response.request().postDataJSON()).toEqual({ EdicionesIds: [] });
            await expect(region.getByRole('button', { name: 'Tengo esta edición' })).toBeVisible();
            const after = await json<CatalogPublicDetail>(await request.get(detailUrl, { headers: bearer(member) }));
            expect(after.MiColeccion?.EdicionesIds).toEqual([]);
            expect(workHistory(after.MiColeccion!)).toEqual(workHistory(before.MiColeccion!));
            await page.getByRole('button', { name: theme === 'wood' ? 'Cerrar' : 'Cerrar ficha', exact: true }).last().click();
            await expect(region).toHaveCount(0);
        });
    }

    test('seleccion vacia e idempotencia conservan lectura y narrativa @editions-api', async ({ request, browserName, qaEnvironment, qaScenario }) => {
        // Son operaciones API; la UI se cubre por separado en ambos navegadores.
        test.skip(browserName !== 'chromium', 'No duplicar la misma transaccion API en Firefox.');
        const fixtures = await qaScenario.apply('baseline');
        const { admin, member } = await authenticate(request, qaEnvironment, fixtures);
        const bookId = fixture(fixtures, 'catalog.book-primary').Id;
        const catalogUrl = `${qaEnvironment.apiUrl}catalogo/libros/${bookId}`;
        const ownershipUrl = `${qaEnvironment.apiUrl}coleccion/libros/${bookId}/ediciones`;
        const editionA = await createEdition(request, qaEnvironment, admin, bookId, '2024-01-01');
        const editionB = await createEdition(request, qaEnvironment, admin, bookId, '2026-01-01');

        // Preparar posesion y una resena no vacia antes de comprobar su conservacion.
        await json(await request.put(ownershipUrl, { headers: bearer(member), data: { EdicionesIds: [editionA.Id] } }));
        await json(await request.patch(`${qaEnvironment.apiUrl}coleccion/libros/${bookId}/puntuacion`, {
            headers: bearer(member), data: { Puntuacion: 4, Resena: 'Reseña de QA para comprobar la conservación del historial.' }
        }));
        const detailBefore = await json<CatalogPublicDetail>(await request.get(`${catalogUrl}/detalle-publico`, { headers: bearer(member) }));
        if (!detailBefore.MiColeccion?.EnBiblioteca) {
            const collection = await json<Array<{ Id: number; Tipo: string }>>(await request.get(`${qaEnvironment.apiUrl}coleccion/items`, { headers: bearer(member) }));
            const editions = await json<WorkEditions>(await request.get(`${catalogUrl}/ediciones`, { headers: bearer(member) }));
            console.log(JSON.stringify({ Diagnostico: 'biblioteca-tras-posesion', ObraId: bookId,
                EnColeccion: collection.some(item => item.Id === bookId && item.Tipo === 'libro'),
                EdicionesPoseidas: ownedIds(editions), MiColeccion: detailBefore.MiColeccion }));
        }
        expect(detailBefore.MiColeccion?.EnBiblioteca, 'El alias principal debe tener historial de lectura').toBe(true);
        expect(detailBefore.MiColeccion!.Estados.length).toBeGreaterThan(0);
        expect(detailBefore.MiColeccion!.Puntuacion).toBe(4);
        expect(detailBefore.MiColeccion!.Resena).toBe('Reseña de QA para comprobar la conservación del historial.');
        const narrativeBefore = narrative(await json<Book>(await request.get(`${qaEnvironment.apiUrl}libros/${bookId}`, { headers: bearer(member) })));

        const selection = { EdicionesIds: [editionA.Id, editionB.Id] };
        const first = await json<WorkEditions>(await request.put(ownershipUrl, { headers: bearer(member), data: selection }));
        expect(ownedIds(first)).toEqual([...selection.EdicionesIds].sort((a, b) => a - b));
        const repeated = await json<WorkEditions>(await request.put(ownershipUrl, { headers: bearer(member), data: selection }));
        expect(repeated).toEqual(first);

        const removed = await json<WorkEditions>(await request.put(ownershipUrl, { headers: bearer(member), data: { EdicionesIds: [] } }));
        expect(ownedIds(removed)).toEqual([]);
        const detailAfter = await json<CatalogPublicDetail>(await request.get(`${catalogUrl}/detalle-publico`, { headers: bearer(member) }));
        expect(detailAfter.MiColeccion?.EdicionesIds).toEqual([]);
        expect(workHistory(detailAfter.MiColeccion!)).toEqual(workHistory(detailBefore.MiColeccion!));
        expect(narrative(await json<Book>(await request.get(`${qaEnvironment.apiUrl}libros/${bookId}`, { headers: bearer(member) })))).toEqual(narrativeBefore);
        expect(ownedIds(await json<WorkEditions>(await request.get(`${catalogUrl}/ediciones`, { headers: bearer(member) })))).toEqual([]);
    });

    test('una edicion compartida concilia libro y antologia sin borrar obras @editions-api', async ({ request, browserName, qaEnvironment, qaScenario }) => {
        test.skip(browserName !== 'chromium', 'No duplicar la misma transaccion API en Firefox.');
        const fixtures = await qaScenario.apply('baseline');
        const { admin, member } = await authenticate(request, qaEnvironment, fixtures);
        const bookId = fixture(fixtures, 'catalog.book-primary').Id;
        const anthologies = await json<CatalogItem[]>(await request.get(`${qaEnvironment.apiUrl}catalogo/antologias`, { headers: bearer(admin) }));
        expect(anthologies.length, 'La matriz QA debe incluir una antologia canonica').toBeGreaterThan(0);
        const anthologyId = anthologies[0].Id;
        const edition = await createEdition(request, qaEnvironment, admin, bookId, '2025-01-01');
        const linked = await json<EditionSaved>(await request.post(`${qaEnvironment.apiUrl}catalogo/admin/antologias/${anthologyId}/ediciones`, {
            headers: bearer(admin), data: { VincularEdicionId: edition.Id }
        }), 201);
        expect(linked.Id).toBe(edition.Id);

        const bookUrl = `${qaEnvironment.apiUrl}coleccion/libros/${bookId}/ediciones`;
        const anthologyUrl = `${qaEnvironment.apiUrl}coleccion/antologias/${anthologyId}/ediciones`;
        await json<WorkEditions>(await request.put(bookUrl, { headers: bearer(member), data: { EdicionesIds: [edition.Id] } }));
        const inherited = await json<WorkEditions>(await request.get(`${qaEnvironment.apiUrl}catalogo/antologias/${anthologyId}/ediciones`, { headers: bearer(member) }));
        expect(inherited.Ediciones.find(item => item.Id === edition.Id)?.EnMiBiblioteca).toBe(true);
        await json<WorkEditions>(await request.put(anthologyUrl, { headers: bearer(member), data: { EdicionesIds: [edition.Id] } }));

        // El conjunto vacio de la antologia retira tambien la posesion global del libro.
        await json<WorkEditions>(await request.put(anthologyUrl, { headers: bearer(member), data: { EdicionesIds: [] } }));
        const bookEditions = await json<WorkEditions>(await request.get(`${qaEnvironment.apiUrl}catalogo/libros/${bookId}/ediciones`, { headers: bearer(member) }));
        expect(bookEditions.Ediciones.find(item => item.Id === edition.Id)?.EnMiBiblioteca).toBe(false);
        for (const path of [`libros/${bookId}`, `antologias/${anthologyId}`]) {
            const detail = await json<CatalogPublicDetail>(await request.get(`${qaEnvironment.apiUrl}catalogo/${path}/detalle-publico`, { headers: bearer(member) }));
            expect(detail.MiColeccion?.EnBiblioteca).toBe(true);
            expect(detail.MiColeccion?.EdicionesIds).not.toContain(edition.Id);
        }
    });

    test('la aprobacion agrupada contra obra existente no asigna posesion @editions-api', async ({ request, browserName, qaEnvironment, qaScenario }) => {
        test.skip(browserName !== 'chromium', 'No duplicar la misma transaccion API en Firefox.');
        const fixtures = await qaScenario.apply('baseline');
        const memberA = await tokenForRole(request, qaEnvironment, fixtures, 'userA');
        const memberB = await tokenForRole(request, qaEnvironment, fixtures, 'userB');
        const moderator = await tokenForRole(request, qaEnvironment, fixtures, 'moderator');
        for (const token of [memberA, memberB, moderator]) {
            await json(await request.post(`${qaEnvironment.apiUrl}moderacion/politicas/creacion/aceptar`, { headers: bearer(token) }));
        }
        const bookId = fixture(fixtures, 'catalog.book-primary').Id;
        const detailUrl = `${qaEnvironment.apiUrl}catalogo/libros/${bookId}/detalle-publico`;
        const before = await Promise.all([memberA, memberB].map(async token => json<CatalogPublicDetail>(await request.get(detailUrl, { headers: bearer(token) }))));
        const requestsUrl = `${qaEnvironment.apiUrl}peticiones/catalogo`;
        const payload = { TipoEntidad: 'libro', Accion: 'alta', Payload: { ISBN: newIsbn(), FechaPublicacion: '2026-08' } };
        const createdA = await json<CatalogRequestCreated>(await request.post(requestsUrl, { headers: bearer(memberA), data: payload }), 201);
        const createdB = await json<CatalogRequestCreated>(await request.post(requestsUrl, { headers: bearer(memberB), data: payload }), 201);
        expect(createdA.Estado).toBe('pendiente');
        expect(createdB.Estado).toBe('pendiente');
        expect(createdB.Id).not.toBe(createdA.Id);
        expect(createdA.GrupoISBN).toBeTruthy();
        expect(createdB.GrupoISBN).toBe(createdA.GrupoISBN);
        const repeated = await json<CatalogRequestCreated>(await request.post(requestsUrl, { headers: bearer(memberA), data: payload }));
        expect(repeated.Id).toBe(createdA.Id);
        const queue = await json<CatalogRequest[]>(await request.get(requestsUrl, { headers: bearer(moderator), params: { estado: 'pendiente' } }));
        const groups = queue.filter(item => item.GrupoISBN === createdA.GrupoISBN);
        expect(groups).toHaveLength(1);
        expect(groups[0].Participantes).toBe(2);
        const resolveUrl = `${requestsUrl}/${groups[0].Id}/resolver`;
        const approval = { Estado: 'aprobada', Obra: { ObraId: bookId } };
        const resolved = await json<CatalogRequestResolved>(await request.patch(resolveUrl, { headers: bearer(moderator), data: approval }));
        expect(resolved).toMatchObject({ success: true, Estado: 'aprobada', EntidadId: bookId, ParticipantesResueltos: 2 });
        expect(resolved.EdicionId).toBeGreaterThan(0);
        for (const [index, token] of [memberA, memberB].entries()) {
            const after = await json<CatalogPublicDetail>(await request.get(detailUrl, { headers: bearer(token) }));
            expect(after.MiColeccion).toEqual(before[index].MiColeccion);
            expect(after.Ediciones?.find(item => item.Id === resolved.EdicionId)).toMatchObject({ ISBN: payload.Payload.ISBN, EnMiBiblioteca: false, Portada: 'nocover.png', FechaPublicacion: '2026-08-01' });
            const mine = await json<CatalogRequest[]>(await request.get(`${requestsUrl}/mias`, { headers: bearer(token), params: { estado: 'historial' } }));
            expect(mine.find(item => item.Id === (index ? createdB.Id : createdA.Id))?.Estado).toBe('aprobada');
        }
        const retry = await request.patch(resolveUrl, { headers: bearer(moderator), data: approval });
        expect(retry.status()).toBe(409);
        expect((await retry.json() as { code: string }).code).toBe('catalog_request_already_resolved');
    });
});

async function authenticate(request: APIRequestContext, qa: QaEnvironment, fixtures: QaFixturesResponse) {
    const admin = await tokenForRole(request, qa, fixtures, 'admin');
    const member = await tokenForRole(request, qa, fixtures, 'userA');
    await json(await request.post(`${qa.apiUrl}moderacion/politicas/creacion/aceptar`, { headers: bearer(admin) }));
    return { admin, member };
}

async function createEdition(request: APIRequestContext, qa: QaEnvironment, admin: string, bookId: number, date: string): Promise<EditionSaved> {
    return json<EditionSaved>(await request.post(`${qa.apiUrl}catalogo/admin/libros/${bookId}/ediciones`, {
        headers: bearer(admin), data: { ISBN: newIsbn(), FechaPublicacion: date }
    }), 201);
}

function newIsbn(): string {
    const isbnBody = `978${randomInt(1_000_000_000).toString().padStart(9, '0')}`;
    const weightedSum = [...isbnBody].reduce((sum, digit, index) => sum + Number(digit) * (index % 2 ? 3 : 1), 0);
    return `${isbnBody}${(10 - weightedSum % 10) % 10}`;
}

async function tokenForRole(request: APIRequestContext, qa: QaEnvironment, fixtures: QaFixturesResponse, role: QaRole) {
    const credentials = credentialsFor(role, fixtures);
    if (!credentials) throw new Error(`Faltan credenciales privadas QA de ${role}.`);
    return loginThroughApi(request, qa, credentials);
}

async function json<T = unknown>(response: APIResponse, status = 200): Promise<T> {
    // No adjuntar cuerpos ni cabeceras de autenticacion a la evidencia.
    expect(response.status(), 'Respuesta contractual de la API QA').toBe(status);
    return response.json() as Promise<T>;
}

function bearer(token: string) { return { Authorization: `Bearer ${token}` }; }
function ownedIds(response: WorkEditions) { return response.Ediciones.filter(item => item.EnMiBiblioteca).map(item => item.Id).sort((a, b) => a - b); }
function workHistory(collection: CatalogOwnCollection) {
    const { EdicionesIds, FechaActualizacion, ...history } = collection;
    return history;
}
function narrative(book: Book) {
    return {
        Estados: book.Estados, Puntuacion: book.Puntuacion, Resena: book.Resena, ResenaOculta: book.ResenaOculta,
        Capitulos: book.Capitulos, Partes: book.Partes, Interludios: book.Interludios, Personajes: book.Personajes,
        Localizaciones: book.Localizaciones, Conceptos: book.Conceptos, Organizaciones: book.Organizaciones,
        Eventos: book.Eventos, Citas: book.Citas, MetricasPersonajes: book.MetricasPersonajes
    };
}
