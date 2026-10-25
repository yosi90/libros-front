import type { Page, Request, Route } from '@playwright/test';
import { expect, test } from './fixtures/test';
import { environment } from '../src/environment/environment';
import { installLocalVisualSession, visualBook } from './support/local-visual-session';
import { installYosiftwareSdkDouble, sdkDoublePlatformToken, sdkDoubleToken } from './support/yosiftware-sdk-double';
import { json } from './support/platform-fixtures';

// Hito 4 de la adhesión: la limpieza al cambiar de cuenta (ecosistema-kit/CAMBIO_DE_CUENTA.md). Dos cuentas de
// Yosiftware con datos distintos en Libros; el doble del SDK cambia de una a otra como el de verdad (aviso
// `yosiftware:identidad`, `alCambiar` y el anuncio a las demás pestañas), cada cuenta con su token.

interface Account { id: string; alias: string }
const ana: Account = { id: 'cuenta-ana', alias: 'ana' };
const bruno: Account = { id: 'cuenta-bruno', alias: 'bruno' };
const ACCOUNTS = [ana, bruno];
const LOCAL_USERS: Record<string, { Id: number; Nombre: string }> = { [ana.id]: { Id: 37, Nombre: 'Ana' }, [bruno.id]: { Id: 38, Nombre: 'Bruno' } };
const scope = (account: Account) => `${environment.environmentName}:${account.id}`;

interface ApiCall { method: string; path: string; account: string | null }
/** Una petición como salió del navegador, con el tramo (los cambios hechos con `switchTo`) en el que salió. */
interface SentCall extends ApiCall { tramo: number }
interface PageRequestLog { tramo: number; enviadas: Array<{ tramo: number; method: string; url: string; auth: string }> }
interface World {
    calls: ApiCall[];
    /** Cuánto tarda la próxima lectura de la biblioteca de cada cuenta (y con qué libro responde entonces). */
    slowLibrary: Record<string, { delayMs: number; book: string } | undefined>;
    /** Cuánto tarda el guardado del capítulo. */
    chapterSaveDelayMs: number;
    chapterSaves: Array<{ account: string | null; body: Record<string, unknown> }>;
}

const accountOfAuth = (auth: string): string | null => ACCOUNTS.find(account => auth.endsWith(`:${account.id}`))?.id ?? null;
const accountOf = (request: Request): string | null => accountOfAuth(request.headers()['authorization'] ?? '');
const book = (name: string) => ({
    Id: name.length + 200, Nombre: name, Autores: [{ Id: 1, Nombre: 'Autora' }], Orden: 1, Portada: 'missing.png', PorcentajeCompletado: 10,
    Estados: [{ EstadoId: 1, Nombre: 'En marcha', Fecha: '2026-10-20T10:00:00' }]
});
const library = (bookName: string, universe: string) => [{ Id: 1, Nombre: universe, Autores: [], Libros: [book(bookName)], Antologias: [], Sagas: [] }];
const LIBRARY: Record<string, { book: string; universe: string }> = {
    [ana.id]: { book: 'Libro de Ana', universe: 'Universo de Ana' },
    [bruno.id]: { book: 'Libro de Bruno', universe: 'Universo de Bruno' }
};

