import assert from 'node:assert/strict';
import test from 'node:test';
import { assertRuntimeContract, assertVerifyContract, assertVerifyIdentityContract, qaSettings, requestJsonWithRetry, resetBaseline } from './campaign-control.mjs';
import { LEASE_KEEPALIVE_INTERVAL_MS, runWithLeaseKeepalive } from './run-with-lease.mjs';

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
        ReleaseId: 'backend-release',
        SourceDirty: false,
        Componentes: {
            sqlServer: { Estado: 'healthy' },
            realtimeGateway: { ReleaseId: 'backend-release', SourceDirty: false }
        }
    }, settings));
    assert.throws(() => assertVerifyContract({
        Entorno: 'qa',
        VersionDatasetQa: '2026.08.2',
        ReleaseId: 'backend-release',
        SourceDirty: false,
        Componentes: {
            sqlServer: { Estado: 'unavailable' },
            realtimeGateway: { ReleaseId: 'backend-release', SourceDirty: false }
        }
    }, settings), /SQL Server/);

    assert.throws(() => assertVerifyContract({
        Entorno: 'qa',
        VersionDatasetQa: '2026.08.2',
        ReleaseId: 'api-release',
        SourceDirty: false,
        Componentes: {
            sqlServer: { Estado: 'healthy' },
            realtimeGateway: { ReleaseId: 'gateway-release', SourceDirty: false }
        }
    }, settings), /revisión API\/gateway/);

    assert.throws(() => assertVerifyContract({
        Entorno: 'qa',
        VersionDatasetQa: '2026.08.2',
        ReleaseId: 'backend-release',
        SourceDirty: true,
        Componentes: {
            sqlServer: { Estado: 'healthy' },
            realtimeGateway: { ReleaseId: 'backend-release', SourceDirty: false }
        }
    }, settings), /SourceDirty/);

    assert.doesNotThrow(() => assertRuntimeContract({
        Environment: 'qa',
        QaDatasetVersion: '2026.08.2',
        RealtimeWsUrl: 'wss://qa-ws.yosiftware.es',
        Firebase: { ProjectId: 'libros-qa' }
    }, settings));
});

test('el guard destructivo conserva la identidad QA aunque la salud de despliegue fluctúe', () => {
    const settings = qaSettings(environment);
    assert.doesNotThrow(() => assertVerifyIdentityContract({
        Entorno: 'qa',
        VersionDatasetQa: '2026.08.2',
        ReleaseId: 'transient-release',
        SourceDirty: true,
        Componentes: {
            sqlServer: { Estado: 'unavailable' },
            realtimeGateway: { ReleaseId: 'other-release', SourceDirty: true }
        }
    }, settings));
    assert.throws(() => assertVerifyIdentityContract({
        Entorno: 'production',
        VersionDatasetQa: '2026.08.2'
    }, settings), /Entorno/);
    assert.throws(() => assertVerifyIdentityContract({
        Entorno: 'qa',
        VersionDatasetQa: 'unexpected'
    }, settings), /VersionDatasetQa/);
});

test('el cleanup restaura baseline aunque SourceDirty cambie después de la barrera inicial', async () => {
    const settings = { ...qaSettings(environment), leaseId: 'lease-test' };
    const calls = [];
    const responses = [
        jsonResponse(200, {
            Entorno: 'qa',
            VersionDatasetQa: '2026.08.2',
            ReleaseId: 'transient-release',
            SourceDirty: true,
            Componentes: { realtimeGateway: { ReleaseId: 'other-release', SourceDirty: true } }
        }),
        jsonResponse(200, {
            Environment: 'qa',
            QaDatasetVersion: '2026.08.2',
            RealtimeWsUrl: 'wss://qa-ws.yosiftware.es',
            Firebase: { ProjectId: 'libros-qa' }
        }),
        jsonResponse(200, {
            Environment: 'qa',
            DatasetVersion: '2026.08.2',
            Scenario: 'baseline'
        })
    ];
    const fetchImpl = async (url, init = {}) => {
        calls.push({ url, init });
        return responses.shift();
    };

    await resetBaseline(settings, fetchImpl);

    assert.equal(calls.length, 3);
    assert.equal(calls[2].url, 'https://qa-api.yosiftware.es/qa/reset');
    assert.equal(calls[2].init.method, 'POST');
    assert.equal(calls[2].init.headers['X-QA-Lease-Id'], 'lease-test');
    assert.deepEqual(JSON.parse(calls[2].init.body), { Scenario: 'baseline' });
});

test('mantiene la lease con un intervalo inferior a cuatro minutos', async () => {
    assert.equal(LEASE_KEEPALIVE_INTERVAL_MS, 180_000);
    const settings = { ...qaSettings(environment), leaseId: 'lease-test' };
    const renewals = [];
    let finishChild;
    let releaseInterval;
    const child = {
        completion: new Promise(resolve => { finishChild = resolve; }),
        terminate: async () => { finishChild(143); }
    };
    const running = runWithLeaseKeepalive(settings, 'test-command', [], {
        renewLease: async () => { renewals.push(Date.now()); },
        startProcess: () => child,
        waitForInterval: () => ({
            promise: new Promise(resolve => { releaseInterval = resolve; }),
            cancel: () => releaseInterval()
        })
    });

    await new Promise(resolve => setImmediate(resolve));
    releaseInterval();
    await new Promise(resolve => setImmediate(resolve));
    finishChild(0);
    await running;

    assert.equal(renewals.length, 2);
});

test('aborta la operación protegida si falla una renovación', async () => {
    const settings = { ...qaSettings(environment), leaseId: 'lease-test' };
    let renewal = 0;
    let terminated = false;
    let finishChild;
    const child = {
        completion: new Promise(resolve => { finishChild = resolve; }),
        terminate: async () => { terminated = true; finishChild(143); }
    };

    await assert.rejects(() => runWithLeaseKeepalive(settings, 'test-command', [], {
        renewLease: async () => {
            renewal++;
            if (renewal === 2) throw new Error('lease expired');
        },
        startProcess: () => child,
        waitForInterval: () => ({ promise: Promise.resolve(), cancel: () => void 0 })
    }), /Falló el keepalive/);
    assert.equal(terminated, true);
});

test('reintenta únicamente conflictos transitorios de control QA', async () => {
    const responses = [
        jsonResponse(409, { code: 'qa_reset_in_progress' }),
        jsonResponse(200, { success: true })
    ];
    let waits = 0;
    const body = await requestJsonWithRetry(async () => responses.shift(), 'https://qa-api.yosiftware.es/qa/reset', {}, 200, {
        retryCodes: ['qa_reset_in_progress'],
        wait: async () => { waits++; }
    });

    assert.deepEqual(body, { success: true });
    assert.equal(waits, 1);
});

test('no relaja conflictos ajenos a la operación transitoria', async () => {
    await assert.rejects(() => requestJsonWithRetry(
        async () => jsonResponse(409, { code: 'qa_lease_invalid' }),
        'https://qa-api.yosiftware.es/qa/reset',
        {},
        200,
        { retryCodes: ['qa_reset_in_progress'], wait: async () => void 0 }
    ), /qa_lease_invalid/);
});

function jsonResponse(status, body) {
    return { status, json: async () => body };
}
