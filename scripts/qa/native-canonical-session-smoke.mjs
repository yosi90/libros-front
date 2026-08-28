import { chromium } from '@playwright/test';

const endpoint = process.env.NATIVE_CDP_URL ?? 'http://127.0.0.1:9222';
const browser = await chromium.connectOverCDP(endpoint);
const page = browser.contexts()[0]?.pages()[0];

if (!page)
    throw new Error('No se encontró una página WebView depurable.');

await page.addInitScript(() => {
    window.__qaFirebaseSessionObservations = [];
    window.__qaFirebasePresenceObservations = [];
    window.addEventListener('libros:qa-firebase-session-observation', event => {
        const detail = event.detail ?? {};
        window.__qaFirebaseSessionObservations.push({
            stage: detail.stage ?? null,
            canonicalUidValid: detail.canonicalUidValid ?? null,
            errorCode: detail.errorCode ?? null
        });
    });
    window.addEventListener('libros:qa-firebase-presence-observation', event => {
        const detail = event.detail ?? {};
        window.__qaFirebasePresenceObservations.push({
            stage: detail.stage ?? null,
            errorCode: detail.errorCode ?? null
        });
    });
});

let realtimeDatabaseSocket = false;
const firebaseErrors = [];

page.on('console', message => {
    const value = message.text();
    if (/No se pudo iniciar la sesión Firebase|FirebaseError|canonical session/i.test(value))
        firebaseErrors.push({ type: message.type(), message: value.slice(0, 300) });
});
page.on('pageerror', error => {
    if (/firebase|canonical/i.test(error.message))
        firebaseErrors.push({ type: 'pageerror', message: error.message.slice(0, 300) });
});

page.on('websocket', socket => {
    try {
        const url = new URL(socket.url());
        if (url.hostname.endsWith('firebaseio.com') || url.hostname.endsWith('firebasedatabase.app'))
            realtimeDatabaseSocket = true;
    } catch {
        // Ignora sockets con URL no estándar.
    }
});

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(8_000);

const state = await page.evaluate(() => ({
    route: location.pathname,
    sessionObservations: window.__qaFirebaseSessionObservations ?? [],
    presenceObservations: window.__qaFirebasePresenceObservations ?? []
}));

console.log(JSON.stringify({
    ...state,
    realtimeDatabaseSocket,
    firebaseErrors
}, null, 2));

await browser.close();
