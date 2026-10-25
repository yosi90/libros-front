import { defineConfig, devices } from '@playwright/test';
import baseConfig from './playwright.config';

// Esta suite consume deliberadamente el runtime QA real (API y plataforma de QA), sin sesión: la marca evita que el
// fixture público sustituya el SDK de la plataforma por su doble. Lo autenticado se prueba en local con el doble.
process.env['PLAYWRIGHT_REAL_QA'] = 'true';
// Las superficies autenticadas no prueban la PWA. El worker se valida por separado
// en Chromium y aquí se bloquea para que un despliegue recién publicado no mezcle chunks.
process.env['PLAYWRIGHT_BLOCK_SERVICE_WORKERS'] = 'true';

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
    use: { ...baseConfig.use, baseURL, serviceWorkers: 'block' },
    projects: [
        {
            name: 'chromium',
            testMatch: /.*\.integration\.spec\.ts/,
            use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, trace: 'off', screenshot: 'off', video: 'off' }
        },
        {
            name: 'firefox',
            testMatch: /.*\.integration\.spec\.ts/,
            use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 }, trace: 'off', screenshot: 'off', video: 'off' }
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
