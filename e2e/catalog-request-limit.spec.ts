import { expect, test } from './fixtures/test';
import { installLocalVisualSession } from './support/local-visual-session';

for (const mode of [
    { name: 'Web escritorio', web: true, width: 1440 },
    { name: 'Web compacta', web: true, width: 390 },
    { name: 'Wood', web: false, width: 1440 }
]) {
    test(`cuota de peticiones y recuperacion en ${mode.name}`, async ({ page, expectedConsoleErrors, expectedHandledHttpErrors }, testInfo) => {
        await installLocalVisualSession(page, { webPresentation: mode.web });
        await page.setViewportSize({ width: mode.width, height: 900 });
        await page.route('**/catalogo/**', route => route.fulfill({ status: 200, json: [] }));
        await page.route('**/peticiones/catalogo/mias?*', route => route.fulfill({ status: 200, json:
            Array.from({ length: 5 }, (_, Id) => ({ Id, Estado: Id === 4 ? 'devuelta' : 'pendiente' }))
        }));
        let reject = true;
        let submissions = 0;
        expectedConsoleErrors.push(/status (?:of )?409.*\/peticiones\/catalogo/i);
        await page.route('**/peticiones/catalogo', route => {
            submissions++;
            if (reject) {
                expectedHandledHttpErrors.push({ method: 'POST', url: route.request().url(), status: 409,
                    code: 'catalog_active_request_limit', recovery: [{ method: 'POST', status: 200 }] });
                return route.fulfill({ status: 409, json: {
                    success: false, code: 'catalog_active_request_limit', error: 'Ya tienes cinco peticiones activas.'
                } });
            }
            return route.fulfill({ status: 200, json: { success: true, Id: 2, Estado: 'pendiente' } });
        });
        await page.goto('/dashboard/catalog?request=libro');
        const modal = page.locator('.catalog-modal--request');
        await expect(modal.getByText('5 de 5 peticiones activas')).toBeVisible();
        await modal.getByRole('textbox', { name: 'Nombre', exact: true }).fill('La propuesta guardada');
        await modal.getByRole('textbox', { name: /ISBN/ }).fill('9780306406157');
        await modal.screenshot({ path: testInfo.outputPath('cuota-peticiones.png') });
        await modal.getByRole('button', { name: 'Enviar', exact: true }).click();
        await expect(modal.getByRole('alert')).toContainText('Ya tienes cinco peticiones activas.');
        await expect(modal.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveValue('La propuesta guardada');
        reject = false;
        await modal.getByRole('button', { name: 'Enviar', exact: true }).click();
        await expect(modal).toBeHidden();
        expect(submissions).toBe(2);
    });
}
