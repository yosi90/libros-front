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
        await page.addInitScript(() => localStorage.setItem('book-front:theme:v1', 'light'));
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
        await expect(page.locator('html')).toHaveAttribute('data-mobile-presentation', 'disabled');
        await expect(page.locator('html')).toHaveAttribute('data-orientation', width < height ? 'portrait' : 'landscape');
        await expect(page.locator('html')).toHaveAttribute('data-wide', width >= 1600 ? 'true' : 'false');
        await expect(page.locator('html')).toHaveAttribute('data-ultrawide', width >= 2560 ? 'true' : 'false');
    });

    test('mantiene las rutas públicas dentro del viewport y aísla el fallback móvil de Wood', async ({ page }) => {
        const viewport = page.viewportSize();
        expect(viewport).not.toBeNull();
        const expectsWood = viewport!.width > 1050;
        for (const route of PUBLIC_ROUTES) {
            await page.goto(route);
            await expect(page.locator('html')).toHaveAttribute('data-theme', expectsWood ? 'wood' : 'light');
            const contract = await page.evaluate(textureVariables => {
                const root = document.documentElement;
                const styles = getComputedStyle(root);
                return {
                    fits: root.scrollWidth <= root.clientWidth,
                    textures: textureVariables.map(variable => styles.getPropertyValue(variable).trim())
                };
            }, TEXTURE_VARIABLES);
            expect(contract.fits, `${route} no debe producir overflow horizontal`).toBeTruthy();
            if (expectsWood)
                expect(contract.textures.every(value => value !== 'none'), `${route} debe conservar las texturas Wood en escritorio`).toBeTruthy();
            else
                expect(contract.textures, `${route} no debe resolver texturas Wood en el fallback móvil`).toEqual(TEXTURE_VARIABLES.map(() => 'none'));
        }
    });

    test('conserva ruta y formulario al rotar y aplica el fallback responsive de wood', async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem('book-front:theme:v1', 'wood'));
        await page.goto('/login');
        const email = page.getByLabel(/Correo electrónico/i);
        await email.fill('rotacion@example.test');

        const original = page.viewportSize()!;
        const originalMode = original.width <= 599 ? 'compact' : original.width <= 1050 ? 'medium' : 'desktop';
        await expect(page.locator('html')).toHaveAttribute('data-theme-requested', 'wood');
        await expect(page.locator('html')).toHaveAttribute('data-theme', originalMode === 'desktop' ? 'wood' : 'dark');

        await page.setViewportSize({ width: original.height, height: original.width });
        await expect(page).toHaveURL(/\/login(?:[?#].*)?$/);
        await expect(email).toHaveValue('rotacion@example.test');
        await expect(page.locator('html')).toHaveAttribute('data-orientation', original.height < original.width ? 'portrait' : 'landscape');

        await page.setViewportSize(original);
        await expect(email).toHaveValue('rotacion@example.test');
        await expect(page.locator('html')).toHaveAttribute('data-theme', originalMode === 'desktop' ? 'wood' : 'dark');
    });
});
