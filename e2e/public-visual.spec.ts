import { expect, test } from './fixtures/test';

test.describe('regresion visual publica @visual', () => {
    test.skip(({ browserName }) => browserName !== 'chromium', 'Los baselines visuales se mantienen en Chromium.');
    // Baselines de Wood: el dispositivo lo elige como tema, igual que haría la persona.
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem('libros:web-theme:last', 'wood'));
    });

    test('Home conserva su composicion editorial', async ({ page }) => {
        // La portada cambió con la cuenta de Yosiftware (`<yosi-acceso>`, `<yosi-webs>` y la campana): la referencia de
        // Windows se regeneró en el hito 4; la de Linux, que compara la campaña nocturna, se regenera con Docker
        // (docs/codex/PROJECT_WORKING_NOTES.md, «Referencias visuales») antes de volver a activarla.
        test.fixme(process.platform === 'linux', 'Referencia de Linux pendiente de regenerar con la portada de la adhesión (hito 4).');
        await page.addInitScript(() => { Math.random = () => 0.25; });
        await page.goto('/');
        await expect(page).toHaveScreenshot('home.webp', { fullPage: true, animations: 'disabled' });
    });
});
