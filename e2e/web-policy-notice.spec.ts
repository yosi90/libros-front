import { expect, test } from './fixtures/test';
import AxeBuilder from '@axe-core/playwright';
import { installLocalVisualSession } from './support/local-visual-session';

// El aviso de normas pendientes sigue el tema Web (no conserva el aspecto Wood).
for (const theme of ['light', 'dark'] as const) {
    test(`el aviso de normas usa la presentación Web en ${theme === 'light' ? 'claro' : 'oscuro'}`, async ({ page, expectedConsoleErrors }) => {
        expectedConsoleErrors.push(/status (?:of )?403/i);
        await page.addInitScript(choice => {
            localStorage.setItem('libros:web-theme:last', choice);
            localStorage.setItem('libros:web-theme:37', choice);
        }, theme);
        await installLocalVisualSession(page, { webPresentation: true });
        await page.route('**/moderacion/mi-estado-acceso', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true, AlcancesActivos: [], Restricciones: [], Sanciones: [],
                Politicas: [{ Tipo: 'creacion', VersionId: 5, Pendiente: true }],
                RequiereLimpiarRealtime: false, AlcancesQueRevocanRealtime: []
            })
        }));
        await page.route('**/notificaciones*', route => route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: 'Normas pendientes', code: 'creation_policy_acceptance_required', debug: { message: 'HTTP 403', requestId: 'e2e' } })
        }));
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/dashboard/books');

        const notice = page.locator('.decision-notice');
        await expect(notice).toBeVisible({ timeout: 15000 });
        const colors = await notice.evaluate(element => ({
            background: getComputedStyle(element).backgroundColor,
            surface: getComputedStyle(document.documentElement).getPropertyValue('--web-color-surface').trim()
        }));
        const probe = await page.evaluate(color => {
            const element = document.createElement('div');
            element.style.color = color;
            document.body.append(element);
            const resolved = getComputedStyle(element).color;
            element.remove();
            return resolved;
        }, colors.surface);
        expect(colors.background).toBe(probe);

        const audit = await new AxeBuilder({ page }).include('.decision-notice').analyze();
        expect(audit.violations.filter(item => item.impact === 'critical' || item.impact === 'serious').map(item => item.id)).toEqual([]);
    });
}