/** Libros (por el token de cada cuenta) y la plataforma (por su token de plataforma), con dos cuentas. */
async function installTwoAccounts(page: Page, world: World, options: { webPresentation?: boolean } = {}): Promise<void> {
    await installLocalVisualSession(page, { webPresentation: options.webPresentation ?? true });
    await installYosiftwareSdkDouble(page, { cuenta: ana, tokensPorCuenta: true });
    await recordRequestsInPage(page);
    page.on('request', request => {
        const url = new URL(request.url());
        const isLibros = request.url().startsWith(environment.apiUrl);
        const isPlatform = request.url().startsWith(environment.plataforma.apiUrl);
        if (isLibros || isPlatform) world.calls.push({ method: request.method(), path: url.pathname, account: accountOf(request) });
    });
    await page.route('**/usuarios/me', route => {
        const account = accountOf(route.request());
        return account ? json(route, { success: true, user: { ...LOCAL_USERS[account], Role: { Id: 1, Nombre: 'usuario' } } }) : json(route, { success: false, code: 'unauthorized' }, 401);
    });
    await page.route('**/coleccion/universos', async route => {
        const account = accountOf(route.request());
        if (!account) return json(route, [], 401);
        const slow = world.slowLibrary[account];
        if (slow) {
            world.slowLibrary[account] = undefined;
            await new Promise(resolve => setTimeout(resolve, slow.delayMs));
            return json(route, library(slow.book, LIBRARY[account].universe)).catch(() => undefined);
        }
        return json(route, library(LIBRARY[account].book, LIBRARY[account].universe));
    });
    await page.route('**/v1/chat/conversaciones', route => {
        const auth = route.request().headers()['authorization'] ?? '';
        const account = ACCOUNTS.find(candidate => auth === `Bearer ${sdkDoublePlatformToken(candidate.id)}`);
        const titulo = account === ana ? 'Charla de Ana' : 'Charla de Bruno';
        return json(route, { conversaciones: account ? [conversation(account === ana ? 4 : 5, titulo)] : [] });
    });
    await page.route('**/capitulos/11', async route => {
        world.chapterSaves.push({ account: accountOf(route.request()), body: route.request().postDataJSON() as Record<string, unknown> });
        if (world.chapterSaveDelayMs) await new Promise(resolve => setTimeout(resolve, world.chapterSaveDelayMs));
        const body = route.request().postDataJSON() as Record<string, unknown>;
        return json(route, { ...visualBook.Capitulos[0], Nombre: body['Nombre'] }).catch(() => undefined);
    });
}

const permisos = { escribir: true, invitar: false, administrar: false, salir: true, borrar: true };
function conversation(id: number, titulo: string) {
    return { id, tipo: 'grupo', titulo, persona: null, web: null, miembros: 3, rol: 'miembro', noLeidos: 1, ultimoMensaje: null, actividad: '2026-10-24T09:00:00Z', cerrada: false, permisos };
}

function newWorld(): World { return { calls: [], slowLibrary: {}, chapterSaveDelayMs: 0, chapterSaves: [] }; }

/**
 * Qué peticiones a Libros y a la plataforma salen del navegador, con qué cuenta y en qué tramo. El orden lo da el propio
 * navegador: el evento `request` de Playwright llega a la prueba con un retraso variable (sale del proceso de red, no
 * de la página), así que, mirado con el reloj de la prueba, una petición enviada justo antes de un cambio de cuenta
 * puede parecer posterior a él.
 */
async function recordRequestsInPage(page: Page): Promise<void> {
    await page.addInitScript(([libros, plataforma]) => {
        const log: PageRequestLog = { tramo: 0, enviadas: [] };
        (window as unknown as { __pruebaPeticiones: PageRequestLog }).__pruebaPeticiones = log;
        const note = (method: string, url: string, auth: string | null) => {
            const absolute = new URL(url, location.href).href;
            if (absolute.startsWith(libros) || absolute.startsWith(plataforma))
                log.enviadas.push({ tramo: log.tramo, method, url: absolute, auth: auth ?? '' });
        };
        const pending = new WeakMap<XMLHttpRequest, { method: string; url: string; auth: string | null }>();
        const open = XMLHttpRequest.prototype.open as (this: XMLHttpRequest, ...args: unknown[]) => void;
        XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
            pending.set(this, { method, url: String(url), auth: null });
            return open.call(this, method, url, ...rest);
        } as typeof XMLHttpRequest.prototype.open;
        const setRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
        XMLHttpRequest.prototype.setRequestHeader = function (this: XMLHttpRequest, name: string, value: string) {
            const request = pending.get(this);
            if (request && name.toLowerCase() === 'authorization') request.auth = value;
            return setRequestHeader.call(this, name, value);
        };
        const send = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
            const request = pending.get(this);
            if (request) note(request.method, request.url, request.auth);
            return send.call(this, body);
        };
        const originalFetch = window.fetch;
        window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
            const base = input instanceof Request ? input : null;
            const headers = new Headers(init?.headers ?? base?.headers);
            note(init?.method ?? base?.method ?? 'GET', base ? base.url : String(input), headers.get('authorization'));
            return originalFetch.call(window, input, init);
        };
    }, [environment.apiUrl, environment.plataforma.apiUrl] as const);
}

