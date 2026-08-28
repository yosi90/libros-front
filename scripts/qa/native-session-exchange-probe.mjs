import { chromium } from '@playwright/test';

const endpoint = process.env.NATIVE_CDP_URL ?? 'http://127.0.0.1:9222';
const browser = await chromium.connectOverCDP(endpoint);
const page = browser.contexts()[0]?.pages()[0];

if (!page)
    throw new Error('No se encontró una página WebView depurable.');

const result = await page.evaluate(async () => {
    const firebase = window.Capacitor?.Plugins?.['FirebaseAuthentication'];
    const http = window.Capacitor?.Plugins?.['CapacitorHttp'];
    if (!firebase || !http)
        return { available: false };

    try {
        const token = await firebase.getIdToken({ forceRefresh: true });
        const response = await http.request({
            method: 'POST',
            url: 'https://qa-api.yosiftware.es/auth/session',
            data: {
                FirebaseIdToken: token.token,
                PhoneAttemptId: null,
                Device: { Name: 'Mem.Bib. en Android', Platform: 'android' }
            },
            headers: { 'Content-Type': 'application/json' },
            responseType: 'json',
            connectTimeout: 15_000,
            readTimeout: 30_000
        });
        return {
            available: true,
            status: response.status,
            success: response.data?.success ?? null,
            state: response.data?.Estado ?? null,
            code: response.data?.code ?? null,
            error: response.data?.error ?? null,
            hasAccessToken: typeof response.data?.AccessToken === 'string',
            hasCsrfToken: typeof response.data?.CsrfToken === 'string'
        };
    } catch (error) {
        return {
            available: true,
            bridgeError: error instanceof Error ? error.message : String(error)
        };
    }
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
