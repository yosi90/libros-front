import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/test';

test.describe('superficies publicas @smoke', () => {
    test('carga Home y entra con la cuenta de Yosiftware', async ({ page }) => {
        await page.goto('/');

        await expect(page).toHaveTitle('Memoria bibliográfica');
        await expect(page.locator('html')).toHaveAttribute('data-presentation-active', 'web');
        await expect(page.getByRole('heading', { name: 'Cada libro deja una huella.' })).toBeVisible();
        await expect(page.locator('yosi-acceso')).toHaveCount(1);
        await expect(page.locator('yosi-acceso').getByRole('button', { name: 'Entrar' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Crear mi biblioteca/ })).toBeVisible();
        await expect(page.getByRole('button', { name: /Ya tengo cuenta/ })).toBeVisible();
        await expect(page.getByText('Entra con tu cuenta de Yosiftware')).toBeVisible();
        await expect(page.locator('script[src*="/sdk/v1/yosiftware.js"]')).toHaveAttribute('data-estilos', /\/assets\/yosiftware\.css/);
        await expect(page.locator('[data-testid="admin-health"]')).toHaveCount(0);
    });

    test('las rutas del inicio de sesión propio llevan a la portada', async ({ page }) => {
        for (const route of ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/verify-email-pending', '/onboarding']) {
            await page.goto(route);
            await expect(page).toHaveURL(/\/home(?:\?.*)?$/);
            await expect(page.locator('form input[type="password"]')).toHaveCount(0);
        }
    });

    test('conserva la portada Wood cuando el dispositivo la elige en escritorio', async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem('libros:web-theme:last', 'wood'));
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('/');

        await expect(page.locator('html')).toHaveAttribute('data-presentation-active', 'wood');
        await expect(page.getByRole('heading', { name: 'Tu biblioteca, tu memoria.' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Date de alta/ })).toBeVisible();
        await expect(page.locator('yosi-acceso')).toHaveCount(1);
        const brandIcon = page.locator('.home-brand mat-icon');
        await expect(brandIcon).toHaveCount(1);
        await expect(brandIcon).toHaveCSS('overflow', 'visible');
    });

    test('publica y registra la versión PWA actual en Hosting QA', async ({ page, baseURL, browserName }) => {
        test.skip(
            browserName !== 'chromium' || !baseURL?.startsWith('https://qa-libros.yosiftware.es'),
            'El Service Worker se valida en Chromium sobre el Hosting QA canónico.'
        );
        const manifestResponse = await page.request.get(new URL('/ngsw.json', baseURL!).toString());
        expect(manifestResponse.ok()).toBeTruthy();
        expect(manifestResponse.headers()['content-type']).toContain('application/json');
        const manifest = await manifestResponse.json() as { hashTable?: Record<string, string> };
        expect(manifest.hashTable?.['/index.html']).toBeTruthy();

        await page.goto('/');
        await expect.poll(() => page.evaluate(async () =>
            (await navigator.serviceWorker.getRegistration())?.active?.scriptURL ?? null
        ), { timeout: 35_000 }).toContain('/ngsw-worker.js');
    });

    test('mantiene el shell cacheado y explica el estado offline en Hosting QA', async ({ page, baseURL, browserName, expectedConsoleErrors, expectedHttpErrors }) => {
        test.skip(browserName !== 'chromium' || !baseURL?.startsWith('https://qa-libros.yosiftware.es'), 'El recorrido offline se verifica una vez sobre Hosting QA.');
        test.setTimeout(60_000);
        expectedConsoleErrors.push(/net::ERR_INTERNET_DISCONNECTED|Failed to fetch|Load failed/i);
        expectedConsoleErrors.push(/status (?:of )?504.*qa-cuentas(?:-api)?\.yosiftware\.es/i);
        expectedConsoleErrors.push(/status (?:of )?504.*qa-libros\.yosiftware\.es\/assets\/media\/img\/escritorio_home\.png/i);
        expectedHttpErrors.push(/^http 504: https:\/\/qa-libros\.yosiftware\.es\/assets\/media\/img\/escritorio_home\.png(?:\?.*)?$/i);
        await page.goto('/home');
        await expect.poll(() => page.evaluate(async () =>
            (await navigator.serviceWorker.getRegistration())?.active?.scriptURL ?? null
        ), { timeout: 35_000 }).toContain('/ngsw-worker.js');
        await page.reload();
        await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null))
            .toContain('/ngsw-worker.js');

        await page.context().setOffline(true);
        try {
            await page.reload({ waitUntil: 'domcontentloaded' });
            await expect(page.getByRole('heading', { name: 'Cada libro deja una huella.' })).toBeVisible();
            await page.evaluate(() => window.dispatchEvent(new Event('offline')));
            await expect(page.getByRole('heading', { name: 'Estás sin conexión' })).toBeVisible();
            await expect(page.locator('body')).not.toContainText('sincronizada');
        } finally {
            await page.context().setOffline(false);
        }
    });

    test('publica CSP, cabeceras defensivas y CORS exacto en Hosting QA', async ({ page, baseURL, browserName }) => {
        test.skip(browserName !== 'chromium' || !baseURL?.startsWith('https://qa-libros.yosiftware.es'), 'Las cabeceras HTTP se verifican una vez sobre Hosting QA.');
        const documentResponse = await page.request.get(new URL('/', baseURL!).toString());
        const documentHeaders = documentResponse.headers();
        expect(documentHeaders['content-security-policy']).toContain("object-src 'none'");
        expect(documentHeaders['content-security-policy']).toContain('frame-src https://qa-cuentas.yosiftware.es');
        expect(documentHeaders['content-security-policy']).toContain('wss://qa-cuentas-ws.yosiftware.es');
        expect(documentHeaders['x-content-type-options']).toBe('nosniff');
        expect(documentHeaders['referrer-policy']).toBe('strict-origin-when-cross-origin');
        expect(documentHeaders['cross-origin-opener-policy']).toBe('same-origin-allow-popups');
        expect(documentHeaders['cross-origin-embedder-policy']).toBeUndefined();
    });

    test('no registra el worker QA durante la integración local', async ({ page, baseURL }) => {
        test.skip(
            process.env['QA_USE_BUILT_ARTIFACT'] !== 'true' || !baseURL?.startsWith('http://127.0.0.1'),
            'Esta barrera solo corresponde a la build QA servida localmente.'
        );

        await page.goto('/');
        await expect.poll(() => page.evaluate(async () =>
            (await navigator.serviceWorker.getRegistrations()).length
        )).toBe(0);
    });

    test('aplica guards publicos y mantiene una salida para rutas desconocidas', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/home\?volver=%2Fdashboard(?:%2Fbooks)?$/);
        await page.goto('/ruta-que-no-existe');
        await expect(page.getByRole('heading', { name: 'Cada libro deja una huella.' })).toBeVisible();
    });

    for (const route of ['/']) {
        test(`no presenta infracciones automaticas WCAG A/AA en ${route}`, async ({ page }) => {
            await page.goto(route);
            const results = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
                .analyze();

            expect(results.violations.map(violation => ({
                id: violation.id,
                impact: violation.impact,
                targets: violation.nodes.map(node => node.target)
            }))).toEqual([]);
        });
    }
});