async function sentFromPage(page: Page): Promise<SentCall[]> {
    const sent = await page.evaluate(() => (window as unknown as { __pruebaPeticiones: PageRequestLog }).__pruebaPeticiones.enviadas);
    return sent.map(({ tramo, method, url, auth }) => ({ tramo, method, path: new URL(url).pathname, account: accountOfAuth(auth) }));
}

/** Cambia de cuenta como el SDK y devuelve el tramo que empieza, marcado en el navegador justo antes del aviso. */
async function switchTo(page: Page, account: Account | null, motivo?: string): Promise<number> {
    return page.evaluate(([cuenta, razon]) => {
        const target = window as unknown as {
            __yosiftwareDoble: { cambiarA(cuenta: unknown, motivo?: string): void };
            __pruebaPeticiones: PageRequestLog;
        };
        const tramo = ++target.__pruebaPeticiones.tramo;
        target.__yosiftwareDoble.cambiarA(cuenta, razon ?? undefined);
        return tramo;
    }, [account, motivo ?? null] as const);
}

async function doble<T>(page: Page, expression: 'canalesAbiertos' | 'oyentesDelTiempoReal'): Promise<T> {
    return page.evaluate(name => (window as unknown as { __yosiftwareDoble: Record<string, () => unknown> }).__yosiftwareDoble[name](), expression) as Promise<T>;
}

/** Navega dentro de la aplicación, sin recargar (el router de Angular escucha `popstate`). */
async function navigateInApp(page: Page, path: string): Promise<void> {
    await page.evaluate(target => {
        history.pushState({}, '', target);
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    }, path);
}

const pendingKey = (account: Account) => `libros:pendiente:${scope(account)}:capitulo:${visualBook.Id}:capitulo:11`;

