import { expect, authenticatedIntegrationTest as test } from './fixtures/integration';
import AxeBuilder from '@axe-core/playwright';
import { credentialsFor, loginThroughUi } from './support/auth';
import { fixture } from './support/qa-reset';

const routesByViewport = [
    {
        name: 'compact',
        viewport: { width: 390, height: 844 },
        routes: [
            '/dashboard/books',
            '/dashboard/catalog',
            '/dashboard/profile',
            '/dashboard/account-security',
            '/dashboard/community/summary',
            '/dashboard/community/messages'
        ]
    },
    {
        name: 'medium',
        viewport: { width: 800, height: 900 },
        routes: [
            '/dashboard/books',
            '/dashboard/catalog',
            '/dashboard/community/people',
            '/dashboard/community/friendships',
            '/dashboard/community/clubs',
            '/dashboard/statistics'
        ]
    },
    {
        name: 'desktop',
        viewport: { width: 1440, height: 900 },
        routes: [
            '/dashboard/authors',
            '/dashboard/universes',
            '/dashboard/sagas',
            '/dashboard/anthologies',
            '/dashboard/books/manage'
        ]
    },
    {
        name: 'ultrawide',
        viewport: { width: 2560, height: 1080 },
        routes: [
            '/dashboard/books',
            '/dashboard/catalog',
            '/dashboard/profile',
            '/dashboard/statistics'
        ]
    }
] as const;

