import { expect, integrationTest as test } from './fixtures/integration';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const RUNS = 5;

test('registra la mediana fria y caliente de Home @integration @performance', async ({ browser, qaEnvironment }, testInfo) => {
    test.skip(!['chromium', 'firefox'].includes(testInfo.project.name), 'El baseline completo es desktop.');
    expect(qaEnvironment.environmentId).toBe('qa');
    const cold: number[] = [];
    for (let index = 0; index < RUNS; index++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto('/home', { waitUntil: 'networkidle' });
        cold.push(await navigationDuration(page));
        await context.close();
    }

    const warm: number[] = [];
    const context = await browser.newContext();
    const page = await context.newPage();
    for (let index = 0; index < RUNS; index++) {
        await page.goto('/home', { waitUntil: 'networkidle' });
        warm.push(await navigationDuration(page));
    }
    await context.close();

    const evidence = {
        route: '/home',
        project: testInfo.project.name,
        runs: RUNS,
        coldMs: cold,
        warmMs: warm,
        coldMedianMs: median(cold),
        warmMedianMs: median(warm),
        regressionThreshold: { relativePercent: 20, absoluteMs: 300 }
    };
    await mkdir(path.dirname(testInfo.outputPath('performance.json')), { recursive: true });
    await writeFile(testInfo.outputPath('performance.json'), JSON.stringify(evidence, null, 2), 'utf8');
    await testInfo.attach('performance-baseline', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
    expect(evidence.coldMedianMs).toBeGreaterThan(0);
    expect(evidence.warmMedianMs).toBeGreaterThan(0);
});

async function navigationDuration(page: import('@playwright/test').Page): Promise<number> {
    return page.evaluate(() => (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).duration);
}

function median(values: number[]): number {
    const sorted = [...values].sort((left, right) => left - right);
    return Math.round(sorted[Math.floor(sorted.length / 2)] * 100) / 100;
}
