import type { Page, Request } from '@playwright/test';
import { expect, test } from './fixtures/test';
import { installLocalVisualSession } from './support/local-visual-session';
import { SDK_DOUBLE_PLATFORM_TOKEN } from './support/yosiftware-sdk-double';

// Hito 3 de la adhesión: lo social es de la plataforma Yosiftware. La cabecera lleva sus webs, su campana y la cuenta;
// el chat es el de la plataforma con la interfaz de Libros, y la web no llama a nada que la API de Libros retiró.

const yo = { id: '0d0c37aa-0000-4000-8000-000000000037', alias: 'lector_prueba', nombre: 'Lector de prueba', avatar: null };
const ana = { id: 'cuenta-ana', alias: 'ana', nombre: 'Ana', avatar: null };
const permisos = { escribir: true, invitar: false, administrar: false, salir: true, borrar: true };
const mensaje = (id: number, persona: typeof yo, texto: string, extra: Record<string, unknown> = {}) => ({
    id, conversacion: 4, tipo: 'texto', persona, texto, aviso: null, respuesta: null, reacciones: { total: {}, mia: null },
    editado: null, borrado: false, noDisponible: false, propio: persona.id === yo.id, idCliente: null, creado: '2026-10-24T09:00:00Z', ...extra
});
const directa = {
    id: 4, tipo: 'directa', titulo: null, persona: ana, web: null, miembros: 2, rol: 'miembro', noLeidos: 2,
    ultimoMensaje: mensaje(8, ana, 'Te dejo el libro mañana'), actividad: '2026-10-24T09:00:00Z', cerrada: false, permisos
};

/** Rutas de la API de Libros que se retiraron con la adhesión (RUTAS_RETIRADAS.md): la web no las pide nunca. */
const RETIRED = [
    /\/chat\//, /\/bandejas\/chat\//, /\/notificaciones/, /\/comunidad\/usuarios/, /\/comunidad\/relaciones\//, /\/comunidad\/amistades\//,
    /\/comunidad\/seguimientos/, /\/comunidad\/bloqueos/, /\/comunidad\/publicaciones(\?|$)/, /\/comunidad\/actividad\//, /\/moderacion\/mi-estado-acceso/,
    /\/moderacion\/mis-incidentes/, /\/moderacion\/politicas\//, /\/moderacion\/alegaciones/, /\/usuarios\/me\/preferencias-interfaz/,
    /\/auth\//, /\/image\/set\/photo/, /\/health\/realtime/
];

function watchRetiredCalls(page: Page): string[] {
    const calls: string[] = [];
    page.on('request', (request: Request) => {
        const url = new URL(request.url());
        // Solo la API de Libros: las rutas `/v1/…` son de la plataforma.
        if (url.pathname.startsWith('/v1/') || url.hostname.includes('cuentas')) return;
        if (RETIRED.some(pattern => pattern.test(url.pathname + url.search))) calls.push(`${request.method()} ${url.pathname}`);
    });
    return calls;
}

