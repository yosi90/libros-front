import { chromium } from '@playwright/test';

const endpoint = process.env.NATIVE_CDP_URL ?? 'http://127.0.0.1:9222';
const prepareOnly = process.env.NATIVE_GOOGLE_PREPARE_ONLY === '1';
const browser = await chromium.connectOverCDP(endpoint);
const page = browser.contexts()[0]?.pages()[0];

if (!page)
    throw new Error('No se encontró una página WebView depurable.');

await page.goto('https://localhost/login', { waitUntil: 'domcontentloaded' });
const googleButton = page.getByRole('button', { name: 'Continuar con Google' });
await googleButton.waitFor({ state: 'visible' });
if (!prepareOnly)
    await googleButton.evaluate(button => (button).click());
if (!prepareOnly)
    await page.waitForTimeout(2_000);

console.log(JSON.stringify({
    route: new URL(page.url()).pathname,
    nativeGoogleRequested: !prepareOnly
}, null, 2));

await browser.close();
