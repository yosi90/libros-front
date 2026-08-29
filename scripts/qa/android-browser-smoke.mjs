import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const cdpUrl = process.env.ANDROID_CHROME_CDP_URL?.trim() || 'http://127.0.0.1:9222';
const baseUrl = process.argv[2]?.trim() || 'https://qa-libros.yosiftware.es';

const browser = await chromium.connectOverCDP(cdpUrl);

try {
    const context = browser.contexts()[0];
    assert.ok(context, 'Chrome Android no expuso un contexto de navegador.');
    const page = context.pages().find(candidate => candidate.url() === 'chrome-native://newtab/')
        ?? context.pages().find(candidate => candidate.url().startsWith(baseUrl))
        ?? await context.newPage();
    const browserErrors = [];
    page.on('console', message => {
        if (message.type() === 'error') browserErrors.push(message.text().slice(0, 240));
    });

    await page.goto(new URL('/login', baseUrl).toString(), { waitUntil: 'domcontentloaded' });
    const presentationRoot = page.locator('html[data-presentation-active]');
    if (await presentationRoot.count() === 0) {
        await page.evaluate(() => navigator.serviceWorker.controller?.postMessage({
            action: 'CHECK_FOR_UPDATES',
            nonce: Date.now()
        }));
        const updateAction = page.getByRole('button', { name: 'Actualizar', exact: true });
        try {
            await updateAction.waitFor({ timeout: 20_000 });
            await updateAction.click();
        } catch {
            // El diagnóstico inferior explicará si el shell obsoleto no ofreció una salida recuperable.
        }
    }
    try {
        await presentationRoot.waitFor({ timeout: 20_000 });
    } catch {
        const diagnostics = await page.evaluate(() => ({
            url: location.href,
            title: document.title,
            datasets: { ...document.documentElement.dataset },
            body: document.body?.innerText.slice(0, 160) ?? ''
        }));
        throw new Error(`Angular no publicó el contrato de presentación: ${JSON.stringify({ diagnostics, browserErrors })}`);
    }
    await page.getByRole('heading', { name: 'Bienvenido de nuevo.' }).waitFor();

    const presentation = await page.evaluate(() => ({
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        layout: document.documentElement.dataset.layoutMode,
        mode: document.documentElement.dataset.presentationActive,
        orientation: document.documentElement.dataset.orientation,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        mobileTree: !!document.querySelector('app-login-mobile-view, .mobile-ui'),
        woodTree: !!document.querySelector('app-login-wood-view')
    }));

    assert.equal(presentation.mode, 'mobile');
    assert.equal(presentation.mobileTree, true);
    assert.equal(presentation.woodTree, false);
    assert.equal(presentation.overflow, false);

    await page.waitForFunction(async () =>
        (await navigator.serviceWorker.getRegistration())?.active?.scriptURL.includes('/ngsw-worker.js') === true,
    null, { timeout: 35_000 });

    const serviceWorker = await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        return {
            active: registration?.active?.scriptURL.endsWith('/ngsw-worker.js') === true,
            firebaseScopeIsSeparate: !registration?.scope.includes('firebase-cloud-messaging-push-scope')
        };
    });

    assert.equal(serviceWorker.active, true);
    assert.equal(serviceWorker.firebaseScopeIsSeparate, true);
    console.log(JSON.stringify({ presentation, serviceWorker }));
} finally {
    await browser.close();
}
