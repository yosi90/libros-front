import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import { installLocalVisualSession } from './support/local-visual-session';
import { json, localPlatformPerson as yo, watchRetiredCalls } from './support/platform-fixtures';
import { SDK_DOUBLE_PLATFORM_TOKEN } from './support/yosiftware-sdk-double';

// Hito 3 de la adhesión, parte de los clubes (fase 4 de la API): cada club es un espacio de la plataforma. Entrar,
// pedir entrar, invitar, aceptar y salir van por `/v1/espacios` con el token de la plataforma; la conversación es la
// del espacio con el chat de Libros, y lo que cambia llega por el canal del espacio. Libros pinta su propia interfaz
// de invitaciones (`data-invitaciones="propias"`) y trata `#yosi-invitacion=` y `#yosi-invitaciones` en su raíz.

const ME = 37;
const ada = { id: 'cuenta-ada', alias: 'ada', nombre: 'Ada', avatar: null };

/** Rutas de clubes que la API retiró en la fase 4 (RUTAS_RETIRADAS.md): la web no las pide nunca. */
const RETIRED = [
    /\/clubes-lectura\/\d+\/(unirse|salir|solicitudes|invitaciones)/, /\/clubes-lectura\/(invitaciones|solicitudes)/,
    /\/bandejas\/clubes\//, /\/chat\/clubes\//, /\/chat\//, /\/ws\/community/
];

const clubSummary = { Id: 70, EspacioId: 9, Nombre: 'Club de Dune', DescripcionMarkdown: null, Visibilidad: 'abierto', PropietarioId: 2, Objetivo: null, Miembros: 1, FechaActualizacion: '2026-10-24T10:00:00Z' };
function clubDetail(member: boolean) {
    return {
        ...clubSummary, ConversacionId: 120, SiguienteCursorMiembros: null,
        MiembrosDetalle: [{ Id: 2, Nombre: 'Ada', Imagen: null, Rol: 'propietario' }, ...(member ? [{ Id: ME, Nombre: 'Lector de prueba', Imagen: null, Rol: 'miembro' }] : [])],
        Metricas: { MiembrosActivos: member ? 2 : 1, Publicaciones: 1 }
    };
}
const invitation = { id: 5, espacio: { id: 9, idExterno: 'club-70', nombre: 'Club de Dune', dosPasos: false }, web: { clave: 'libros', nombre: 'Libros' }, de: { cuenta: ada.id, nombre: 'Ada' }, rol: 'miembro', nombreRol: 'Miembro', miembros: 1, caduca: '2026-11-08T00:00:00Z' };
const space = (member: boolean) => ({
    id: 9, idExterno: 'club-70', web: { clave: 'libros', nombre: 'Libros' }, nombre: 'Club de Dune', entrada: 'abierto', dosPasos: false, propietario: ada.id, miembros: member ? 2 : 1, conversacion: 120, creado: '2026-10-24T10:00:00Z',
    yo: member ? { rol: 'miembro', nombreRol: 'Miembro', propietario: false, estado: 'activo', capacidades: { gestionar: false, invitar: false, chat: 'escribir' } } : null, traspaso: null
});

interface ClubWorld { member: boolean; platformCalls: Array<{ method: string; path: string; auth: string | undefined }>; libraryCalls: string[] }

