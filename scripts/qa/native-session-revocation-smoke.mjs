import { chromium } from '@playwright/test';

const endpoint = process.env.NATIVE_CDP_URL ?? 'http://127.0.0.1:9222';
const browser = await chromium.connectOverCDP(endpoint);
const page = browser.contexts()[0]?.pages()[0];

if (!page)
    throw new Error('No se encontró una página WebView depurable.');

page.on('dialog', dialog => dialog.accept());

const securityUrl = new URL('/dashboard/account-security', page.url()).toString();
await page.goto(securityUrl, { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: 'Cuenta y seguridad' }).waitFor({ timeout: 15_000 });

const currentSession = page.locator('.security-row').filter({ has: page.getByText('Actual', { exact: true }) });
await currentSession.getByRole('button', { name: 'Cerrar sesión', exact: true }).waitFor({ timeout: 15_000 });

const before = await page.evaluate(() => ({
    route: location.pathname,
    currentSessionRows: [...document.querySelectorAll('.security-row')]
        .filter(row => row.querySelector('small')?.textContent?.trim() === 'Actual').length,
    pushDeviceKeyCount: Object.keys(localStorage).filter(key => key.startsWith('push-device:')).length
}));

await currentSession.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
await page.waitForURL(url => ['/home', '/login'].includes(url.pathname), { timeout: 15_000 });
await page.waitForTimeout(3_000);

const after = await page.evaluate(async () => {
    const firebase = window.Capacitor?.Plugins?.['FirebaseAuthentication'];
    let nativeUser = false;
    try {
        nativeUser = !!(await firebase?.getCurrentUser())?.user;
    } catch {
        nativeUser = true;
    }

    let csrfStatus = null;
    try {
        csrfStatus = (await fetch('https://qa-api.yosiftware.es/auth/session/csrf', {
            credentials: 'include'
        })).status;
    } catch {
        csrfStatus = 0;
    }

    return {
        route: location.pathname,
        logoutReason: sessionStorage.getItem('qa:last-logout-reason'),
        nativeUser,
        csrfStatus,
        pushDeviceKeyCount: Object.keys(localStorage).filter(key => key.startsWith('push-device:')).length,
        legacyTokensStored: ['jwt', 'refresh'].some(key => localStorage.getItem(key) !== null)
    };
});

console.log(JSON.stringify({ before, after }, null, 2));
await browser.close();

if (before.currentSessionRows !== 1
    || !['/home', '/login'].includes(after.route)
    || after.logoutReason !== 'user'
    || after.nativeUser
    || after.csrfStatus !== 401
    || after.pushDeviceKeyCount >= before.pushDeviceKeyCount
    || after.legacyTokensStored)
    process.exitCode = 1;
