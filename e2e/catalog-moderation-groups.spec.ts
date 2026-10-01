import { expect, test } from './fixtures/test';
import { installLocalVisualSession } from './support/local-visual-session';

for (const mode of [
    { name: 'Web', web: true },
    { name: 'Wood', web: false }
]) {
    test(`moderación agrupada ${mode.name}`, async ({ page }, testInfo) => {
        await installLocalVisualSession(page, { webPresentation: mode.web, admin: true });
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.route('**/catalogo/**', route => route.fulfill({ status: 200, json: [] }));
        await page.route('**/peticiones/catalogo?*', route => route.fulfill({ status: 200, json: [{
            Id: 8, TipoEntidad: 'libro', Accion: 'alta', Estado: 'pendiente',
            Usuario: { Id: 37, Nombre: 'Lector de prueba' }, GrupoISBN: 42, Participantes: 3,
            Payload: { ISBN: '9780306406157', Nombre: 'Obra agrupada' }, FechaCreacion: '2026-09-30T10:00:00Z'
        }] }));
        let resolved = false;
        await page.route('**/peticiones/catalogo/8/resolver', route => {
            resolved = true;
            return route.fulfill({ status: 200, json: { success: true, Id: 8, Estado: 'rechazada', ParticipantesResueltos: 3 } });
        });

        await page.goto('/dashboard/adminpanel?section=catalogRequests');
        await expect(page.getByText('3 participantes en esta petición agrupada')).toBeVisible();
        await page.getByRole('button', { name: 'Rechazar' }).click();
        await expect(page.getByText('Esta decisión rechazará las peticiones pendientes de 3 personas del mismo ISBN.')).toBeVisible();
        expect(resolved).toBe(false);
        await page.screenshot({ path: testInfo.outputPath('grupo-confirmacion.png') });
        await page.getByRole('button', { name: 'Confirmar decisión conjunta' }).click();
        await expect.poll(() => resolved).toBe(true);
    });
}

for (const mode of [{ name: 'Web', web: true }, { name: 'Wood', web: false }]) {
    for (const type of ['libro', 'antologia'] as const) {
        test(`resolver alta ${type} contra obra existente ${mode.name}`, async ({ page, expectedConsoleErrors, expectedHandledHttpErrors }, testInfo) => {
            expectedConsoleErrors.push(/status (?:of )?409.*\/peticiones\/catalogo\/8\/resolver/i);
            await installLocalVisualSession(page, { webPresentation: mode.web, admin: true });
            await page.setViewportSize({ width: 1440, height: 900 });
            const isbn = '9780306406157';
            const target = { Tipo: type, Id: 53, Nombre: 'Obra de destino', Autores: [], Estados: [], Portada: '' };
            const sourceType = type === 'libro' ? 'antologia' : 'libro';
            const source = { Tipo: sourceType, Id: 9, Nombre: 'Ómnibus compartido', Autores: [], Estados: [], Portada: '' };
            await page.route('**/catalogo/**', route => route.fulfill({ status: 200, json: [] }));
            for (const routeType of ['libros', 'antologias']) {
                await page.route(`**/catalogo/${routeType}?*`, route => {
                    const q = new URL(route.request().url()).searchParams.get('q');
                    const isTargetType = routeType === (type === 'libro' ? 'libros' : 'antologias');
                    return route.fulfill({ status: 200, json: q === isbn ? (isTargetType ? [] : [source]) : isTargetType ? [target] : [] });
                });
            }
            await page.route(`**/catalogo/${sourceType === 'libro' ? 'libros' : 'antologias'}/9/ediciones`, route => route.fulfill({
                status: 200, json: { Tipo: sourceType, ObraId: 9, Ediciones: [{ Id: 312, ISBN: isbn, Portada: '', FechaPublicacion: null, EnMiBiblioteca: false }] }
            }));
            let resolved = false;
            await page.route('**/peticiones/catalogo?*', route => route.fulfill({ status: 200, json: resolved ? [] : [{
                Id: 8, TipoEntidad: type, Accion: 'alta', Estado: 'pendiente', ISBN: isbn,
                Usuario: { Id: 37, Nombre: 'Lector de prueba' }, GrupoISBN: 42, Participantes: 3,
                Payload: { ISBN: isbn, Nombre: 'Petición nueva', FechaPublicacion: '2026-08' }
            }] }));
            const submissions: unknown[] = [];
            await page.route('**/peticiones/catalogo/8/resolver', route => {
                expect(route.request().method()).toBe('PATCH');
                submissions.push(route.request().postDataJSON());
                if (submissions.length === 1) {
                    expectedHandledHttpErrors.push({ method: 'PATCH', url: route.request().url(), status: 409,
                        code: 'catalog_request_isbn_conflict', recovery: [{ method: 'PATCH', status: 200 }] });
                    return route.fulfill({ status: 409, json: { error: 'El ISBN pertenece a otra obra', code: 'catalog_request_isbn_conflict' } });
                }
                resolved = true;
                return route.fulfill({ status: 200, json: { success: true, Id: 8, Estado: 'aprobada', EntidadId: 53, EdicionId: 312, ParticipantesResueltos: 3 } });
            });
            await page.goto('/dashboard/adminpanel?section=catalogRequests');
            await page.getByRole('button', { name: 'Elegir obra existente' }).click();
            await expect(page.getByRole('button', { name: 'Aprobar', exact: true })).toBeDisabled();
            await page.getByRole('searchbox', { name: 'Buscar obra existente' }).fill('Destino');
            await page.getByRole('button', { name: 'Buscar obra', exact: true }).click();
            await page.getByRole('button', { name: target.Nombre, exact: true }).click();
            await page.getByRole('button', { name: 'Aprobar', exact: true }).click();
            expect(submissions).toHaveLength(0);
            await expect(page.getByText(/Se asociará el ISBN solicitado a «Obra de destino»/)).toBeVisible();
            await page.getByRole('button', { name: 'Confirmar decisión conjunta' }).click();
            await expect.poll(() => submissions.length).toBe(1);
            expect(submissions[0]).toEqual({ Estado: 'aprobada', Comentario: null, Obra: { ObraId: 53 } });
            await expect(page.getByText('El ISBN pertenece a otra obra', { exact: false }).last()).toBeVisible();
            await page.getByRole('button', { name: 'Consultar edición compartida de este ISBN' }).click();
            await page.getByRole('button', { name: `Compartir ${isbn} · ${source.Nombre}` }).click();
            await page.getByRole('button', { name: 'Aprobar', exact: true }).click();
            await expect(page.getByText(/mediante un vínculo compartido autorizado/)).toBeVisible();
            await page.screenshot({ path: testInfo.outputPath('resolver-obra-existente.png') });
            await page.getByRole('button', { name: 'Confirmar decisión conjunta' }).click();
            await expect.poll(() => submissions.length).toBe(2);
            expect(submissions[1]).toEqual({ Estado: 'aprobada', Comentario: null, Obra: { ObraId: 53, VincularEdicionId: 312 } });
            await expect(page.getByText('No hay peticiones pendientes.')).toBeVisible();
        });
    }
}
