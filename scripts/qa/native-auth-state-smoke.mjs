import { chromium } from '@playwright/test';

const endpoint = process.env.NATIVE_CDP_URL ?? 'http://127.0.0.1:9222';
const browser = await chromium.connectOverCDP(endpoint);
const page = browser.contexts()[0]?.pages()[0];

if (!page)
    throw new Error('No se encontró una página WebView depurable.');

const state = await page.evaluate(async () => {
    const firebase = window.Capacitor?.Plugins?.['FirebaseAuthentication'];
    let nativeUser = false;
    let idTokenAvailable = false;
    let firebaseError = null;

    try {
        const current = await firebase?.getCurrentUser();
        nativeUser = !!current?.user;
        if (nativeUser) {
            const token = await firebase.getIdToken({ forceRefresh: true });
            idTokenAvailable = typeof token?.token === 'string' && token.token.length > 0;
        }
    } catch (error) {
        firebaseError = error instanceof Error ? error.message : String(error);
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
        lastLogoutReason: sessionStorage.getItem('qa:last-logout-reason'),
        lastNativePushStage: sessionStorage.getItem('qa:last-native-push-stage'),
        lastNativePushError: sessionStorage.getItem('qa:last-native-push-error'),
        lastNotificationSaveError: sessionStorage.getItem('qa:last-notification-save-error'),
        pushDeviceKeyCount: Object.keys(localStorage).filter(key => key.startsWith('push-device:')).length,
        nativeUser,
        idTokenAvailable,
        firebaseError,
        csrfStatus,
        bodyText: document.body?.innerText?.slice(0, 300) ?? ''
    };
});

console.log(JSON.stringify(state, null, 2));
await browser.close();