test.describe('Cambio de cuenta (CAMBIO_DE_CUENTA.md) @cambio-de-cuenta @smoke', () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        // Lo que el dispositivo ya tenía: la vista de Ana, la exclusión de Yosiftadísticas y el tema del navegador.
        await page.addInitScript(([keyAna]) => {
            if (sessionStorage.getItem('preparado')) return;
            sessionStorage.setItem('preparado', '1');
            localStorage.setItem(keyAna, 'statuses');
            localStorage.setItem('yosiftadisticas:excluir', '1');
            localStorage.setItem('libros:web-theme:last', 'dark');
        }, [`library-collection-view:${scope(ana)}`]);
    });

    test('A → B → A sin cierre intermedio ni recarga: cada cuenta ve lo suyo, con su token y su almacenamiento', async ({ page }) => {
        const world = newWorld();
        await installTwoAccounts(page, world);
        const libraryView = page.locator('app-web-library-view');
        const statusesButton = libraryView.getByRole('button', { name: 'Estados', exact: true });
        await page.goto('/dashboard/books');

        await expect(libraryView.getByText('Libro de Ana').first()).toBeVisible({ timeout: 15_000 });
        await expect(statusesButton).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('yosi-notificaciones')).toHaveAttribute('data-cuenta', ana.id);

        const asBruno = await switchTo(page, bruno);
        await expect(libraryView.getByText('Libro de Bruno').first()).toBeVisible();
        await expect(libraryView.getByText('Libro de Ana')).toHaveCount(0);
        await expect(libraryView.getByText('Universo de Ana')).toHaveCount(0);
        // La vista de Ana es suya: Bruno empieza con la de siempre.
        await expect(libraryView.getByRole('button', { name: 'Universos', exact: true })).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('yosi-notificaciones')).toHaveAttribute('data-cuenta', bruno.id);
        await statusesButton.click();
        await libraryView.getByRole('button', { name: 'Universos', exact: true }).click();

        const asAna = await switchTo(page, ana);
        await expect(libraryView.getByText('Libro de Ana').first()).toBeVisible();
        await expect(libraryView.getByText('Libro de Bruno')).toHaveCount(0);
        await expect(statusesButton).toHaveAttribute('aria-pressed', 'true');

        // Desde cada cambio, las llamadas van con la cuenta vigente; ninguna de la anterior se repite con la nueva.
        const libros = (await sentFromPage(page)).filter(call => call.path.endsWith('/usuarios/me') || call.path.endsWith('/coleccion/universos'));
        expect(libros.filter(call => call.tramo === asBruno).every(call => call.account === bruno.id)).toBe(true);
        expect(libros.filter(call => call.tramo >= asAna).every(call => call.account === ana.id)).toBe(true);
        expect(libros.filter(call => call.tramo >= asAna).length).toBeGreaterThan(0);

        const stored = await page.evaluate(() => ({ ...localStorage }));
        expect(stored[`library-collection-view:${scope(ana)}`]).toBe('statuses');
        expect(stored[`library-collection-view:${scope(bruno)}`]).toBe('universes');
        // Lo del dispositivo se conserva: la exclusión de Yosiftadísticas y el tema.
        expect(stored['yosiftadisticas:excluir']).toBe('1');
        expect(stored['libros:web-theme:last']).toBe('dark');
        // Ningún token en el navegador.
        expect(JSON.stringify(stored)).not.toContain(sdkDoubleToken(ana.id));
    });

    test('varias pestañas: el cambio de cuenta en una llega a la otra, y también el cierre', async ({ page, context }) => {
        const world = newWorld();
        await installTwoAccounts(page, world);
        const other = await context.newPage();
        await other.setViewportSize({ width: 1440, height: 900 });
        await installTwoAccounts(other, newWorld());
        await page.goto('/dashboard/books');
        await other.goto('/dashboard/books');
        await expect(other.locator('app-web-library-view').getByText('Libro de Ana').first()).toBeVisible({ timeout: 15_000 });

        await switchTo(page, bruno);
        await expect(other.locator('app-web-library-view').getByText('Libro de Bruno').first()).toBeVisible();
        await expect(other.locator('app-web-library-view').getByText('Libro de Ana')).toHaveCount(0);

        await switchTo(other, null);
        await expect(page).toHaveURL(/\/home(?:\?.*)?$/);
        await expect(page.getByRole('heading', { name: 'Cada libro deja una huella.' })).toBeVisible();
        expect(await page.evaluate(() => localStorage.getItem('yosiftadisticas:excluir'))).toBe('1');
        await other.close();
    });

    test('cierre de sesión y revocación: vuelve a la portada, cierra el chat y no pide nada más con la cuenta anterior', async ({ page }) => {
        const world = newWorld();
        await installTwoAccounts(page, world);
        await page.goto('/dashboard/community/messages');
        await expect(page.locator('.inbox__list .thread').first()).toContainText('Charla de Ana', { timeout: 15_000 });

        // Cierre de sesión desde la propia web (el SDK lo anuncia a todas las webs).
        await page.evaluate(() => (window as unknown as { yosiftware: { salir(): Promise<void> } }).yosiftware.salir());
        await expect(page).toHaveURL(/\/home(?:\?.*)?$/);
        await expect(page.locator('.inbox__list')).toHaveCount(0);
        expect(await doble<number>(page, 'oyentesDelTiempoReal')).toBe(0);

        // Vuelve a entrar y la sesión se revoca desde otra web (`sin_sesion` con su motivo).
        await switchTo(page, ana);
        await expect(page).toHaveURL(/\/dashboard\/books/);
        await navigateInApp(page, '/dashboard/community/messages');
        await expect(page.locator('.inbox__list .thread').first()).toContainText('Charla de Ana', { timeout: 15_000 });
        // Lo que salió antes de la revocación (el resumen social de Comunidad puede salir unos milisegundos antes) se
        // descarta al llegar; lo que se comprueba es que, desde el aviso, nada sale ya con la cuenta de Ana.
        const revoked = await switchTo(page, null, 'revocada');
        await expect(page).toHaveURL(/\/home(?:\?.*)?$/);
        await page.waitForTimeout(1500);
        expect((await sentFromPage(page)).filter(call => call.tramo >= revoked && call.account !== null)).toEqual([]);
        expect(await doble<number>(page, 'oyentesDelTiempoReal')).toBe(0);
        expect(await page.evaluate(() => localStorage.getItem('yosiftadisticas:excluir'))).toBe('1');
    });

    test('una lectura lenta de A que llega siendo B, y otra que llega al volver a A, se descartan', async ({ page }) => {
        const world = newWorld();
        await installTwoAccounts(page, world);
        const libraryView = page.locator('app-web-library-view');
        world.slowLibrary[ana.id] = { delayMs: 3000, book: 'Libro antiguo de Ana' };
        await page.goto('/dashboard/books');
        await expect.poll(() => world.calls.some(call => call.path.endsWith('/coleccion/universos') && call.account === ana.id)).toBe(true);

        // A → B mientras la lectura de A sigue en camino: llega tarde y no se pinta.
        await switchTo(page, bruno);
        await expect(libraryView.getByText('Libro de Bruno').first()).toBeVisible({ timeout: 15_000 });
        await page.waitForTimeout(3500);
        await expect(libraryView.getByText('Libro antiguo de Ana')).toHaveCount(0);
        await expect(libraryView.getByText('Libro de Bruno').first()).toBeVisible();

        // B → A con otra lectura lenta de la generación anterior de A: la nueva generación pinta lo suyo y la vieja se tira.
        world.slowLibrary[bruno.id] = { delayMs: 3000, book: 'Libro antiguo de Bruno' };
        await switchTo(page, ana);
        await expect(libraryView.getByText('Libro de Ana').first()).toBeVisible();
        await switchTo(page, bruno);
        await switchTo(page, ana);
        await page.waitForTimeout(3500);
        await expect(libraryView.getByText('Libro antiguo de Bruno')).toHaveCount(0);
        await expect(libraryView.getByText('Libro antiguo de Ana')).toHaveCount(0);
        await expect(libraryView.getByText('Libro de Ana').first()).toBeVisible();
    });

    test('el capítulo sin guardar se queda con A: ni la escritura en vuelo ni el borrador se envían como B, y A lo recupera', async ({ page }) => {
        const world = newWorld();
        await installTwoAccounts(page, world);
        const title = page.getByRole('textbox', { name: 'Título del capítulo' });
        await page.goto(`/book/${visualBook.Id}/chapter/11`);
        await expect(title).toHaveValue('La puerta entreabierta', { timeout: 15_000 });

        // Una escritura de A en vuelo cuando cambia la cuenta: su respuesta llega tarde y no se repite con B.
        world.chapterSaveDelayMs = 2500;
        await title.fill('La puerta, primera versión de Ana');
        await expect.poll(() => world.chapterSaves.length, { timeout: 10_000 }).toBe(1);
        await switchTo(page, bruno);
        await expect(page).toHaveURL(/\/dashboard\/books/);
        await page.waitForTimeout(3500);
        expect(world.chapterSaves.map(save => save.account)).toEqual([ana.id]);
        // No llegó a confirmarse: queda apartada para Ana.
        expect(await page.evaluate(key => localStorage.getItem(key), pendingKey(ana))).toContain('primera versión de Ana');
        await page.evaluate(key => localStorage.removeItem(key), pendingKey(ana));

        // Un borrador sin enviar (antes del autoguardado) cuando cambia la cuenta.
        world.chapterSaveDelayMs = 0;
        await switchTo(page, ana);
        await expect(page.locator('app-web-library-view').getByText('Libro de Ana').first()).toBeVisible({ timeout: 15_000 });
        await navigateInApp(page, `/book/${visualBook.Id}/chapter/11`);
        await expect(title).toHaveValue('La puerta entreabierta', { timeout: 15_000 });
        await title.fill('La puerta que solo Ana ha escrito');
        await switchTo(page, bruno);
        await expect(page).toHaveURL(/\/dashboard\/books/);
        await page.waitForTimeout(2500);
        expect(world.chapterSaves).toHaveLength(1);
        expect(await page.evaluate(key => localStorage.getItem(key), pendingKey(ana))).toContain('La puerta que solo Ana ha escrito');

        // Bruno abre el mismo capítulo: no ve el borrador de Ana ni lo envía.
        await expect(page.locator('app-web-library-view').getByText('Libro de Bruno').first()).toBeVisible({ timeout: 15_000 });
        await navigateInApp(page, `/book/${visualBook.Id}/chapter/11`);
        await expect(title).toHaveValue('La puerta entreabierta', { timeout: 15_000 });
        await page.waitForTimeout(2500);
        expect(world.chapterSaves).toHaveLength(1);
        expect(await page.evaluate(key => localStorage.getItem(key), pendingKey(ana))).not.toBeNull();

        // Ana vuelve tras reiniciar el navegador (el doble arranca con Ana): recupera su borrador y se guarda con ella.
        await page.reload();
        await expect(title).toHaveValue('La puerta que solo Ana ha escrito', { timeout: 15_000 });
        await expect(page.getByText('Hemos recuperado los cambios que no se guardaron en este capítulo')).toBeVisible();
        await expect.poll(() => world.chapterSaves.length, { timeout: 10_000 }).toBe(2);
        expect(world.chapterSaves[1]).toEqual({ account: ana.id, body: expect.objectContaining({ Nombre: 'La puerta que solo Ana ha escrito' }) });
        expect(await page.evaluate(key => localStorage.getItem(key), pendingKey(ana))).toBeNull();
    });

    test('el chat, la campana y los canales de los espacios se cierran y no enseñan nada de A', async ({ page }) => {
        const world = newWorld();
        await installTwoAccounts(page, world, { webPresentation: false });
        await installClubOfAna(page);
        await page.goto('/dashboard/community/clubs/70');
        const club = page.locator('app-club-detail .club-detail');
        await expect(club.locator('.club-detail__chat-frame app-chat-conversation')).toContainText('¿Empezamos el lunes?', { timeout: 15_000 });
        await expect.poll(() => doble<number[]>(page, 'canalesAbiertos')).toEqual([9]);

        await switchTo(page, bruno);
        await expect(page).toHaveURL(/\/dashboard\/books/);
        await expect.poll(() => doble<number[]>(page, 'canalesAbiertos')).toEqual([]);
        await expect(page.locator('yosi-notificaciones')).toHaveAttribute('data-cuenta', bruno.id);
        // Un mensaje del club de Ana que llega tarde por el tiempo real no se enseña a Bruno.
        await page.evaluate(() => (window as unknown as { __yosiftwareDoble: { evento(tipo: string, datos: unknown): void } }).__yosiftwareDoble.evento('chat.mensaje', {
            conversacion: 120, mensaje: { id: 99, conversacion: 120, tipo: 'texto', persona: { id: 'cuenta-ada', alias: 'ada', nombre: 'Ada', avatar: null }, texto: 'Mensaje tardío del club de Ana', propio: false, creado: '2026-10-25T09:00:00Z' }
        }));
        await navigateInApp(page, '/dashboard/community/messages');
        await expect(page.getByText('Charla de Bruno').first()).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText('Charla de Ana')).toHaveCount(0);
        await expect(page.getByText('Club de Dune')).toHaveCount(0);
        await expect(page.getByText('Mensaje tardío del club de Ana')).toHaveCount(0);
    });
});

