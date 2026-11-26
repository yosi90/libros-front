import { expect, test } from './fixtures/test';
import { installLocalVisualSession } from './support/local-visual-session';

// Las tipografías se sirven desde la propia web: ni la web ni la cabecera del título divertido piden nada a Google
// Fonts ni a los CDN, tampoco una cabecera antigua que los importaba (su fuente de fuera se sustituye por una propia).
const external = /fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|unpkg\.com|cdn\.jsdelivr\.net/;
const oldBanner = {
    success: true,
    Titulo: '¡Expecto Lectorum! ✨',
    Html: '<h1 class="titulo">¡Expecto Lectorum! <i class="fa-solid fa-wand-sparkles" aria-hidden="true"></i></h1>',
    Estilos: "@import url('https://fonts.googleapis.com/css2?family=UnifrakturCook:wght@700&display=swap');"
        + "@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css');"
        + "@import url('https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css');"
        + "@import url('https://cdn.jsdelivr.net/npm/hover.css@2.3.1/css/hover-min.css');"
        + 'html,body{height:100%;margin:0}body{display:flex;align-items:center;justify-content:center;background:#323232;color:#f5f5f5}'
        + "h1.titulo{margin:0;font-family:'UnifrakturCook',sans-serif;font-size:clamp(1.1em,6vmin,2.6em)}",
    Generaciones: { Hoy: 1, Limite: 10 }
};

test.describe('Tipografías propias', () => {
    test('la web y la ficha de un libro no piden nada a Google Fonts ni a los CDN', async ({ page }) => {
        const requests: string[] = [];
        page.on('request', request => requests.push(request.url()));
        await installLocalVisualSession(page, { webPresentation: true });
        await page.route('**/coleccion/libros/73/titulo', route => route.fulfill({ json: oldBanner }));

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.goto('/book/73/statistics');
        const scene = page.locator('.book-title-fullscreen-pane');
        await expect(scene.locator('iframe')).toHaveAttribute('sandbox', '');
        await scene.getByRole('button', { name: 'Toca para entrar' }).click();
        const hero = page.locator('app-web-book-statistics-view .fun-title__hero iframe');
        await expect(hero).toHaveAttribute('sandbox', '');
        const srcdoc = await hero.evaluate(frame => (frame as HTMLIFrameElement).srcdoc);
        expect(srcdoc).not.toMatch(external);
        expect(srcdoc).toContain("'UnifrakturCook','Montserrat', sans-serif");
        // La cabecera pinta con su respaldo propio (Montserrat, antes de `sans-serif`), que pide a la web: el marco tiene
        // un origen opaco y la web le deja las fuentes con CORS. Firefox da el nombre de la familia entre comillas.
        const frame = await (await hero.elementHandle())!.contentFrame();
        await expect.poll(() => frame!.evaluate(() =>
            [...document.fonts].some(font => font.family.replace(/"/g, '') === 'Montserrat' && font.status === 'loaded'))).toBe(true);
        await page.waitForLoadState('networkidle');

        expect(requests.filter(url => external.test(url))).toEqual([]);
        expect(requests.some(url => url.endsWith('/assets/fonts/fuentes.css'))).toBe(true);
        expect(requests.some(url => /\/assets\/fonts\/montserrat\/montserrat-latin-\d+-normal\.woff2$/.test(url))).toBe(true);
    });

    test('la Web lee con Literata, también el RTF en Microsoft Sans Serif, la fuente por defecto del escritorio', async ({ page }) => {
        const requests: string[] = [];
        page.on('request', request => requests.push(request.url()));
        await installLocalVisualSession(page, { webPresentation: true });

        await page.goto('/book/73/chapter/11');
        const text = page.locator('app-web-chapter-view .rtf-editor [style*="Microsoft Sans Serif" i]').first();
        await expect(text).toBeVisible({ timeout: 15000 });
        expect(await text.evaluate(element => getComputedStyle(element).fontFamily)).toMatch(/^Literata,/);
        await expect.poll(() => page.evaluate(() =>
            [...document.fonts].some(font => font.family.replace(/"/g, '') === 'Literata' && font.status === 'loaded'))).toBe(true);
        expect(requests.some(url => /\/assets\/fonts\/literata\/literata-latin-400-normal\.woff2$/.test(url))).toBe(true);
        expect(requests.filter(url => external.test(url))).toEqual([]);
    });
});
