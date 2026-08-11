import assert from 'node:assert/strict';
import test from 'node:test';
import { assertRuntimeContract, assertVerifyContract, qaSettings } from './campaign-control.mjs';

const environment = {
    QA_API_BASE_URL: 'https://qa-api.yosiftware.es',
    QA_FRONT_BASE_URL: 'https://libros-qa.web.app',
    QA_DATASET_VERSION: '2026.08.2',
    QA_FIREBASE_PROJECT_ID: 'libros-qa',
    QA_FIREBASE_SITE_ID: 'libros-qa',
    QA_RESET_TOKEN: 'test-only',
    GITHUB_RUN_ID: '123',
    GITHUB_RUN_ATTEMPT: '2'
};

test('acepta únicamente la configuración QA acordada', () => {
    const settings = qaSettings(environment);
    assert.equal(settings.apiUrl, 'https://qa-api.yosiftware.es');
    assert.equal(settings.runId, '123-2');
    assert.throws(() => qaSettings({ ...environment, QA_FIREBASE_PROJECT_ID: 'yosiftware-libros' }), /no coincide/);
});

test('exige versión, SQL y runtime config coherentes', () => {
    const settings = qaSettings(environment);
    assert.doesNotThrow(() => assertVerifyContract({
        Entorno: 'qa',
        VersionDatasetQa: '2026.08.2',
        Componentes: { sqlServer: { Estado: 'healthy' } }
    }, settings));
    assert.throws(() => assertVerifyContract({
        Entorno: 'qa',
        VersionDatasetQa: '2026.08.2',
        Componentes: { sqlServer: { Estado: 'unavailable' } }
    }, settings), /SQL Server/);

    assert.doesNotThrow(() => assertRuntimeContract({
        Environment: 'qa',
        QaDatasetVersion: '2026.08.2',
        RealtimeWsUrl: 'wss://qa-ws.yosiftware.es',
        Firebase: { ProjectId: 'libros-qa' }
    }, settings));
});
