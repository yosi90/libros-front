import { chromium } from '@playwright/test';

const endpoint = process.env.NATIVE_CDP_URL ?? 'http://127.0.0.1:9222';
const browser = await chromium.connectOverCDP(endpoint);
const page = browser.contexts()[0]?.pages()[0];

if (!page)
    throw new Error('No se encontró una página WebView depurable.');

const errors = [];
const observations = [];
page.on('pageerror', error => errors.push(`page: ${error.message}`));
page.on('console', message => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:'))
        errors.push(`console: ${message.text()}`);
});
page.on('requestfailed', request => {
    const url = new URL(request.url());
    errors.push(`request: ${url.origin}${url.pathname}: ${request.failure()?.errorText ?? 'unknown'}`);
});
page.on('response', response => {
    if (response.status() < 400)
        return;

    const url = new URL(response.url());
    const request = response.request();
    let destination = '';
    let destinationPath = url.pathname;

    if (url.pathname === '/_capacitor_http_interceptor_') {
        try {
            const target = new URL(url.searchParams.get('u'));
            destination = ` -> ${target.origin}${target.pathname}`;
            destinationPath = target.pathname;
        } catch {
            destination = ' -> destino no disponible';
        }
    }

    const summary = `response: ${response.status()} ${request.method()} ${url.origin}${url.pathname}${destination}`;
    if (response.status() === 401 && destinationPath === '/auth/session/csrf')
        observations.push(`${summary} (esperado sin sesión)`);
    else
        errors.push(summary);
});

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6_000);

const state = await page.evaluate(() => ({
    readyState: document.readyState,
    title: document.title,
    bodyText: document.body?.innerText?.slice(0, 500) ?? '',
    appRootLength: document.querySelector('app-root')?.innerHTML.length ?? 0,
    presentation: document.documentElement.dataset['presentationTarget'],
    mobilePresentation: document.documentElement.dataset['mobilePresentation'],
    theme: document.documentElement.dataset['theme'],
    viewport: [innerWidth, innerHeight, devicePixelRatio]
}));

console.log(JSON.stringify({ state, observations, errors }, null, 2));
await browser.close();
