import { chromium } from '@playwright/test';

const endpoint = process.env.NATIVE_CDP_URL ?? 'http://127.0.0.1:9222';
const browser = await chromium.connectOverCDP(endpoint);
const page = browser.contexts()[0]?.pages()[0];

if (!page)
    throw new Error('No se encontró una página WebView depurable.');

const errors = [];
page.on('pageerror', error => errors.push(`page: ${error.message}`));
page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

const cdp = await page.context().newCDPSession(page);
const cardObject = await cdp.send('Runtime.evaluate', {
    expression: "document.querySelector('.m-book-card')",
    objectGroup: 'native-reader-probe'
});
const cardListeners = cardObject.result.objectId
    ? await cdp.send('DOMDebugger.getEventListeners', { objectId: cardObject.result.objectId })
    : { listeners: [] };

await page.evaluate(() => {
    globalThis.__nativeReaderProbe = { clicks: 0, targets: [] };
    document.addEventListener('click', event => {
        const target = event.target;
        globalThis.__nativeReaderProbe.clicks++;
        globalThis.__nativeReaderProbe.targets.push({
            tag: target instanceof Element ? target.tagName : '',
            className: target instanceof Element ? String(target.className) : '',
            belongsToBookCard: target instanceof Element && !!target.closest('.m-book-card')
        });
    }, true);
});

const card = page.locator('.m-book-card').first();
const before = await page.evaluate(() => ({
    route: location.pathname,
    visibility: document.visibilityState,
    focused: document.hasFocus(),
    cardBounds: document.querySelector('.m-book-card')?.getBoundingClientRect().toJSON() ?? null,
    openStage: sessionStorage.getItem('qa:native-reader-open-stage'),
    sessionDiagnostic: sessionStorage.getItem('qa:native-reader-session'),
    probe: globalThis.__nativeReaderProbe
}));

await card.dispatchEvent('click');
const snapshots = [];
for (const delay of [0, 50, 500, 5_000]) {
    await page.waitForTimeout(delay);
    snapshots.push(await page.evaluate(() => ({
        route: location.pathname,
        visibility: document.visibilityState,
        focused: document.hasFocus(),
        openStage: sessionStorage.getItem('qa:native-reader-open-stage'),
        sessionDiagnostic: sessionStorage.getItem('qa:native-reader-session'),
        probe: globalThis.__nativeReaderProbe,
        loaderVisible: !!document.querySelector('.dragon-loader'),
        readerVisible: !!document.querySelector('app-book'),
        islandVisible: !!document.querySelector('app-native-reader-island')?.textContent?.trim()
    })));
}

console.log(JSON.stringify({
    before,
    cardListeners: cardListeners.listeners.map(listener => ({
        type: listener.type,
        useCapture: listener.useCapture,
        passive: listener.passive,
        handler: listener.handler?.description
    })),
    snapshots,
    errors
}, null, 2));
await cdp.send('Runtime.releaseObjectGroup', { objectGroup: 'native-reader-probe' });
await browser.close();
