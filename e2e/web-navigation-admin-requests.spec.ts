import { expect, test } from './fixtures/test';
import { installLocalVisualSession } from './support/local-visual-session';

for (const theme of ['light', 'dark'] as const) {
    test(`Web ${theme}: Notificaciones forma parte de la navegación plegable`, async ({ page }) => {
        await installLocalVisualSession(page, { webPresentation: true });
        await page.addInitScript(value => {
            localStorage.setItem('libros:web-theme:last', value);
            localStorage.setItem('libros:web-theme:37', value);
        }, theme);
        if (theme === 'dark') await page.setViewportSize({ width: 3440, height: 1440 });
        await page.route('**/comunidad/capacidades', route => route.fulfill({
            status: 200, contentType: 'application/json', body: JSON.stringify({
                success: true, UsuarioId: 37, Conservadora: false,
                Capacidades: Object.fromEntries(['sanciones', 'realtime', 'notificaciones', 'feed', 'chat', 'clubes']
                    .map(id => [id, { Activa: id === 'notificaciones', VersionMinima: null }]))
            })
        }));
        await page.goto('/dashboard/books');
        const nav = page.locator('.web-nav');
        const bell = nav.locator('.web-nav__bell');
        await expect(bell.getByRole('button', { name: 'Abrir notificaciones' })).toBeVisible();
        await expect(bell.locator('.notification-bell__label')).toBeVisible();
        await expect(page.locator('.web-corner-bell')).toHaveCount(0);
        if (theme === 'dark') {
            await expect(page.locator('html')).toHaveAttribute('data-ultrawide', 'true');
            const navBox = await nav.boundingBox();
            const bellBox = await bell.boundingBox();
            expect(navBox).not.toBeNull();
            expect(bellBox).not.toBeNull();
            expect(bellBox!.x).toBeGreaterThanOrEqual(navBox!.x);
            expect(bellBox!.x + bellBox!.width).toBeLessThanOrEqual(navBox!.x + navBox!.width);
        }

        await nav.getByRole('button', { name: 'Contraer navegación' }).click();
        await expect(nav).toHaveClass(/is-collapsed/);
        await expect(bell.locator('.notification-bell__label')).toBeHidden();
        await expect(bell.getByRole('button', { name: 'Abrir notificaciones' })).toBeVisible();

        await page.setViewportSize({ width: 390, height: 844 });
        await expect(page.locator('.web-topbar__bell').getByRole('button', { name: 'Abrir notificaciones' })).toBeVisible();
    });
}

test('Administración muestra una petición pendiente con detalles y sigue respondiendo', async ({ page }) => {
    await installLocalVisualSession(page, { webPresentation: true, admin: true });
    await page.route('**/peticiones/catalogo?**', route => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify([{
            Id: 91, Usuario: { Id: 12, Nombre: 'Lectora' }, TipoEntidad: 'libro', Accion: 'alta',
            Estado: 'pendiente', FechaCreacion: '2026-09-28T12:00:00Z',
            Payload: { Nombre: 'La isla de las palabras', Autores: [{ Nombre: 'Ana', Pais: 'España' }], Comentario: 'Falta en el catálogo' }
        }])
    }));
    await page.goto('/dashboard/adminpanel?section=catalogRequests');
    const request = page.locator('app-catalog-moderation .request-row');
    await expect(request).toHaveCount(1, { timeout: 15000 });
    await expect(request).toContainText('La isla de las palabras');
    await expect(request).toContainText('Falta en el catálogo');
    await page.getByRole('button', { name: /Gestión de usuarios/ }).click();
    await expect(page.locator('app-all-users')).toBeVisible();
    await page.getByRole('button', { name: /Peticiones de catálogo/ }).click();
    await expect(request).toHaveCount(1);
});
