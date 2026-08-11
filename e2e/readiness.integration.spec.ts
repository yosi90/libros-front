import { expect, integrationTest as test } from './fixtures/integration';

test('el entorno aislado se identifica antes de la campaña @integration', async ({ qaEnvironment }, testInfo) => {
    test.skip(!['chromium', 'firefox'].includes(testInfo.project.name), 'La integracion completa se ejecuta en navegadores desktop.');
    expect(qaEnvironment.datasetVersion).toBeTruthy();
});
