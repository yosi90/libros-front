import { expect, test } from './fixtures/test';
import { installLocalVisualSession } from './support/local-visual-session';

test('la petición de libro admite el año y envía la sinopsis separada del comentario', async ({ page }) => {
    await installLocalVisualSession(page, { webPresentation: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/catalogo/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    let submitted: Record<string, unknown> | null = null;
    await page.route('**/peticiones/catalogo', async route => {
        submitted = route.request().postDataJSON();
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, Id: 91, Estado: 'pendiente' }) });
    });
    await page.goto('/dashboard/catalog');
    await page.getByRole('button', { name: 'Pedir un libro' }).first().click();
    const modal = page.locator('.catalog-modal--request');
    await modal.getByRole('textbox', { name: 'Nombre' }).fill('La guardia del fin');
    await modal.getByRole('textbox', { name: 'Fecha de publicación' }).fill('2008');
    await modal.getByRole('textbox', { name: 'Sinopsis (opcional)' }).fill('La Guardia se prepara para una guerra.');
    await modal.getByRole('button', { name: 'Enviar' }).click();
    await expect.poll(() => submitted).toMatchObject({
        TipoEntidad: 'libro',
        Payload: { Nombre: 'La guardia del fin', FechaPublicacion: '2008', Sinopsis: 'La Guardia se prepara para una guerra.' }
    });
});

test('Mis peticiones muestra el nombre primero y el texto largo a ancho de lectura', async ({ page }) => {
    await installLocalVisualSession(page, { webPresentation: true });
    await page.setViewportSize({ width: 1125, height: 900 });
    await page.route('**/peticiones/catalogo/mias**', route => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify([{
            Id: 91, TipoEntidad: 'libro', Accion: 'alta', Estado: 'pendiente', FechaCreacion: '2026-09-29T13:19:00Z',
            Payload: {
                Comentario: 'La Guardia se prepara para una guerra. '.repeat(12),
                FechaPublicacion: '2008', ISBN: '9788419260628', Nombre: 'El regreso de la guardia carmesí',
                Sinopsis: 'Una antigua oposición amenaza al Imperio. '.repeat(10)
            }
        }])
    }));
    await page.goto('/dashboard/profile?section=requests');
    const document = page.locator('.document').first();
    await expect(document).toBeVisible();
    const fields = document.locator('dl > div');
    await expect(fields.first().locator('dt')).toHaveText('Nombre');
    const synopsis = fields.filter({ has: page.locator('dt', { hasText: 'Sinopsis' }) });
    const comment = fields.filter({ has: page.locator('dt', { hasText: 'Comentario del usuario' }) });
    await expect(synopsis).toHaveClass(/document__field--wide/);
    await expect(comment).toHaveClass(/document__field--wide/);
    const documentBox = await document.boundingBox();
    const synopsisBox = await synopsis.boundingBox();
    expect(synopsisBox!.width).toBeGreaterThan(documentBox!.width * 0.8);
});
