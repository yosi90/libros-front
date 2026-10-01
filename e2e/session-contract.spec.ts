import { expect, test } from './fixtures/test';
import { environment } from '../src/environment/environment';

test('requires a new login after the session contract changes', async ({ page }) => {
    let revocations = 0;
    let refreshes = 0;
    await page.addInitScript(() => localStorage.setItem('sessionVersion', 'old-contract'));
    await page.route('**/auth/session/csrf', route => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, CsrfToken: 'test-csrf' })
    }));
    await page.route('**/auth/session', route => {
        if (route.request().method() === 'DELETE') revocations++;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });
    await page.route('**/auth/session/refresh', route => {
        refreshes++;
        return route.abort();
    });

    await page.goto('/dashboard/books');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();
    await expect.poll(() => revocations).toBe(1);
    expect(refreshes).toBe(0);
    expect(await page.evaluate(() => localStorage.getItem('sessionVersion'))).not.toBe(environment.sessionVersion);

    await page.reload();

    await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();
    await expect.poll(() => revocations).toBe(2);
    expect(refreshes).toBe(0);
});
