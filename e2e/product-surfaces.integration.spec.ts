import { expect, integrationTest as test } from './fixtures/integration';
import AxeBuilder from '@axe-core/playwright';
import { authStatePath } from './support/auth';
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

    test('administración exige rol y capacidad de escritorio', async ({ browser, baseURL }, testInfo) => {
        test.skip(!baseURL?.startsWith('https://qa-libros.yosiftware.es'), 'La restauración autenticada requiere el Hosting QA same-site.');
        test.setTimeout(90_000);

        const compact = await browser.newContext({
            storageState: authStatePath('admin', testInfo.project.name),
            viewport: { width: 390, height: 844 }
        });
        const desktop = await browser.newContext({
            storageState: authStatePath('admin', testInfo.project.name),
            viewport: { width: 1440, height: 900 }
        });
        try {
            const compactPage = await compact.newPage();
            await compactPage.goto('/dashboard/adminpanel');
            await expect(compactPage).toHaveURL(/\/dashboard\/books(?:[?#]|$)/);

            const desktopPage = await desktop.newPage();
            await desktopPage.goto('/dashboard/adminpanel');
            await expect(desktopPage).toHaveURL(/\/dashboard\/adminpanel(?:[?#]|$)/);
            await expect(desktopPage.locator('.dragon-loader')).toBeHidden({ timeout: 30_000 });
            await expectNoHorizontalOverflow(desktopPage);
        } finally {
            await compact.close();
            await desktop.close();
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
            await page.goto(route);
            await expect(page.locator('.dragon-loader')).toBeHidden({ timeout: 30_000 });
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
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`${escapeRegex(route)}(?:[?#]|$)`));
    await expect(page.locator('body')).not.toContainText('Iniciar sesión');
    await expect(page.locator('.dragon-loader')).toBeHidden({ timeout: 30_000 });
    const routeHost = expectedRouteHost(route);
    if (routeHost) await expect(page.locator(routeHost)).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('html')).toHaveAttribute('data-layout-mode', expectedMode === 'ultrawide' ? 'desktop' : expectedMode);
    await expectNoHorizontalOverflow(page);
}

function expectedRouteHost(route: string): string | null {
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