/** Ana es miembro del Club de Dune (espacio 9, conversación 120); Bruno no tiene clubes. */
async function installClubOfAna(page: Page): Promise<void> {
    const ada = { id: 'cuenta-ada', alias: 'ada', nombre: 'Ada', avatar: null };
    const isAna = (route: Route) => accountOf(route.request()) === ana.id
        || (route.request().headers()['authorization'] ?? '') === `Bearer ${sdkDoublePlatformToken(ana.id)}`;
    const summary = { Id: 70, EspacioId: 9, Nombre: 'Club de Dune', DescripcionMarkdown: null, Visibilidad: 'abierto', PropietarioId: 2, Objetivo: null, Miembros: 2, FechaActualizacion: '2026-10-24T10:00:00Z' };
    await page.route('**/comunidad/capacidades', route => json(route, {
        success: true, UsuarioId: 37, VersionConfiguracion: 1, VersionCliente: '1.0.0', FechaExpiracion: null, CacheTtlSegundos: 300, Conservadora: false,
        Capacidades: { clubes: { Activa: true, VersionMinima: null } }
    }));
    await page.route(/\/clubes-lectura(\/.*)?(\?.*)?$/, route => {
        const path = new URL(route.request().url()).pathname.replace(/^.*\/clubes-lectura/, '');
        const member = isAna(route);
        if (path === '') return json(route, { success: true, Clubes: member ? [{ ...summary, EstadoMembresia: 'miembro' }] : [], SiguienteCursor: null });
        if (path === '/resumen') return json(route, { success: true, TieneClubes: member, ClubesPropios: [], ProximosEventos: [], ClubesPublicosActivos: [] });
        if (path === '/mios') return json(route, { success: true, TieneClubes: member, Total: member ? 1 : 0, Clubes: member ? [{ ...summary, Rol: 'miembro', FechaIncorporacion: '', RetiradoDescubrimiento: false }] : [] });
        if (!member) return json(route, { success: false, code: 'not_found', error: 'No encontrado.' }, 404);
        if (path === '/70') return json(route, { success: true, Club: {
            ...summary, ConversacionId: 120, SiguienteCursorMiembros: null,
            MiembrosDetalle: [{ Id: 2, Nombre: 'Ada', Imagen: null, Rol: 'propietario' }, { Id: 37, Nombre: 'Ana', Imagen: null, Rol: 'miembro' }],
            Metricas: { MiembrosActivos: 2, Publicaciones: 0 }
        } });
        if (/^\/70\/(lecturas|progreso|hitos|eventos|debates|encuestas)$/.test(path)) {
            const key = { '/70/lecturas': 'Lecturas', '/70/progreso': 'Progresos', '/70/hitos': 'Hitos', '/70/eventos': 'Eventos', '/70/debates': 'Debates', '/70/encuestas': 'Encuestas' }[path]!;
            return json(route, { success: true, [key]: [] });
        }
        if (path === '/70/publicaciones') return json(route, { success: true, Publicaciones: [], SiguienteCursor: null });
        return json(route, { success: false, code: 'not_found', error: 'No encontrado.' }, 404);
    });
    await page.route('**/estadisticas/comunidad/clubes/**', route => json(route, { AutoresMasLeidos: [] }));
    const space = {
        id: 9, idExterno: 'club-70', web: { clave: 'libros', nombre: 'Libros' }, nombre: 'Club de Dune', entrada: 'abierto', dosPasos: false, propietario: ada.id, miembros: 2, conversacion: 120, creado: '2026-10-24T10:00:00Z',
        yo: { rol: 'miembro', nombreRol: 'Miembro', propietario: false, estado: 'activo', capacidades: { gestionar: false, invitar: false, chat: 'escribir' } }, traspaso: null
    };
    await page.route(/\/v1\/espacios(\/.*)?(\?.*)?$/, route => {
        const path = new URL(route.request().url()).pathname.replace(/^.*\/v1\/espacios/, '');
        const member = isAna(route);
        if (path === '') return json(route, { espacios: member ? [space] : [] });
        if (path === '/invitaciones') return json(route, { invitaciones: [] });
        if (path === '/9' && member) return json(route, space);
        return json(route, { code: 'espacio_no_encontrado', error: 'No existe.', field: null }, 404);
    });
    const permisosDelClub = { escribir: true, invitar: false, administrar: false, salir: false, borrar: false };
    const clubConversation = { id: 120, tipo: 'web', titulo: 'Club de Dune', persona: null, web: { clave: 'libros', nombre: 'Libros' }, miembros: 2, rol: 'miembro', noLeidos: 0, ultimoMensaje: null, actividad: '2026-10-24T09:00:00Z', cerrada: false, permisos: permisosDelClub };
    await page.route('**/v1/chat/conversaciones/120', route => isAna(route)
        ? json(route, { ...clubConversation, participantes: [{ persona: ada, rol: 'miembro' }] })
        : json(route, { code: 'conversacion_no_encontrada', error: 'No existe.' }, 404));
    await page.route('**/v1/chat/conversaciones/120/mensajes?**', route => isAna(route)
        ? json(route, { mensajes: [{ id: 7, conversacion: 120, tipo: 'texto', persona: ada, texto: '¿Empezamos el lunes?', aviso: null, respuesta: null, reacciones: { total: {}, mia: null }, editado: null, borrado: false, noDisponible: false, propio: false, idCliente: null, creado: '2026-10-24T09:00:00Z' }], cursor: null })
        : json(route, { code: 'conversacion_no_encontrada', error: 'No existe.' }, 404));
    await page.route('**/v1/chat/conversaciones/120/leido', route => json(route, { hasta: 7 }));
}
