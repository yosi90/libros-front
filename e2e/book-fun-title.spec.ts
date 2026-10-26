import { expect, test } from './fixtures/test';
import { installLocalVisualSession } from './support/local-visual-session';

// El título divertido de cada persona (IA2): la escena al abrir el libro, la cabecera del resumen en un marco aislado y
// la frase como texto, nunca como HTML de la página.
const banner = {
    success: true,
    Titulo: 'Bailando entre Brumas y Ceniza ⚙️ (¬‿¬)☁️✨',
    Html: '<main class="t"><h1>Bailando entre Brumas y Ceniza</h1><p>⚙️ (¬‿¬)☁️✨</p></main>',
    Estilos: 'html,body{height:100%;margin:0}.t{height:100%;display:grid;place-content:center;text-align:center;color:#fff;background:linear-gradient(135deg,#3b2a5a,#0b6b5e)}h1{margin:0;font:600 28px Georgia,serif}',
    Generaciones: { Hoy: 3, Limite: 10 }
};

test.describe('Título divertido del libro', () => {
    test('la escena al abrir el libro y la cabecera del resumen van en un marco sin permisos', async ({ page }) => {
        await installLocalVisualSession(page, { webPresentation: true });
        await page.route('**/coleccion/libros/73/titulo', route => route.fulfill({ json: banner }));
        await page.goto('/book/73/statistics');

        const scene = page.locator('.book-title-fullscreen-pane');
        await expect(scene.locator('iframe')).toHaveAttribute('sandbox', '');
        await expect(scene.getByRole('button', { name: 'Toca para entrar' })).toBeVisible();
        await scene.getByRole('button', { name: 'Toca para entrar' }).click();
        await expect(scene).toHaveCount(0);

        const hero = page.locator('app-web-book-statistics-view .fun-title__hero');
        await expect(hero.locator('iframe')).toHaveAttribute('sandbox', '');
        expect(await hero.locator('iframe').evaluate(frame => (frame as HTMLIFrameElement).srcdoc)).toContain("default-src 'none'");
        await expect(hero.getByRole('button', { name: 'Generar otro' })).toBeVisible();
        await expect(hero.getByRole('button', { name: 'Editar la frase' })).toBeVisible();
        // Nada del HTML de la cabecera entra en la página.
        await expect(page.locator('app-web-book-statistics-view main.t')).toHaveCount(0);
    });

    test('escribir la frase a mano la guarda y quita la cabecera', async ({ page }) => {
        await installLocalVisualSession(page, { webPresentation: true });
        let saved: unknown = null;
        await page.route('**/coleccion/libros/73/titulo', route => {
            if (route.request().method() === 'PUT') {
                saved = route.request().postDataJSON();
                return route.fulfill({ json: { ...banner, Titulo: '<b>Mi frase</b> (¬‿¬)', Html: null, Estilos: null } });
            }
            return route.fulfill({ json: { ...banner, Html: null, Estilos: null } });
        });
        await page.goto('/book/73/statistics');

        const block = page.locator('app-web-book-title');
        await expect(block).toContainText(banner.Titulo);
        await block.getByRole('button', { name: 'Editar' }).click();
        await block.getByLabel('Tu título divertido').fill('<b>Mi frase</b> (¬‿¬)');
        await block.getByRole('button', { name: 'Guardar' }).click();

        await expect(block).toContainText('<b>Mi frase</b> (¬‿¬)');
        await expect(block.locator('b')).toHaveCount(0);
        expect(saved).toEqual({ Titulo: '<b>Mi frase</b> (¬‿¬)' });
    });
});