test.describe('Lo social con la plataforma (hito 3)', () => {
    test('Web: las webs, la campana y la cuenta van en la cabecera, una sola vez, en escritorio y en compacta', async ({ page }) => {
        const retired = watchRetiredCalls(page);
        await installLocalVisualSession(page, { webPresentation: true });
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/dashboard/books');

        const actions = page.locator('.web-nav__actions');
        await expect(actions.locator('yosi-acceso')).toHaveCount(1);
        await expect(actions.locator('yosi-webs')).toHaveCount(1);
        await expect(actions.locator('yosi-notificaciones')).toHaveCount(1);
        await expect(page.locator('yosi-notificaciones')).toHaveCount(1);
        await expect(page.locator('app-notification-bell')).toHaveCount(0);

        await page.setViewportSize({ width: 390, height: 844 });
        const topbar = page.locator('.web-topbar');
        await expect(topbar.locator('yosi-webs')).toHaveCount(1);
        await expect(topbar.locator('yosi-notificaciones')).toHaveCount(1);
        await expect(page.locator('yosi-notificaciones')).toHaveCount(1);
        expect(retired).toEqual([]);
    });

    test('Wood: la barra lateral lleva la cuenta, las webs y la campana', async ({ page }) => {
        // Sin la presentación Web, el escritorio es Wood (installLocalVisualSession).
        await installLocalVisualSession(page);
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/dashboard/books');

        const sidebar = page.locator('.library-sidebar');
        await expect(sidebar.locator('yosi-acceso')).toHaveCount(1);
        await expect(sidebar.locator('yosi-webs')).toHaveCount(1);
        await expect(sidebar.locator('yosi-notificaciones')).toHaveCount(1);
    });

    test('Mensajes pinta el chat de la plataforma con la interfaz de Libros y escribe en /v1/chat', async ({ page }) => {
        const retired = watchRetiredCalls(page);
        await installLocalVisualSession(page, { webPresentation: true });
        const sent: Array<{ body: Record<string, unknown>; auth: string | undefined }> = [];
        const read: unknown[] = [];
        await page.route('**/v1/chat/conversaciones', route => route.fulfill({ json: { conversaciones: [directa] } }));
        await page.route('**/v1/chat/conversaciones/4', route => route.fulfill({ json: { ...directa, participantes: [{ persona: ana, rol: 'miembro' }, { persona: yo, rol: 'miembro' }] } }));
        await page.route('**/v1/chat/conversaciones/4/leido', route => { read.push(route.request().postDataJSON()); return route.fulfill({ json: { hasta: 8 } }); });
        await page.route('**/v1/chat/conversaciones/4/mensajes?**', route => route.fulfill({ json: {
            mensajes: [mensaje(7, yo, '¿Me lo prestas?'), mensaje(8, ana, 'Te dejo el libro mañana', { reacciones: { total: { '❤️': 1, '🎉': 2 }, mia: null } })],
            cursor: null
        } }));
        await page.route('**/v1/chat/conversaciones/4/mensajes', route => {
            const body = route.request().postDataJSON() as Record<string, unknown>;
            sent.push({ body, auth: route.request().headers()['authorization'] });
            return route.fulfill({ status: 201, json: mensaje(9, yo, String(body['texto']), { idCliente: body['idCliente'] }) });
        });

        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/dashboard/community/messages');
        const thread = page.locator('.inbox__list .thread').first();
        await expect(thread).toContainText('Ana');
        await expect(thread).toContainText('Te dejo el libro mañana');
        await expect(thread.locator('.thread__unread')).toHaveText('2');
        await expect(page.locator('.web-segmented button')).toHaveText(['Todas', 'Directos', 'Clubes', 'Grupos']);

        await thread.click();
        const conversation = page.locator('app-web-chat-conversation-view');
        await expect(conversation.locator('.message')).toHaveCount(2);
        await expect(conversation.locator('.message.is-own')).toContainText('¿Me lo prestas?');
        // Las reacciones de Libros por su emoji y, aparte, las elegidas desde otra web.
        await expect(conversation.locator('.message').nth(1).getByRole('button', { name: 'Me gusta' })).toContainText('1');
        await expect(conversation.locator('.message').nth(1).getByRole('button', { name: 'Reacción 🎉' })).toContainText('2');
        await expect(conversation.getByRole('button', { name: 'Denunciar mensaje' })).toHaveCount(1);

        await conversation.getByRole('textbox', { name: 'Nuevo mensaje' }).fill('Perfecto, gracias');
        await conversation.getByRole('button', { name: 'Enviar' }).click();
        await expect(conversation.locator('.message.is-own').last()).toContainText('Perfecto, gracias');
        expect(sent).toHaveLength(1);
        expect(sent[0].body['texto']).toBe('Perfecto, gracias');
        expect(typeof sent[0].body['idCliente']).toBe('string');
        expect(sent[0].auth).toBe(`Bearer ${SDK_DOUBLE_PLATFORM_TOKEN}`);
        expect(retired).toEqual([]);
    });

    test('Comunidad lleva las personas y las relaciones a la web social con el símbolo del ecosistema', async ({ page }) => {
        const retired = watchRetiredCalls(page);
        await installLocalVisualSession(page, { webPresentation: true });
        await page.route('**/comunidad/resumen', route => route.fulfill({ json: { success: true, Parcial: false, BloquesFallidos: [], Resumen: { Clubes: { Activos: 1 } } } }));
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/dashboard/community/summary');

        const tabs = page.locator('.web-social__tabs');
        await expect(tabs.getByRole('link', { name: 'Personas' })).toHaveAttribute('href', /social\.yosiftware\.es\/\?vista=personas/);
        await expect(tabs.getByRole('link', { name: 'Personas' }).locator('app-yosiftware-mark')).toHaveCount(1);
        await expect(page.locator('.summary__card[target="_blank"]').first()).toHaveAttribute('href', /vista=amistades/);
        // Las rutas antiguas de personas, amistades, bloqueos y muro llevan al resumen.
        await page.goto('/dashboard/community/friendships');
        await expect(page).toHaveURL(/\/dashboard\/community\/summary$/);
        expect(retired).toEqual([]);
    });

    test('Perfil: el de Yosiftware se edita en su vista; Mis peticiones y Mis reportes siguen enlazables', async ({ page }) => {
        const retired = watchRetiredCalls(page);
        await installLocalVisualSession(page, { webPresentation: true });
        await page.setViewportSize({ width: 1440, height: 900 });

        await page.goto('/dashboard/profile?section=profile');
        const panel = page.locator('.web-settings__panel');
        await expect(panel.getByRole('button', { name: 'Editar perfil' })).toBeVisible();
        await expect(panel.locator('a[target="_blank"] app-yosiftware-mark')).toHaveCount(1);
        await expect(panel.locator('input, textarea')).toHaveCount(0);

        await page.goto('/dashboard/profile?section=requests');
        await expect(page.locator('.web-settings__nav button.is-active')).toContainText('Mis peticiones');
        await page.goto('/dashboard/profile?section=reports');
        await expect(page.locator('.web-settings__nav button.is-active')).toContainText('Mis reportes');
        expect(retired).toEqual([]);
    });

    test('Cuenta y seguridad: privacidad y errores con el SDK; normas, moderación, bloqueos y tus datos en la web social', async ({ page }) => {
        const retired = watchRetiredCalls(page);
        await installLocalVisualSession(page, { webPresentation: true });
        await page.setViewportSize({ width: 1440, height: 900 });

        await page.goto('/dashboard/profile?section=security');
        const security = page.locator('app-web-account-security-view');
        await expect(security.locator('yosi-reportar')).toHaveCount(1);
        await security.getByRole('button', { name: 'Privacidad y normas' }).click();
        await expect(security.locator('yosi-privacidad')).toHaveCount(1);
        await expect(security.getByRole('link', { name: /Personas bloqueadas/ })).toHaveAttribute('href', /vista=bloqueos/);
        await security.getByRole('button', { name: 'Tus datos' }).click();
        await expect(security.getByRole('link', { name: /Abrir/ })).toHaveAttribute('href', /vista=cuenta/);
        // Los enlaces antiguos a las normas, la moderación o los bloqueos abren la privacidad.
        await page.goto('/dashboard/profile?section=security&tab=blocks');
        await expect(page.locator('app-web-account-security-view .web-settings__nav button.is-active')).toContainText('Privacidad y normas');
        expect(retired).toEqual([]);
    });
});
