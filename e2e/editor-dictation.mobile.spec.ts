import { expect, test } from './fixtures/test';
import { installLocalVisualSession } from './support/local-visual-session';

// El dictado por voz (IA3): el micrófono de la barra del editor, con el reconocedor del navegador simulado (escribe lo
// que «oye» en el cursor). El de la clave de IA se prueba en las unitarias y en la APK contra QA.
test.describe('dictado por voz en el editor de escenas', () => {
    test.beforeEach(async ({ page }) => {
        await installLocalVisualSession(page);
        await page.addInitScript(() => {
            class FakeRecognition {
                lang = '';
                continuous = false;
                interimResults = true;
                onresult: ((event: unknown) => void) | null = null;
                onerror: ((event: { error: string }) => void) | null = null;
                onend: (() => void) | null = null;
                start(): void {
                    setTimeout(() => this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'kelsier sonríe en la bruma' } }] }), 50);
                }
                stop(): void { setTimeout(() => this.onend?.(), 0); }
                abort(): void { }
            }
            Object.assign(window, { SpeechRecognition: FakeRecognition, webkitSpeechRecognition: FakeRecognition });
        });
    });

    test('el micrófono va primero en la barra y escribe lo dictado en el cursor', async ({ page }, testInfo) => {
        await page.goto('/book/73/chapter/11');
        await expect(page.locator('.dragon-loader')).toBeHidden();
        const editor = page.getByRole('textbox', { name: 'Descripción de la escena 1' });
        await editor.click();
        await page.keyboard.press('End');
        await page.keyboard.press('Control+End');

        const dictate = page.locator('.rtf-toolbar .rtf-tool').first();
        await expect(dictate).toHaveAccessibleName('Dictar');
        await page.screenshot({ path: testInfo.outputPath('barra-con-dictado.png') });

        await dictate.click();
        await expect(editor).toContainText('Kelsier sonríe en la bruma');
        await expect(page.getByRole('button', { name: 'Parar el dictado' })).toHaveClass(/is-listening/);
        await page.getByRole('button', { name: 'Parar el dictado' }).click();
        await expect(page.getByRole('button', { name: 'Dictar' })).toBeVisible();
    });
});
