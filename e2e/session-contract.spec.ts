import { expect, test } from './fixtures/test';
import { environment } from '../src/environment/environment';
import { installLocalVisualSession } from './support/local-visual-session';
import { SDK_DOUBLE_TOKEN } from './support/yosiftware-sdk-double';

test('con una versión nueva retira lo de la sesión propia y conserva la marca de Yosiftadísticas', async ({ page }) => {
    await page.addInitScript(() => {
        if (sessionStorage.getItem('preparado')) return;
        sessionStorage.setItem('preparado', '1');
        localStorage.setItem('sessionVersion', 'old-contract');
        localStorage.setItem('jwt', 'antiguo');
        localStorage.setItem('refresh', 'antiguo');
        localStorage.setItem('yosiftadisticas:excluir', '1');
    });

    await page.goto('/home');
    await expect(page.locator('yosi-acceso')).toHaveCount(1);

    await expect.poll(() => page.evaluate(() => localStorage.getItem('sessionVersion'))).toBe(environment.sessionVersion);
    expect(await page.evaluate(() => [localStorage.getItem('jwt'), localStorage.getItem('refresh')])).toEqual([null, null]);
    expect(await page.evaluate(() => localStorage.getItem('yosiftadisticas:excluir'))).toBe('1');
});

test('llama a la API con el token de la plataforma y no lo guarda en el navegador', async ({ page }) => {
    const authorizations: string[] = [];
    await installLocalVisualSession(page, { webPresentation: true });
    page.on('request', request => {
        if (request.url().includes('/coleccion/universos')) authorizations.push(request.headers()['authorization'] ?? '');
    });

    await page.goto('/dashboard/books');
    await expect(page).toHaveURL(/\/dashboard\/books/);
    await expect.poll(() => authorizations.length).toBeGreaterThan(0);

    expect(authorizations[0]).toBe(`Bearer ${SDK_DOUBLE_TOKEN}`);
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie);
    expect(stored).not.toContain(SDK_DOUBLE_TOKEN);
});

test('al pasar a sin_sesion vuelve a la portada', async ({ page }) => {
    await installLocalVisualSession(page, { webPresentation: true });
    await page.goto('/dashboard/books');
    await expect(page.locator('app-web-library-view')).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => (window as unknown as { __yosiftwareDoble: { emitir(estado: unknown): void } }).__yosiftwareDoble.emitir({ tipo: 'sin_sesion' }));

    await expect(page).toHaveURL(/\/home(?:\?.*)?$/);
    await expect(page.getByRole('heading', { name: 'Cada libro deja una huella.' })).toBeVisible();
});
