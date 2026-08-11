import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env['PLAYWRIGHT_BASE_URL']?.trim() || 'http://127.0.0.1:4200';
const skipWebServer = process.env['PLAYWRIGHT_SKIP_WEBSERVER'] === 'true';
const useBuiltArtifact = process.env['QA_USE_BUILT_ARTIFACT'] === 'true';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    retries: process.env['CI'] ? 1 : 0,
    workers: process.env['CI'] ? 1 : 4,
    reporter: [
        ['html', { open: 'never' }],
        ['junit', { outputFile: 'test-results/e2e-junit.xml' }]
    ],
    snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
    use: {
        baseURL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },
    projects: [
        {
            name: 'chromium',
            testIgnore: [/.*\.mobile\.spec\.ts/, /.*\.integration\.spec\.ts/],
            use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
        },
        {
            name: 'firefox',
            testIgnore: [/.*\.mobile\.spec\.ts/, /.*\.integration\.spec\.ts/],
            use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } }
        },
        {
            name: 'mobile-390',
            testMatch: /.*\.mobile\.spec\.ts/,
            use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } }
        },
        {
            name: 'compact-520',
            testMatch: /.*\.mobile\.spec\.ts/,
            use: { ...devices['Desktop Chrome'], viewport: { width: 520, height: 800 } }
        }
    ],
    webServer: skipWebServer ? undefined : {
        command: useBuiltArtifact
            ? 'node scripts/qa/serve-static.mjs --root dist/book-front/browser --host 127.0.0.1 --port 4200'
            : 'npm start -- --host 127.0.0.1 --port 4200 --no-hmr',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000
    }
});
