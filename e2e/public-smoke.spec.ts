import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/test';

test.describe('superficies publicas @smoke', () => {
    test('carga Home y expone las dos rutas de acceso', async ({ page }) => {
        await page.goto('/');

        await expect(page).toHaveTitle('Memoria bibliográfica');
        await expect(page.getByRole('heading', { name: 'Tu biblioteca, tu memoria.' })).toBeVisible();
        await expect(page.getByRole('link', { name: /Date de alta/ })).toHaveAttribute('href', '/register');
        await expect(page.getByRole('link', { name: /Inicia sesión/ })).toHaveAttribute('href', '/login');
        await expect(page.locator('[data-testid="admin-health"]')).toHaveCount(0);

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
        expectedConsoleErrors.push(/status (?:of )?504.*qa-api\.yosiftware\.es\/(?:runtime-config|auth\/session\/csrf)/i);
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
            await expect(page.getByRole('heading', { name: 'Tu biblioteca, tu memoria.' })).toBeVisible();
            await page.evaluate(() => window.dispatchEvent(new Event('offline')));
            await expect(page.getByRole('heading', { name: 'Estás sin conexión' })).toBeVisible();
            await expect(page.locator('body')).not.toContainText('sincronizada');
        } finally {
            await page.context().setOffline(false);
        }
    });

    test('deja el handler OAuth de Firebase fuera de la navegación SPA', async ({ browser, baseURL }) => {
        test.skip(!baseURL?.startsWith('https://qa-libros.yosiftware.es'), 'El handler reservado solo se valida sobre el Hosting QA canónico.');
        const context = await browser.newContext();
        try {
            const page = await context.newPage();
            const response = await page.goto('/__/auth/handler', { waitUntil: 'domcontentloaded' });
            expect(response?.status()).toBe(200);
            expect(page.url()).toContain('/__/auth/handler');
            await expect(page.locator('script[src*="handler.js"]')).toHaveCount(1);
            await expect(page.locator('app-root')).toHaveCount(0);
        } finally {
            await context.close();
        }
    });

    test('publica CSP, cabeceras defensivas y CORS exacto en Hosting QA', async ({ page, baseURL, browserName }) => {
        test.skip(browserName !== 'chromium' || !baseURL?.startsWith('https://qa-libros.yosiftware.es'), 'Las cabeceras HTTP se verifican una vez sobre Hosting QA.');
        const documentResponse = await page.request.get(new URL('/', baseURL!).toString());
        const documentHeaders = documentResponse.headers();
        expect(documentHeaders['content-security-policy']).toContain("object-src 'none'");
        expect(documentHeaders['x-content-type-options']).toBe('nosniff');
        expect(documentHeaders['referrer-policy']).toBe('strict-origin-when-cross-origin');
        expect(documentHeaders['cross-origin-opener-policy']).toBe('same-origin-allow-popups');

        const runtimeResponsePromise = page.waitForResponse(response => response.url().endsWith('/runtime-config'));
        await page.goto('/login');
        const runtimeResponse = await runtimeResponsePromise;
        expect(runtimeResponse.ok()).toBeTruthy();
        expect(runtimeResponse.headers()['access-control-allow-origin']).toBe(new URL(baseURL!).origin);
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

    test('mantiene accesible el formulario de login y sus enlaces', async ({ page }) => {
        await page.goto('/login');

        await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();
        await expect(page.getByLabel('Correo electrónico')).toBeVisible();
        await expect(page.getByLabel('Introduce tu contraseña')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeDisabled();
        await expect(page.getByText('Olvidé mi contraseña')).toBeVisible();
        await expect(page.getByText('¿No tienes cuenta? Regístrate aquí')).toBeVisible();
    });

    test('valida las rutas publicas de cuenta sin depender del correo real', async ({ page }) => {
        await page.goto('/register');
        await expect(page.getByRole('heading', { name: 'Crea tu biblioteca' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Confirmar registro/ })).toBeDisabled();
        await page.getByLabel('Alias de usuario').fill('qa_lector');
        await page.getByLabel('Correo electrónico').fill('qa@example.test');
        await page.getByLabel('Introduce tu contraseña').fill('Segura123!');
        await expect(page.getByRole('button', { name: /Confirmar registro/ })).toBeEnabled();

        await page.goto('/forgot-password');
        await expect(page.getByRole('heading', { name: 'Recuperar contraseña' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Enviar instrucciones/ })).toBeDisabled();

        await page.goto('/reset-password');
        await expect(page.getByRole('heading', { name: 'Recuperación completada' })).toBeVisible();
        await expect(page.getByRole('main').getByRole('link', { name: 'Volver a iniciar sesión' })).toHaveAttribute('href', '/login');
    });

    test('muestra solo los proveedores habilitados por runtime', async ({ page }) => {
        await page.route('**/runtime-config', route => route.fulfill({ status: 200, json: {
            success: true,
            Environment: 'qa',
            QaDatasetVersion: 'test',
            RealtimeWsUrl: 'wss://example.test/ws',
            Firebase: {
                ApiKey: 'test-key', AuthDomain: 'qa-libros.yosiftware.es', ProjectId: 'libros-qa',
                StorageBucket: 'libros-qa.firebasestorage.app', MessagingSenderId: '1', AppId: '1:test:web:test',
                DatabaseURL: 'https://libros-qa-default-rtdb.europe-west1.firebasedatabase.app',
                Providers: { Password: true, Google: true, Phone: true }, PhoneTestingMode: true
            }
        } }));
        await page.goto('/login');

        await expect(page.getByRole('button', { name: /Google/i })).toBeVisible();
        await expect(page.getByText('Acceder con teléfono')).toBeVisible();
    });

    test('mantiene utilizables los proveedores en el ancho medium de 800 px', async ({ page, baseURL }) => {
        await page.setViewportSize({ width: 800, height: 900 });
        if (!baseURL?.startsWith('https://qa-libros.yosiftware.es')) {
            await page.route('**/runtime-config', route => route.fulfill({ status: 200, json: {
                success: true,
                Environment: 'qa',
                QaDatasetVersion: 'test',
                RealtimeWsUrl: 'wss://example.test/ws',
                Firebase: {
                    ApiKey: 'test-key', AuthDomain: 'qa-libros.yosiftware.es', ProjectId: 'libros-qa',
                    StorageBucket: 'libros-qa.firebasestorage.app', MessagingSenderId: '1', AppId: '1:test:web:test',
                    DatabaseURL: 'https://libros-qa-default-rtdb.europe-west1.firebasedatabase.app',
                    Providers: { Password: true, Google: true, Phone: true }, PhoneTestingMode: true
                }
            } }));
        }

        await page.goto('/login');

        await expect(page.getByRole('button', { name: /Google/i })).toBeVisible();
        await expect(page.getByText('Acceder con teléfono')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
    });

    test('trata igual la respuesta controlada de recuperacion y no revela cuentas', async ({ page, expectedConsoleErrors }) => {
        expectedConsoleErrors.push(/server responded with a status of 400/i);
        await page.route('**/v1/accounts:sendOobCode?*', route => route.fulfill({
            status: 400,
            json: { error: { code: 400, message: 'EMAIL_NOT_FOUND' } }
        }));
        await page.goto('/forgot-password');
        await page.getByLabel('Correo electrónico').fill('inexistente@example.test');
        await page.getByRole('button', { name: /Enviar instrucciones/ }).click();

        await expect(page).toHaveURL(/\/login\?resetRequested=true$/);
        await expect(page.getByText('Si el correo existe, recibirás instrucciones para recuperar la contraseña.')).toBeVisible();
    });

    test('aplica guards publicos y mantiene una salida para rutas desconocidas', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/home$/);
        await page.goto('/ruta-que-no-existe');
        await expect(page.getByRole('heading', { name: 'Tu biblioteca, tu memoria.' })).toBeVisible();
    });

    for (const route of ['/', '/login', '/register', '/forgot-password', '/reset-password']) {
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
