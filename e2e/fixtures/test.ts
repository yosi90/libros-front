import { expect, test as base } from '@playwright/test';

interface DiagnosticsFixture {
    diagnostics: void;
    expectedConsoleErrors: RegExp[];
}

export const test = base.extend<DiagnosticsFixture>({
    expectedConsoleErrors: [[], { option: true }],
    diagnostics: [async ({ page, baseURL, expectedConsoleErrors }, use, testInfo) => {
        const errors: string[] = [];
        const network: Array<{ method: string; status: number; url: string }> = [];
        const pendingConsoleMessages: Promise<void>[] = [];
        page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
        page.on('console', message => {
            if (message.type() !== 'error') return;
            pendingConsoleMessages.push((async () => {
                const values = await Promise.all(message.args().map(async argument => {
                    try {
                        const value = await argument.evaluate(candidate => candidate instanceof Error
                            ? { name: candidate.name, message: candidate.message, stack: candidate.stack }
                            : candidate);
                        return JSON.stringify(value);
                    }
                    catch { return argument.toString(); }
                }));
                const detail = message.text() === 'JSHandle@object' && values.length ? values.join(' ') : message.text();
                const location = message.location();
                if (detail.includes('downloadable font: download failed') || location.url.includes('fonts.gstatic.com')) return;
                if (!expectedConsoleErrors.some(pattern => pattern.test(detail)))
                    errors.push(`console: ${detail}${location.url ? ` (${location.url}:${location.lineNumber})` : ''}`);
            })());
        });
        page.on('response', response => {
            if (response.status() >= 400)
                network.push({ method: response.request().method(), status: response.status(), url: response.url() });
            if (baseURL && response.url().startsWith(baseURL) && response.status() >= 500)
                errors.push(`http ${response.status()}: ${response.url()}`);
        });

        await use();
        await Promise.all(pendingConsoleMessages);

        if (errors.length || testInfo.status !== testInfo.expectedStatus) {
            await testInfo.attach('diagnostics', {
                body: JSON.stringify({ errors, network }, null, 2),
                contentType: 'application/json'
            });
        }

        expect(errors, 'La pagina no debe producir errores inesperados de consola, runtime o HTTP 5xx').toEqual([]);
    }, { auto: true }]
});

export { expect } from '@playwright/test';
