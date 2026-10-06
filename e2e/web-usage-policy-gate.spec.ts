import { Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import { installLocalVisualSession } from './support/local-visual-session';

// Las normas de uso bloquean casi toda la app: el aviso debe salir al entrar, sin esperar a un 403.
async function pendingUsagePolicy(page: Page): Promise<void> {
    await installLocalVisualSession(page, { webPresentation: true });
    await page.route('**/moderacion/mi-estado-acceso', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            success: true, AlcancesActivos: [], Restricciones: [], Sanciones: [],
            Politicas: [{ Tipo: 'uso', VersionId: 9, Pendiente: true }],
            RequiereLimpiarRealtime: false, AlcancesQueRevocanRealtime: []
        })
    }));
    await page.setViewportSize({ width: 1440, height: 900 });
}

test('avisa de las normas de uso pendientes nada más entrar', async ({ page }) => {
    await pendingUsagePolicy(page);
    await page.goto('/dashboard/books');

    const notice = page.locator('.decision-notice');
    await expect(notice).toBeVisible({ timeout: 15000 });
    await expect(notice).toContainText('Normas de comunidad pendientes');

    await notice.getByRole('button', { name: 'Revisar ahora' }).click();
    // Web redirige la sección de cuenta al Perfil.
    await expect(page).toHaveURL(/\/dashboard\/profile\?section=security&tab=policies/);
    await expect(notice).toHaveCount(0);
});

test('no tapa la sección donde se aceptan las normas', async ({ page }) => {
    await pendingUsagePolicy(page);
    const access = page.waitForResponse('**/moderacion/mi-estado-acceso');
    await page.goto('/dashboard/account-security?section=policies');
    await access;
    await expect(page).toHaveURL(/tab=policies/);
    await page.waitForTimeout(1000);
    await expect(page.locator('.decision-notice')).toHaveCount(0);
});

async function activeRealtime(page: Page): Promise<void> {
    await page.route('**/chat/conversaciones*', route => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, Conversaciones: [] })
    }));
    await page.route('**/verify', route => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, Componentes: { realtimeGateway: { Estado: 'healthy' } } })
    }));
    await page.route('**/comunidad/capacidades', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            success: true, UsuarioId: 37, VersionConfiguracion: 1, VersionCliente: '1.0.0', FechaExpiracion: null, CacheTtlSegundos: 300, Conservadora: false,
            Capacidades: Object.fromEntries(['sanciones', 'realtime', 'notificaciones', 'feed', 'chat', 'clubes'].map(id => [id, { Activa: true, VersionMinima: null }]))
        })
    }));
}

test('con normas de uso pendientes no se piden tickets ni token Firebase, ni se avisa de conexión', async ({ page, expectedConsoleErrors }) => {
    expectedConsoleErrors.push(/status (?:of )?403/i);
    await pendingUsagePolicy(page);
    await activeRealtime(page);
    const suspended: string[] = [];
    await page.route(/\/(?:chat\/(?:comunidad-)?ws-ticket|auth\/firebase-custom-token)$/, route => {
        suspended.push(new URL(route.request().url()).pathname);
        return route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: 'Normas pendientes', code: 'usage_policy_acceptance_required' })
        });
    });
    await page.goto('/dashboard/books');
    await expect(page.locator('.decision-notice')).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(4000);
    await expect(page.locator('.library-connection')).toHaveCount(0);
    expect(suspended).toEqual([]);
});

test('al aceptar las normas se relanza una vez el arranque aplazado', async ({ page, expectedConsoleErrors }) => {
    expectedConsoleErrors.push(/status (?:of )?403/i);
    await installLocalVisualSession(page, { webPresentation: true });
    await activeRealtime(page);
    let accepted = false;
    await page.route('**/moderacion/mi-estado-acceso', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            success: true, AlcancesActivos: [], Restricciones: [], Sanciones: [],
            Politicas: [{ Tipo: 'uso', VersionId: 3, Pendiente: !accepted }],
            RequiereLimpiarRealtime: false, AlcancesQueRevocanRealtime: []
        })
    }));
    await page.route('**/moderacion/politicas/*/activa', route => {
        const kind = new URL(route.request().url()).pathname.split('/').at(-2);
        return route.fulfill(kind === 'uso'
            ? { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, Politica: { Tipo: 'uso', Version: 3, Titulo: 'Normas de uso v3', Markdown: 'Texto de prueba', FechaPublicacion: '2026-10-06', Aceptada: accepted } }) }
            : { status: 404, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'Sin norma', code: 'active_policy_not_found' }) });
    });
    await page.route('**/moderacion/politicas/uso/aceptar', route => {
        accepted = true;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, Tipo: 'uso', VersionId: 3 }) });
    });
    const started: string[] = [];
    await page.route(/\/(?:chat\/(?:comunidad-)?ws-ticket|auth\/firebase-custom-token)$/, route => {
        started.push(new URL(route.request().url()).pathname.replace(/^.*\/(chat|auth)\//, '$1/'));
        // Basta con saber que se piden; un 503 mantiene la prueba sin sockets reales.
        return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'Prueba', code: 'e2e' }) });
    });
    expectedConsoleErrors.push(/status (?:of )?503/i, /status (?:of )?404/i);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard/books');

    const notice = page.locator('.decision-notice');
    await expect(notice).toBeVisible({ timeout: 15000 });
    await notice.getByRole('button', { name: 'Revisar ahora' }).click();
    // Firebase está desactivado en la sesión local; su relanzamiento lo cubren las pruebas de SessionService.
    expect(started).toEqual([]);
    await page.getByRole('button', { name: 'Aceptar norma' }).click();

    await expect.poll(() => started.some(path => path.endsWith('ws-ticket')), { timeout: 10000 }).toBe(true);
});

test('un fallo real de red sí avisa de la conexión', async ({ page, expectedConsoleErrors }) => {
    expectedConsoleErrors.push(/ws-ticket|ERR_FAILED|NetworkError|status (?:of )?0/i);
    await installLocalVisualSession(page, { webPresentation: true });
    await activeRealtime(page);
    await page.route('**/chat/*ws-ticket', route => route.abort('failed'));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard/books');

    await expect(page.locator('.library-connection')).toBeVisible({ timeout: 15000 });
});