/** La API de Libros (los clubes) y la de la plataforma (`/v1/espacios`, `/v1/chat`) simuladas. */
async function installClubWorld(page: Page, world: ClubWorld): Promise<void> {
    await page.route('**/comunidad/capacidades', route => json(route, {
        success: true, UsuarioId: ME, VersionConfiguracion: 1, VersionCliente: '1.0.0', FechaExpiracion: null, CacheTtlSegundos: 300, Conservadora: false,
        Capacidades: { clubes: { Activa: true, VersionMinima: null } }
    }));
    await page.route(/\/clubes-lectura(\/.*)?(\?.*)?$/, route => {
        const url = new URL(route.request().url());
        world.libraryCalls.push(`${route.request().method()} ${url.pathname}`);
        const path = url.pathname.replace(/^.*\/clubes-lectura/, '');
        if (path === '') return json(route, { success: true, Clubes: [{ ...clubSummary, EstadoMembresia: world.member ? 'miembro' : 'disponible' }], SiguienteCursor: null });
        if (path === '/resumen') return json(route, { success: true, TieneClubes: world.member, ClubesPropios: [], ProximosEventos: [], ClubesPublicosActivos: [] });
        if (path === '/mios') return json(route, { success: true, TieneClubes: world.member, Total: world.member ? 1 : 0, Clubes: world.member ? [{ ...clubSummary, Rol: 'miembro', FechaIncorporacion: '', RetiradoDescubrimiento: false }] : [] });
        if (path === '/70') return json(route, { success: true, Club: clubDetail(world.member) });
        if (path === '/70/lecturas') return json(route, { success: true, Lecturas: [] });
        if (path === '/70/progreso') return json(route, { success: true, Progresos: [] });
        if (path === '/70/hitos') return json(route, { success: true, Hitos: [] });
        if (path === '/70/eventos') return json(route, { success: true, Eventos: [{ Id: 6, HitoId: null, Titulo: 'Tertulia', DescripcionMarkdown: null, FechaInicio: '2026-11-02T18:00:00Z', FechaFin: null }] });
        if (path === '/70/debates') return json(route, { success: true, Debates: [] });
        if (path === '/70/encuestas') return json(route, { success: true, Encuestas: [] });
        if (path === '/70/publicaciones') return json(route, { success: true, Publicaciones: [{ Id: 41, Titulo: 'Primeras impresiones', ContenidoMarkdown: 'Arrakis me ha atrapado.', Autor: { Id: 2, Nombre: 'Ada', Imagen: null }, Spoiler: null, FechaCreacion: '2026-10-24T11:00:00Z', Comentarios: 0, Reacciones: 0 }], SiguienteCursor: null });
        return json(route, { success: false, code: 'not_found', error: 'No encontrado.' }, 404);
    });
    await page.route('**/estadisticas/comunidad/clubes/**', route => json(route, { AutoresMasLeidos: [] }));
    await page.route(/\/v1\/espacios(\/.*)?(\?.*)?$/, route => {
        const request = route.request();
        const url = new URL(request.url());
        const path = url.pathname.replace(/^.*\/v1\/espacios/, '');
        world.platformCalls.push({ method: request.method(), path: `/v1/espacios${path}`, auth: request.headers()['authorization'] });
        if (path === '' && request.method() === 'GET') return json(route, { espacios: world.member ? [space(true)] : [] });
        if (path === '/invitaciones') return json(route, { invitaciones: world.member ? [] : [invitation] });
        if (path === '/invitaciones/por-codigo') return json(route, invitation);
        if (path === '/invitaciones/por-codigo/aceptar' || path === '/invitaciones/5/aceptar' || path === '/9/entrar') {
            world.member = true;
            return json(route, space(true));
        }
        if (path === '/9') return world.member ? json(route, space(true)) : json(route, { code: 'espacio_no_encontrado', error: 'No existe.', field: null }, 404);
        return json(route, { code: 'espacio_no_encontrado', error: 'No existe.', field: null }, 404);
    });
    // La conversación del espacio en el chat de la plataforma.
    const permisos = { escribir: true, invitar: false, administrar: false, salir: false, borrar: false };
    const conversation = { id: 120, tipo: 'web', titulo: 'Club de Dune', persona: null, web: { clave: 'libros', nombre: 'Libros' }, miembros: 2, rol: 'miembro', noLeidos: 0, ultimoMensaje: null, actividad: '2026-10-24T09:00:00Z', cerrada: false, permisos };
    await page.route('**/v1/chat/conversaciones/120', route => json(route, { ...conversation, participantes: [{ persona: ada, rol: 'miembro' }, { persona: yo, rol: 'miembro' }] }));
    await page.route('**/v1/chat/conversaciones/120/mensajes?**', route => json(route, { mensajes: [{
        id: 7, conversacion: 120, tipo: 'texto', persona: ada, texto: '¿Empezamos el lunes?', aviso: null, respuesta: null, reacciones: { total: {}, mia: null },
        editado: null, borrado: false, noDisponible: false, propio: false, idCliente: null, creado: '2026-10-24T09:00:00Z'
    }], cursor: null }));
    await page.route('**/v1/chat/conversaciones/120/leido', route => json(route, { hasta: 7 }));
}

async function setUp(page: Page, member = false, webPresentation = true): Promise<{ world: ClubWorld; retired: string[] }> {
    const retired = watchRetiredCalls(page, RETIRED);
    await installLocalVisualSession(page, { webPresentation });
    const world: ClubWorld = { member, platformCalls: [], libraryCalls: [] };
    await installClubWorld(page, world);
    await page.setViewportSize({ width: 1440, height: 900 });
    return { world, retired };
}

