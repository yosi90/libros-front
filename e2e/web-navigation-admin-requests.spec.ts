import { expect, test } from './fixtures/test';
import { installLocalVisualSession } from './support/local-visual-session';

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
