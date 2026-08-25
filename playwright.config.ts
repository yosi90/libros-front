import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env['PLAYWRIGHT_BASE_URL']?.trim() || 'http://127.0.0.1:4200';
const skipWebServer = process.env['PLAYWRIGHT_SKIP_WEBSERVER'] === 'true';
const useBuiltArtifact = process.env['QA_USE_BUILT_ARTIFACT'] === 'true';
const isLocalBaseUrl = /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::|\/|$)/.test(baseURL);
const desktopIgnore = [/.*\.mobile\.spec\.ts/, /.*\.matrix\.spec\.ts/, /.*\.integration\.spec\.ts/];
const matrixMatch = /.*\.matrix\.spec\.ts/;
const compactMatch = [/.*\.matrix\.spec\.ts/, /.*\.mobile\.spec\.ts/];

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
        video: 'retain-on-failure',
        serviceWorkers: isLocalBaseUrl ? 'block' : 'allow'
    },
    projects: [
        {
            name: 'chromium',
            testIgnore: desktopIgnore,
            use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
        },
        {
            name: 'firefox',
            testIgnore: desktopIgnore,
            use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } }
        },
        {
            name: 'webkit',
            testIgnore: desktopIgnore,
            use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } }
        },
        {
            name: 'compact-320',
            testMatch: matrixMatch,
            use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true }
        },
        {
            name: 'compact-360',
            testMatch: matrixMatch,
            use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true }
        },
        {
            name: 'compact-390',
            testMatch: compactMatch,
            use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }
        },
        {
            name: 'compact-520',
            testMatch: compactMatch,
            use: { ...devices['Desktop Chrome'], viewport: { width: 520, height: 800 }, hasTouch: true, isMobile: true }
        },
        {
            name: 'tablet-768-portrait',
            testMatch: matrixMatch,
            use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true }
        },
        {
            name: 'tablet-1024-landscape',
            testMatch: matrixMatch,
            use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true }
        },
        {
            name: 'desktop-1440',
            testMatch: matrixMatch,
            use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
        },
        {
            name: 'wide-1920',
            testMatch: matrixMatch,
            use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } }
        },
        {
            name: 'ultrawide-2560',
            testMatch: matrixMatch,
            use: { ...devices['Desktop Chrome'], viewport: { width: 2560, height: 1080 } }
        },
        {
            name: 'ultrawide-3440',
            testMatch: matrixMatch,
            use: { ...devices['Desktop Chrome'], viewport: { width: 3440, height: 1440 } }
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