test.describe('Los clubes en los espacios de la plataforma (hito 3)', () => {
    test('el centro de acceso enseña las invitaciones de la plataforma y acepta con su token', async ({ page }) => {
        const { world, retired } = await setUp(page);
        await page.goto('/dashboard/community/clubs?clubTab=access');

        const access = page.locator('app-web-club-access-center-view');
        const row = access.locator('.access-row').first();
        await expect(row).toContainText('Club de Dune');
        await expect(row).toContainText('Te invita Ada');
        await row.getByRole('button', { name: 'Aceptar' }).click();
        await expect(access.locator('.notice')).toContainText('Ya eres miembro de Club de Dune');

        const accepted = world.platformCalls.find(call => call.method === 'POST' && call.path === '/v1/espacios/invitaciones/5/aceptar');
        expect(accepted?.auth).toBe(`Bearer ${SDK_DOUBLE_PLATFORM_TOKEN}`);
        expect(retired).toEqual([]);
    });

    test('#yosi-invitacion=<código> en la raíz: se quita de la dirección, se enseña y al aceptar abre el club', async ({ page }) => {
        const { world, retired } = await setUp(page);
        await page.goto('/#yosi-invitacion=CODIGO-DE-PRUEBA');

        const dialog = page.getByRole('dialog', { name: 'Invitación a «Club de Dune»' });
        await expect(dialog).toContainText('Ada te invita a unirte al club como miembro');
        expect(page.url()).not.toContain('yosi-invitacion');
        await dialog.getByRole('button', { name: 'Aceptar' }).click();

        await expect(page).toHaveURL(/\/dashboard\/community\/clubs\/70$/);
        await expect(page.locator('app-web-club-detail-view .club__title h2')).toHaveText('Club de Dune');
        expect(world.platformCalls.map(call => `${call.method} ${call.path}`)).toEqual(expect.arrayContaining([
            'POST /v1/espacios/invitaciones/por-codigo', 'POST /v1/espacios/invitaciones/por-codigo/aceptar'
        ]));
        expect(retired).toEqual([]);
    });

    test('#yosi-invitaciones lleva a las invitaciones pendientes', async ({ page }) => {
        const { retired } = await setUp(page);
        await page.goto('/dashboard/books#yosi-invitaciones');

        await expect(page).toHaveURL(/clubTab=access/);
        await expect(page).toHaveURL(/accessType=invitaciones/);
        expect(page.url()).not.toContain('yosi-invitaciones');
        await expect(page.locator('app-web-club-access-center-view .access-row').first()).toContainText('Club de Dune');
        expect(retired).toEqual([]);
    });

    test('entrar en un club abierto: espera al feed, abre el chat del espacio y escucha su canal', async ({ page }) => {
        const { world, retired } = await setUp(page);
        await page.goto('/dashboard/community/clubs/70');

        const club = page.locator('app-web-club-detail-view');
        await club.getByRole('button', { name: 'Unirme' }).click();
        await expect(club.locator('.notice').first()).toBeVisible();
        expect(world.platformCalls.some(call => call.method === 'POST' && call.path === '/v1/espacios/9/entrar')).toBe(true);

        // El feed ya ha llegado (`/clubes-lectura/mios` trae el club): Libros lo abre sin recargar.
        await expect(club.getByRole('button', { name: 'Abrir chat' })).toBeEnabled({ timeout: 15_000 });
        await expect.poll(() => page.evaluate(() => (window as unknown as { __yosiftwareDoble: { canalesAbiertos(): number[] } }).__yosiftwareDoble.canalesAbiertos())).toEqual([9]);

        await club.locator('.tabs').getByRole('button', { name: 'Chat', exact: true }).click();
        await expect(club.locator('.chat-frame app-chat-conversation')).toContainText('¿Empezamos el lunes?');

        await club.locator('.tabs').getByRole('button', { name: 'Publicaciones', exact: true }).click();
        await expect(club.getByRole('button', { name: 'Denunciar publicación' })).toBeVisible();
        await expect(club.getByRole('button', { name: 'Denunciar club' })).toBeVisible();

        // Un evento del canal refresca solo el calendario, una vez aunque llegue repetido.
        const before = world.libraryCalls.filter(call => call.endsWith('/70/eventos')).length;
        await page.evaluate(() => {
            const doble = (window as unknown as { __yosiftwareDoble: { canal(id: number, mensaje: unknown): void } }).__yosiftwareDoble;
            const mensaje = { tipo: 'mensaje', secuencia: 1, idExterno: 'club.event_created-6', datos: { tipo: 'club.event_created', ClubId: 70, EventoId: 6 }, fecha: '' };
            doble.canal(9, mensaje);
            doble.canal(9, mensaje);
        });
        await expect.poll(() => world.libraryCalls.filter(call => call.endsWith('/70/eventos')).length).toBe(before + 1);
        expect(retired).toEqual([]);
    });

    test('Wood: el club de un miembro incrusta la conversación del espacio y deja denunciar a la vista', async ({ page }) => {
        const { world, retired } = await setUp(page, true, false);
        await page.goto('/dashboard/community/clubs/70');

        const club = page.locator('app-club-detail .club-detail');
        await expect(club.locator('.club-detail__hero h1')).toHaveText('Club de Dune');
        await expect(club.locator('.club-detail__hero').getByRole('button', { name: 'Abrir chat' })).toBeEnabled();
        await expect(club.locator('.club-detail__chat-frame app-chat-conversation')).toContainText('¿Empezamos el lunes?');
        await expect(club.locator('.club-detail__hero').getByRole('button', { name: 'Denunciar' })).toBeVisible();
        await expect(club.getByRole('button', { name: 'Denunciar publicación' })).toBeVisible();
        await expect(club.locator('.club-detail__metrics')).not.toContainText('mensajes');
        expect(world.platformCalls.some(call => call.method === 'GET' && call.path === '/v1/espacios/9')).toBe(true);
        expect(retired).toEqual([]);
    });
});
