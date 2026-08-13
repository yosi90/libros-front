import { defineConfig, devices } from '@playwright/test';
import baseConfig from './playwright.config';

const baseURL = process.env['PLAYWRIGHT_BASE_URL']?.trim() || 'http://127.0.0.1:4200';
const useBuiltArtifact = process.env['QA_USE_BUILT_ARTIFACT'] === 'true';
const skipWebServer = process.env['PLAYWRIGHT_SKIP_WEBSERVER'] === 'true';

export default defineConfig({
    ...baseConfig,
    globalSetup: './e2e/global-setup.ts',
    globalTeardown: './e2e/global-teardown.ts',
    fullyParallel: false,
    workers: 1,
    reporter: [
        ['list'],
        ['junit', { outputFile: 'test-results/integration-junit.xml' }]
    ],
    use: { ...baseConfig.use, baseURL },
    projects: [
        {
            name: 'auth-setup-chromium',
            testMatch: /auth\.setup\.ts/,
            use: { ...devices['Desktop Chrome'], trace: 'off', screenshot: 'off', video: 'off' }
        },
        {
            name: 'auth-setup-firefox',
            testMatch: /auth\.setup\.ts/,
            use: { ...devices['Desktop Firefox'], trace: 'off', screenshot: 'off', video: 'off' }
        },
        {
            name: 'chromium',
            testMatch: /.*\.integration\.spec\.ts/,
            dependencies: ['auth-setup-chromium'],
            use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, storageState: 'test-results/auth/chromium-userA.json', trace: 'off' }
        },
        {
            name: 'firefox',
            testMatch: /.*\.integration\.spec\.ts/,
            dependencies: ['auth-setup-firefox'],
            use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 }, storageState: 'test-results/auth/firefox-userA.json', trace: 'off' }
        }
    ],
    webServer: skipWebServer ? undefined : {
        command: useBuiltArtifact
            ? 'node scripts/qa/serve-static.mjs --root dist/book-front/browser --host 127.0.0.1 --port 4200'
            : 'npm start -- --configuration qa --host 127.0.0.1 --port 4200 --no-hmr',
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000
    }
});
