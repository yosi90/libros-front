import { expect, test } from './fixtures/test';

const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
const TEXTURE_VARIABLES = [
    '--app-texture-home',
    '--app-texture-login',
    '--app-texture-menu',
    '--app-texture-router',
    '--app-texture-dropdown',
    '--app-texture-book'
];

test.describe('matriz responsive pública @matrix @responsive', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem('book-front:mobile-presentation-preview', 'true'));
    });

    test('publica el layout y la presentación objetivo correspondientes al viewport', async ({ page }) => {
        await page.goto('/');
        const viewport = page.viewportSize();
        expect(viewport).not.toBeNull();
        const { width, height } = viewport!;
        const expectedMode = width <= 599 ? 'compact' : width <= 1050 ? 'medium' : 'desktop';
        const expectedPresentation = width <= 1050 ? 'mobile' : 'wood';

        await expect(page.locator('html')).toHaveAttribute('data-layout-mode', expectedMode);
        await expect(page.locator('html')).toHaveAttribute('data-presentation-target', expectedPresentation);
        await expect(page.locator('html')).toHaveAttribute('data-presentation-active', expectedPresentation);
        await expect(page.locator('html')).toHaveAttribute('data-mobile-presentation', 'enabled');
        await expect(page.locator('html')).toHaveAttribute('data-orientation', width < height ? 'portrait' : 'landscape');
        await expect(page.locator('html')).toHaveAttribute('data-wide', width >= 1600 ? 'true' : 'false');
        await expect(page.locator('html')).toHaveAttribute('data-ultrawide', width >= 2560 ? 'true' : 'false');
    });

    test('mantiene las rutas públicas dentro del viewport y separa Mobile de Wood', async ({ page }) => {
        const viewport = page.viewportSize();
        expect(viewport).not.toBeNull();
        const expectsWood = viewport!.width > 1050;
        for (const route of PUBLIC_ROUTES) {
            await page.goto(route);
            await expect(page.locator('html')).toHaveAttribute('data-presentation-active', expectsWood ? 'wood' : 'mobile');
            await page.waitForFunction(() => !!document.querySelector('router-outlet')?.nextElementSibling);
            const contract = await page.evaluate(textureVariables => {
                const root = document.documentElement;
                const styles = getComputedStyle(root);
                return {
                    fits: root.scrollWidth <= root.clientWidth,
                    textures: textureVariables.map(variable => styles.getPropertyValue(variable).trim()),
                    hasMobileTree: !!document.querySelector('.mobile-ui, app-login-mobile-view, app-register-mobile-view, app-forgot-password-mobile-view, app-reset-password-mobile-view'),
                    hasWoodTree: !!document.querySelector('app-login-wood-view, app-register-wood-view, app-forgot-password-wood-view, app-reset-password-wood-view')
                };
            }, TEXTURE_VARIABLES);
            expect(contract.fits, `${route} no debe producir overflow horizontal`).toBeTruthy();
            if (expectsWood) {
                expect(contract.textures.every(value => value !== 'none'), `${route} debe conservar las texturas Wood en escritorio`).toBeTruthy();
                expect(contract.hasMobileTree, `${route} no debe instanciar Mobile en escritorio`).toBeFalsy();
            } else {
                expect(contract.hasMobileTree, `${route} debe instanciar su árbol Mobile`).toBeTruthy();
                expect(contract.hasWoodTree, `${route} no debe mantener instanciado su árbol Wood`).toBeFalsy();
            }
        }
    });

    test('conserva ruta y formulario al rotar y sustituye la presentación cuando corresponde', async ({ page }) => {
        await page.goto('/login');
        const email = page.getByLabel(/Correo electrónico/i);
        await email.fill('rotacion@example.test');

        const original = page.viewportSize()!;
        await expect(page.locator('html')).toHaveAttribute('data-presentation-active', original.width <= 1050 ? 'mobile' : 'wood');

        await page.setViewportSize({ width: original.height, height: original.width });
        await expect(page).toHaveURL(/\/login(?:[?#].*)?$/);
        await expect(page.getByLabel(/Correo electrónico/i)).toHaveValue('rotacion@example.test');
        await expect(page.locator('html')).toHaveAttribute('data-orientation', original.height < original.width ? 'portrait' : 'landscape');
        await expect(page.locator('html')).toHaveAttribute('data-presentation-active', original.height <= 1050 ? 'mobile' : 'wood');

        await page.setViewportSize(original);
        await expect(page.getByLabel(/Correo electrónico/i)).toHaveValue('rotacion@example.test');
        await expect(page.locator('html')).toHaveAttribute('data-presentation-active', original.width <= 1050 ? 'mobile' : 'wood');
    });
});