test.describe('superficies autenticadas finales @integration @surfaces', () => {
    test.describe('recorridos multipágina', () => {
        // Firefox informa como corrupta una decodificación cancelada cuando page.goto
        // abandona una superficie. La integridad de estos recursos se comprueba aparte.
        test.use({
            expectedConsoleErrors: [
                /Image corrupt or truncated.*qa-api\.yosiftware\.es\/image\/get\/photo\/default\.png/i,
                /Image corrupt or truncated.*qa-libros\.yosiftware\.es\/assets\/media\/img\/fondo_(?:libro|desplegable)\.png/i
            ]
        });

        for (const profile of routesByViewport) {
            test(`${profile.name} conserva las superficies principales sin overflow`, async ({ page, baseURL }) => {
                test.skip(!baseURL?.startsWith('https://qa-libros.yosiftware.es'), 'La restauración autenticada requiere el Hosting QA same-site.');
                test.setTimeout(120_000);
                await page.setViewportSize(profile.viewport);

                for (const route of profile.routes) await assertSurface(page, route, profile.name);
            });
        }

        test('el espacio de libro conserva índice, búsqueda y narrativa adaptable', async ({ page, baseURL, qaFixtures }) => {
            test.skip(!baseURL?.startsWith('https://qa-libros.yosiftware.es'), 'La restauración autenticada requiere el Hosting QA same-site.');
            test.setTimeout(120_000);
            const bookId = fixture(qaFixtures, 'catalog.book-primary').Id;

            for (const profile of [
                { name: 'compact', viewport: { width: 390, height: 844 } },
                { name: 'desktop', viewport: { width: 1440, height: 900 } }
            ] as const) {
                await page.setViewportSize(profile.viewport);
                for (const route of [
                    `/book/${bookId}/statistics`,
                    `/book/${bookId}/search`,
                    `/book/${bookId}/characters`,
                    `/book/${bookId}/organizations`,
                    `/book/${bookId}/events`,
                    `/book/${bookId}/locations`,
                    `/book/${bookId}/concepts`,
                    `/book/${bookId}/quotes`
                ]) await assertSurface(page, route, profile.name);
            }
        });
    });

    test('los recursos visuales conocidos se descargan y decodifican completos', async ({ page, baseURL }) => {
        test.skip(!baseURL?.startsWith('https://qa-libros.yosiftware.es'), 'La comprobación requiere los recursos del Hosting QA.');
        await page.goto('/home');
        const results = await page.evaluate(async resources => Promise.all(resources.map(source => new Promise<{ source: string; width: number; height: number }>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve({ source, width: image.naturalWidth, height: image.naturalHeight });
            image.onerror = () => reject(new Error(`No se pudo decodificar ${source}`));
            image.src = source;
        }))), [
            '/assets/media/img/fondo_libro.png',
            '/assets/media/img/fondo_desplegable.png',
            'https://qa-api.yosiftware.es/image/get/photo/default.png'
        ]);

        expect(results.every(result => result.width > 0 && result.height > 0)).toBe(true);
    });

    test('administración exige rol y capacidad de escritorio', async ({ browser, baseURL, qaFixtures }) => {
        test.skip(!baseURL?.startsWith('https://qa-libros.yosiftware.es'), 'La restauración autenticada requiere el Hosting QA same-site.');
        test.setTimeout(90_000);

        const credentials = credentialsFor('admin', qaFixtures);
        expect(credentials, 'Faltan las credenciales QA de admin.').not.toBeNull();
        const admin = await browser.newContext({
            baseURL,
            serviceWorkers: 'block',
            storageState: { cookies: [], origins: [] },
            viewport: { width: 1440, height: 900 }
        });
        try {
            const page = await admin.newPage();
            await loginThroughUi(page, credentials!);

            await page.setViewportSize({ width: 390, height: 844 });
            await page.goto('/dashboard/adminpanel');
            await expect(page).toHaveURL(/\/dashboard\/books(?:[?#]|$)/);
            await expect(page.locator('app-books')).toBeVisible({ timeout: 30_000 });

            await page.setViewportSize({ width: 1440, height: 900 });
            await page.goto('/dashboard/adminpanel');
            await expect(page).toHaveURL(/\/dashboard\/adminpanel(?:[?#]|$)/);
            await expect(page.locator('app-adminpanel')).toBeVisible({ timeout: 30_000 });
            await expectNoHorizontalOverflow(page);
        } finally {
            await admin.close();
        }
    });

    test('la sesión restaurada no deja credenciales en Web Storage', async ({ page, baseURL }) => {
        test.skip(!baseURL?.startsWith('https://qa-libros.yosiftware.es'), 'La restauración autenticada requiere el Hosting QA same-site.');
        await page.goto('/dashboard/books');
        await expect(page).toHaveURL(/\/dashboard\/books(?:[?#]|$)/);

        const storage = await page.evaluate(() => ({
            local: Object.fromEntries(Object.entries(localStorage)),
            session: Object.fromEntries(Object.entries(sessionStorage))
        }));
        const serialized = JSON.stringify(storage);
        expect(serialized).not.toMatch(/(?:access|custom|firebase|id|refresh)[-_ ]?token|bearer\s+[a-z0-9._-]+/i);
        expect(Object.keys(storage.local)).not.toContain('jwt');
        expect(Object.keys(storage.local)).not.toContain('refresh');
    });

    for (const surface of [
        { name: 'biblioteca compact', viewport: { width: 390, height: 844 }, route: () => '/dashboard/books' },
        { name: 'estadísticas de libro compact', viewport: { width: 390, height: 844 }, route: (bookId: number) => `/book/${bookId}/statistics` },
        { name: 'seguridad desktop', viewport: { width: 1440, height: 900 }, route: () => '/dashboard/account-security' },
        { name: 'comunidad desktop', viewport: { width: 1440, height: 900 }, route: () => '/dashboard/community/summary' }
    ]) {
        test(`${surface.name} no presenta infracciones WCAG A/AA automáticas`, async ({ page, baseURL, qaFixtures }) => {
            test.skip(!baseURL?.startsWith('https://qa-libros.yosiftware.es'), 'La restauración autenticada requiere el Hosting QA same-site.');
            test.setTimeout(60_000);
            const route = surface.route(fixture(qaFixtures, 'catalog.book-primary').Id);
            await page.setViewportSize(surface.viewport);
            await assertSurface(page, route, surface.viewport.width > 1050 ? 'desktop' : surface.viewport.width >= 600 ? 'medium' : 'compact');
            const results = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
                .analyze();
            expect(results.violations.map(violation => ({
                route,
                id: violation.id,
                impact: violation.impact,
                targets: violation.nodes.map(node => node.target)
            }))).toEqual([]);
        });
    }
});

async function assertSurface(page: import('@playwright/test').Page, route: string, expectedMode: string): Promise<void> {
    const responses: Array<{ method: string; status: number; path: string }> = [];
    const observeResponse = (response: import('@playwright/test').Response): void => {
        const url = new URL(response.url());
        if (/\/(?:auth\/session|libros)(?:\/|$)/.test(url.pathname))
            responses.push({ method: response.request().method(), status: response.status(), path: url.pathname });
    };
    page.on('response', observeResponse);
    try {
        await page.goto(route);
        await expect(page).toHaveURL(new RegExp(`${escapeRegex(route)}(?:[?#]|$)`));
        await expect(page.locator('body')).not.toContainText('Iniciar sesión');
        await expect(page.locator('.dragon-loader')).toBeHidden({ timeout: 30_000 });
        const routeHost = expectedRouteHost(route);
        if (routeHost) await expect(page.locator(routeHost)).toBeVisible({ timeout: 30_000 });
        await expect(page.locator('.dragon-loader')).toBeHidden({ timeout: 30_000 });
        await page.waitForFunction(() => Array.from(document.images).every(image => image.complete), undefined, { timeout: 30_000 });
        await expect(page.locator('html')).toHaveAttribute('data-layout-mode', expectedMode === 'ultrawide' ? 'desktop' : expectedMode);
        await expectNoHorizontalOverflow(page);
    } catch (error) {
        const documentState = await page.evaluate(() => ({
            url: location.href,
            title: document.title,
            layout: document.documentElement.getAttribute('data-layout-mode'),
            appHosts: [...new Set(Array.from(document.querySelectorAll('*'))
                .map(element => element.tagName.toLowerCase())
                .filter(tag => tag.startsWith('app-')))],
            routerOutlets: document.querySelectorAll('router-outlet').length,
            alerts: Array.from(document.querySelectorAll('[role="alert"]')).map(element => element.textContent?.trim()).filter(Boolean)
        }));
        console.log(`[surface-diagnostic] ${JSON.stringify({ route, documentState, responses })}`);
        throw error;
    } finally {
        page.off('response', observeResponse);
    }
}

function expectedRouteHost(route: string): string | null {
    if (/\/dashboard\/books(?:[?#]|$)/.test(route)) return 'app-books';
    if (/\/dashboard\/catalog(?:[?#]|$)/.test(route)) return 'app-catalog';
    if (/\/dashboard\/profile(?:[?#]|$)/.test(route)) return 'app-user-profile';
    if (/\/dashboard\/account-security(?:[?#]|$)/.test(route)) return 'app-account-security';
    if (/\/dashboard\/statistics(?:[?#]|$)/.test(route)) return 'app-statistics';
    if (/\/dashboard\/(?:authors|universes|sagas|anthologies|books\/manage)(?:[?#]|$)/.test(route)) return 'app-object-manager';
    if (/\/dashboard\/community\/summary(?:[?#]|$)/.test(route)) return 'app-social-summary';
    if (/\/dashboard\/community\/(?:people|clubs)(?:[?#]|$)/.test(route)) return 'app-community';
    if (/\/dashboard\/community\/friendships(?:[?#]|$)/.test(route)) return 'app-community-relationships';
    if (/\/dashboard\/community\/messages(?:[?#]|$)/.test(route)) return 'app-chat';
    if (/\/book\/\d+\/statistics(?:[?#]|$)/.test(route)) return 'app-book-statistics';
    if (/\/book\/\d+\/search(?:[?#]|$)/.test(route)) return 'app-book-advanced-search';
    if (/\/book\/\d+\/(?:characters|organizations|events|locations|concepts|quotes)(?:[?#]|$)/.test(route))
        return 'app-narrative-entity-placeholder';
    return null;
}

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page): Promise<void> {
    const overflow = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        body: document.body.scrollWidth - document.body.clientWidth
    }));
    expect(overflow.document).toBeLessThanOrEqual(1);
    expect(overflow.body).toBeLessThanOrEqual(1);
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
