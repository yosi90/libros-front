import { expect, test as base } from '@playwright/test';

interface DiagnosticsFixture {
    diagnostics: void;
    expectedConsoleErrors: RegExp[];
    expectedHttpErrors: RegExp[];
    expectedHandledHttpErrors: ExpectedHandledHttpError[];
}

export interface ExpectedHandledHttpError {
    method: string;
    url: string;
    status: number;
    code: string;
    recovery: Array<{ method: string; status: number }>;
    required?: boolean;
}

interface HandledHttpState {
    conflicts: number[];
    recoveries: Array<{ sequence: number; step: number }>;
    valid: boolean;
}

export const test = base.extend<DiagnosticsFixture>({
    expectedConsoleErrors: [[], { option: true }],
    expectedHttpErrors: [[], { option: true }],
    expectedHandledHttpErrors: [[], { option: true }],
    diagnostics: [async ({ page, baseURL, browserName, expectedConsoleErrors, expectedHttpErrors, expectedHandledHttpErrors }, use, testInfo) => {
        const errors: string[] = [];
        const network: Array<{ method: string; status: number; url: string }> = [];
        const pendingConsoleMessages: Promise<void>[] = [];
        const pendingResponses: Promise<void>[] = [];
        const handledStates = new Map<ExpectedHandledHttpError, HandledHttpState>();
        const handledConsoleMessages: Array<{ detail: string; specification: ExpectedHandledHttpError }> = [];
        let responseSequence = 0;
        const stateFor = (specification: ExpectedHandledHttpError): HandledHttpState => {
            let state = handledStates.get(specification);
            if (!state) {
                state = { conflicts: [], recoveries: [], valid: true };
                handledStates.set(specification, state);
            }
            return state;
        };
        if (baseURL
            && /https?:\/\/(?:127\.0\.0\.1|localhost)/.test(baseURL)
            && process.env['PLAYWRIGHT_REAL_QA'] !== 'true') {
            await page.route('**/runtime-config', route => route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    Environment: 'qa',
                    QaDatasetVersion: 'local-deterministic',
                    RealtimeWsUrl: 'wss://example.test/ws',
                    Firebase: {
                        ApiKey: 'test-key',
                        AuthDomain: 'qa-libros.yosiftware.es',
                        ProjectId: 'libros-qa',
                        StorageBucket: 'libros-qa.firebasestorage.app',
                        MessagingSenderId: '1',
                        AppId: '1:test:web:test',
                        DatabaseURL: 'https://libros-qa-default-rtdb.europe-west1.firebasedatabase.app',
                        Providers: { Password: true, Google: true, Phone: true },
                        PhoneTestingMode: true
                    }
                })
            }));
            await page.route('**/auth/session/csrf', route => route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ success: false, code: 'session_refresh_invalid' })
            }));
        }
        await page.addInitScript(() => {
            const originalError = console.error.bind(console);
            const safeValue = (value: unknown): unknown => {
                if (value === null || typeof value !== 'object') return value;
                const candidate = value as Record<string, unknown>;
                const safe: Record<string, unknown> = {};
                for (const key of ['name', 'message', 'code', 'status', 'statusText', 'url']) {
                    const field = candidate[key];
                    if (typeof field === 'string' || typeof field === 'number' || typeof field === 'boolean')
                        safe[key] = field;
                }
                return Object.keys(safe).length ? JSON.stringify(safe) : Object.prototype.toString.call(value);
            };
            console.error = (...values: unknown[]) => originalError(
                `[qa-route ${location.pathname}]`,
                ...values.map(safeValue)
            );
        });
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
                const detail = message.text().includes('JSHandle@object') && values.length ? values.join(' ') : message.text();
                const location = message.location();
                if (detail.includes('downloadable font: download failed') || location.url.includes('fonts.gstatic.com')) return;
                if ((detail.includes('/auth/session/csrf') || location.url.includes('/auth/session/csrf')) && /status (?:of )?401|status of 401/i.test(detail)) return;
                if (baseURL
                    && /https?:\/\/(?:127\.0\.0\.1|localhost)/.test(baseURL)
                    && detail.includes('Cookie “libros_refresh” has been rejected because it is in a cross-site context')
                    && detail.includes('“SameSite” is “Lax” or “Strict”')) return;
                const rendered = `console: ${detail}${location.url ? ` (${location.url}:${location.lineNumber})` : ''}`;
                // WebKit todavía no implementa la extensión de viewport que Chromium
                // usa para coordinar el teclado virtual. La ignora de forma segura y
                // emite este diagnóstico al parsear el HTML.
                if (browserName === 'webkit'
                    && /Viewport argument key ["“]interactive-widget["”] not recognized and ignored\./i.test(detail)) return;
                // Playwright solo soporta Service Workers en Chromium. Angular informa con
                // NG05604 cuando el registro falla en los motores emulados restantes.
                if ((browserName !== 'chromium' || process.env['PLAYWRIGHT_BLOCK_SERVICE_WORKERS'] === 'true')
                    && /\bNG05604\b/i.test(rendered)) return;
                // Firefox etiqueta como corrupta una imagen cuya decodificación cancela
                // page.goto. Las superficies multipágina validan estos recursos aparte.
                if (browserName === 'firefox'
                    && /Image corrupt or truncated/i.test(rendered)
                    && /(?:qa-api\.yosiftware\.es\/image\/get\/photo\/default\.png|qa-libros\.yosiftware\.es\/assets\/media\/img\/fondo_(?:libro|desplegable)\.png)/i.test(rendered)) return;
                if (expectedConsoleErrors.some(pattern => pattern.test(rendered))) return;
                const handled = expectedHandledHttpErrors.find(specification =>
                    detail.includes(specification.url)
                    && new RegExp(`status (?:of )?${specification.status}(?:\\D|$)`, 'i').test(detail));
                if (handled) handledConsoleMessages.push({ detail: rendered, specification: handled });
                else errors.push(rendered);
            })());
        });
        page.on('response', response => {
            const sequence = ++responseSequence;
            const method = response.request().method();
            const status = response.status();
            const url = response.url();
            if (response.status() >= 400)
                network.push({ method, status, url });
            if (baseURL && response.url().startsWith(baseURL) && response.status() >= 500) {
                const rendered = `http ${response.status()}: ${response.url()}`;
                if (!expectedHttpErrors.some(pattern => pattern.test(rendered))) errors.push(rendered);
            }

            for (const specification of expectedHandledHttpErrors) {
                if (url !== specification.url) continue;
                const state = stateFor(specification);
                if (method === specification.method && status === specification.status) {
                    pendingResponses.push((async () => {
                        let code: string | null = null;
                        try {
                            const body = await response.json() as { code?: unknown };
                            code = typeof body.code === 'string' ? body.code : null;
                        } catch { /* La ausencia de JSON se registra como contrato no válido. */ }
                        if (code === specification.code) state.conflicts.push(sequence);
                        else {
                            state.valid = false;
                            errors.push(`http ${status}: ${url} no devolvio el codigo contractual esperado.`);
                        }
                    })());
                }
                specification.recovery.forEach((step, index) => {
                    if (method === step.method && status === step.status)
                        state.recoveries.push({ sequence, step: index });
                });
            }
        });

        await use();
        await Promise.all(pendingConsoleMessages);
        await Promise.all(pendingResponses);

        for (const specification of expectedHandledHttpErrors) {
            const state = stateFor(specification);
            if ((specification.required ?? true) && state.conflicts.length === 0) {
                state.valid = false;
                errors.push(`No se observo ${specification.status} ${specification.code} en ${specification.method} ${specification.url}.`);
            }
            for (const conflict of state.conflicts) {
                let cursor = conflict;
                for (let step = 0; step < specification.recovery.length; step++) {
                    const recovery = state.recoveries.find(candidate => candidate.step === step && candidate.sequence > cursor);
                    if (!recovery) {
                        state.valid = false;
                        const expected = specification.recovery[step];
                        errors.push(`No se verifico la recuperacion ${expected.method} ${expected.status} posterior a ${specification.code}.`);
                        break;
                    }
                    cursor = recovery.sequence;
                }
            }
        }
        for (const candidate of handledConsoleMessages) {
            if (!stateFor(candidate.specification).valid)
                errors.push(candidate.detail);
        }

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
