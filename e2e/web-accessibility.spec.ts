import { expect, test } from './fixtures/test';
import AxeBuilder from '@axe-core/playwright';
import { installLocalVisualSession } from './support/local-visual-session';

// Pantallas Web con datos simulados suficientes para auditarlas.
const ROUTES = [
    { path: '/dashboard/books', ready: 'app-web-library-view' },
    { path: '/dashboard/profile', ready: 'app-web-profile-view' },
    { path: '/book/73/chapter/11', ready: 'app-web-chapter-view' },
    { path: '/book/73/statistics', ready: 'app-web-book-statistics-view' },
    { path: '/book/73/notes', ready: 'app-web-book-notes-view' },
    { path: '/book/73/characters', ready: 'app-web-narrative-entity-view' }
] as const;

test.describe('accesibilidad de la presentación Web', () => {
    for (const theme of ['light', 'dark'] as const) {
        test(`sin infracciones críticas ni graves en ${theme === 'light' ? 'claro' : 'oscuro'}`, async ({ page }) => {
            test.setTimeout(120000);
            await installLocalVisualSession(page, { webPresentation: true });
            await page.addInitScript(choice => {
                localStorage.setItem('libros:web-theme:last', choice);
                localStorage.setItem('libros:web-theme:37', choice);
            }, theme);
            await page.route('**/notas/libro/73', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
            await page.setViewportSize({ width: 1440, height: 900 });

            const blocking: string[] = [];
            for (const route of ROUTES) {
                await page.goto(route.path);
                await expect(page.locator(route.ready)).toBeVisible({ timeout: 15000 });
                await page.waitForTimeout(500);
                const audit = await new AxeBuilder({ page }).include('body').exclude('.apexcharts-canvas').analyze();
                for (const violation of audit.violations.filter(item => item.impact === 'critical' || item.impact === 'serious'))
                    for (const node of violation.nodes.slice(0, 5))
                        blocking.push(`${route.path} · ${violation.id} · ${node.target.join(' ')} · ${(node.failureSummary ?? '').replace(/\s+/g, ' ').slice(0, 160)}`);
            }
            // Paleta Ctrl+K abierta sobre el libro, con resultados agrupados.
            await page.keyboard.press('Control+k');
            await expect(page.locator('.palette')).toBeVisible();
            await page.keyboard.type('a');
            const palette = await new AxeBuilder({ page }).include('.palette').analyze();
            for (const violation of palette.violations.filter(item => item.impact === 'critical' || item.impact === 'serious'))
                for (const node of violation.nodes.slice(0, 5))
                    blocking.push(`paleta · ${violation.id} · ${node.target.join(' ')} · ${(node.failureSummary ?? '').replace(/\s+/g, ' ').slice(0, 160)}`);
            await page.keyboard.press('Escape');
            await expect(page.locator('.palette')).toBeHidden();

            expect(blocking, 'La Web no debe introducir infracciones críticas o graves').toEqual([]);
        });
    }

    for (const theme of ['light', 'dark'] as const) {
        test(`zona pública sin infracciones críticas ni graves en ${theme === 'light' ? 'claro' : 'oscuro'}`, async ({ page }) => {
            test.setTimeout(120000);
            await page.addInitScript(choice => localStorage.setItem('libros:web-theme:last', choice), theme);
            await page.route('**/runtime-config', route => route.fulfill({ status: 200, contentType: 'application/json',
                body: JSON.stringify({ success: true, Environment: 'local', QaDatasetVersion: null, RealtimeWsUrl: '', Firebase: { Providers: { Password: true, Google: true, Phone: true } } }) }));
            await page.route('**/auth/session/refresh', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{"success":false}' }));
            await page.setViewportSize({ width: 1440, height: 900 });

            const blocking: string[] = [];
            for (const path of ['/home', '/login', '/register', '/forgot-password', '/reset-password']) {
                await page.goto(path);
                await expect(page.locator('app-web-public-shell')).toBeVisible({ timeout: 15000 });
                const audit = await new AxeBuilder({ page }).include('app-web-public-shell').analyze();
                for (const violation of audit.violations.filter(item => item.impact === 'critical' || item.impact === 'serious'))
                    for (const node of violation.nodes.slice(0, 5))
                        blocking.push(`${path} · ${violation.id} · ${node.target.join(' ')} · ${(node.failureSummary ?? '').replace(/\s+/g, ' ').slice(0, 160)}`);
            }
            expect(blocking, 'La zona pública Web no debe introducir infracciones críticas o graves').toEqual([]);
        });
    }
});
