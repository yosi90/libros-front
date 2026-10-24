import { expect, test } from './fixtures/test';

test.describe('regresion visual publica @visual', () => {
    test.skip(({ browserName }) => browserName !== 'chromium', 'Los baselines visuales se mantienen en Chromium.');
    // Baselines de Wood: el dispositivo lo elige como tema, igual que haría la persona.
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem('libros:web-theme:last', 'wood'));
    });

    test('Home conserva su composicion editorial', async ({ page }) => {
        // La portada cambia con la cuenta de Yosiftware (botones de entrar y la línea con el símbolo): la referencia se
        // regenera en Linux (docs/codex/PROJECT_WORKING_NOTES.md, «Referencias visuales») en el hito 4, antes del corte.
        test.fixme(true, 'Referencia pendiente de regenerar con la portada de la cuenta de Yosiftware (hito 4).');
        await page.addInitScript(() => { Math.random = () => 0.25; });
        await page.goto('/');
        await expect(page).toHaveScreenshot('home.webp', { fullPage: true, animations: 'disabled' });
    });
});
