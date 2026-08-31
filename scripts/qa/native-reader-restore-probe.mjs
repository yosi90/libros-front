import { chromium } from '@playwright/test';

const endpoint = process.env.NATIVE_CDP_URL ?? 'http://127.0.0.1:9222';
const browser = await chromium.connectOverCDP(endpoint);
const page = browser.contexts()[0]?.pages()[0];

if (!page)
    throw new Error('No se encontró una página WebView depurable.');

const requests = [];
const loaderSamples = [];
let stage = 'setup';
page.on('request', request => {
    const url = new URL(request.url());
    if (url.protocol === 'http:' || url.protocol === 'https:') {
        const proxiedUrl = url.pathname === '/_capacitor_http_interceptor_' ? url.searchParams.get('u') : null;
        const path = proxiedUrl ? new URL(proxiedUrl).pathname : url.pathname;
        requests.push({ stage, method: request.method(), path });
    }
});

const sampleLoader = async label => {
    stage = label;
    loaderSamples.push(await page.evaluate(label => ({
        stage: label,
        route: location.pathname,
        visibleLoaders: [...document.querySelectorAll('.dragon-loader, app-loader, .loader')]
            .filter(element => {
                const style = getComputedStyle(element);
                const bounds = element.getBoundingClientRect();
                return style.display !== 'none' && style.visibility !== 'hidden' && bounds.width > 0 && bounds.height > 0;
            })
            .map(element => element.className || element.tagName)
    }), label));
};

const initialRoute = new URL(page.url()).pathname;
if (!initialRoute.startsWith('/book/')) {
    const island = page.locator('.native-reader-island__restore');
    if (await island.count() === 0)
        throw new Error(`No hay una píldora restaurable en ${initialRoute}.`);

    await sampleLoader('dashboard-before-first-restore');
    await island.dispatchEvent('click');
    await page.waitForURL(url => url.pathname.startsWith('/book/'), { timeout: 10_000 });
    await page.waitForTimeout(500);
    await sampleLoader('book-after-first-restore');
}

const firstIdentity = await page.evaluate(() => {
    const root = document.querySelector('app-book');
    const outlet = root?.querySelector('router-outlet');
    const child = outlet?.nextElementSibling ?? null;
    globalThis.__readerRestoreProbe = { root, child };
    return {
        rootPresent: !!root,
        childTag: child?.tagName ?? null,
        inputCount: root?.querySelectorAll('input, textarea, [contenteditable="true"]').length ?? 0
    };
});

const minimize = page.locator('[aria-label="Minimizar libro"]');
stage = 'before-minimize';
await minimize.dispatchEvent('click');
await page.waitForURL(url => url.pathname.startsWith('/dashboard'), { timeout: 10_000 });
await page.waitForTimeout(300);
await sampleLoader('dashboard-after-minimize');

await page.waitForTimeout(200);
stage = 'before-second-restore';
await page.locator('.native-reader-island__restore').dispatchEvent('click');
await page.waitForURL(url => url.pathname.startsWith('/book/'), { timeout: 10_000 });

for (const delay of [0, 50, 250, 750]) {
    await page.waitForTimeout(delay);
    await sampleLoader(`book-second-restore-${delay}ms`);
}

const secondIdentity = await page.evaluate(() => {
    const root = document.querySelector('app-book');
    const outlet = root?.querySelector('router-outlet');
    const child = outlet?.nextElementSibling ?? null;
    return {
        sameRoot: globalThis.__readerRestoreProbe?.root === root,
        sameChild: globalThis.__readerRestoreProbe?.child === child,
        childTag: child?.tagName ?? null,
        inputCount: root?.querySelectorAll('input, textarea, [contenteditable="true"]').length ?? 0
    };
});

console.log(JSON.stringify({
    finalRoute: new URL(page.url()).pathname,
    firstIdentity,
    secondIdentity,
    requests,
    loaderSamples
}, null, 2));

// La conexión CDP de algunos WebView Android no completa browser.close(). La
// sonda ya ha terminado y no debe cerrar el proceso nativo al desconectarse.
process.exit(0);
