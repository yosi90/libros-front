import { expect, test } from '@playwright/test';
import { installRealtimeProbe, waitForCurrentRealtimeConnectionSnapshot } from './support/realtime-probe';

test('la sonda realtime no reutiliza readiness de un documento sustituido @smoke', async ({ page }) => {
    await installRealtimeProbe(page);
    await page.goto('/login');
    await dispatchConnected(page);

    const first = await waitForCurrentRealtimeConnectionSnapshot(page, 'chat');
    expect(first.activeDocumentId).toBeTruthy();

    await page.goto('/register');
    const secondReadiness = waitForCurrentRealtimeConnectionSnapshot(page, 'chat');
    await dispatchConnected(page);
    const second = await secondReadiness;

    expect(second.activeDocumentId).toBeTruthy();
    expect(second.activeDocumentId).not.toBe(first.activeDocumentId);
    expect(new Set(second.observations.map(observation => observation.documentId))).toEqual(
        new Set([first.activeDocumentId!, second.activeDocumentId!])
    );
    expect(second.documents.map(document => document.documentId)).toEqual(
        expect.arrayContaining([first.activeDocumentId!, second.activeDocumentId!])
    );
    expect(second.mainFrameNavigations.length).toBeGreaterThanOrEqual(2);
});

async function dispatchConnected(page: import('@playwright/test').Page): Promise<void> {
    await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('libros:qa-realtime-observation', {
            detail: { kind: 'connection', channel: 'chat', status: 'connected', reconnected: false }
        }));
    });
}
