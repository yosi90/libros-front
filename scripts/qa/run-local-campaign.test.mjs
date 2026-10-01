import assert from 'node:assert/strict';
import test from 'node:test';
import { localQaEnvironment, runLocalCampaign } from './run-local-campaign.mjs';

test('el archivo backend aporta solo las variables QA permitidas', () => {
    const environment = localQaEnvironment('LIBROS_QA_RESET_TOKEN=test-token\nQA_ADMIN_PASSWORD=test-password\nSQL_PASSWORD=not-imported\n', 'QA_API_BASE_URL=https://qa-api.yosiftware.es');
    assert.deepEqual(environment, {
        QA_API_BASE_URL: 'https://qa-api.yosiftware.es', QA_FRONT_BASE_URL: '', QA_DATASET_VERSION: '',
        QA_FIREBASE_PROJECT_ID: '', QA_FIREBASE_SITE_ID: '', QA_ADMIN_PASSWORD: 'test-password', QA_RESET_TOKEN: 'test-token'
    });
    assert.throws(() => localQaEnvironment('QA_LEASE_ID=foreign', ''), /no puede fijar/);
    assert.throws(() => localQaEnvironment('QA_RESET_TOKEN=a\nLIBROS_QA_RESET_TOKEN=b', ''), /distintos/);
});

for (const failure of [null, 'run', 'reset']) {
    test(`el ciclo local renueva, restaura y libera aunque falle ${failure || 'ningun paso'}`, async () => {
        const calls = [];
        const settings = { leaseId: '' };
        const operation = name => async () => {
            calls.push(name);
            if (name === failure) throw new Error(`failed-${name}`);
        };
        const result = runLocalCampaign(settings, 'node', ['test-only'], {
            acquire: async (current, _, exportLease) => { current.leaseId = 'test-lease'; await exportLease('test-lease'); calls.push('acquire'); },
            exportLease: id => assert.equal(id, 'test-lease'),
            run: operation('run'), renew: operation('renew'), reset: operation('reset'), release: operation('release')
        });
        if (failure) await assert.rejects(result, AggregateError);
        else await result;
        assert.deepEqual(calls, ['acquire', 'run', 'renew', 'reset', 'release']);
    });
}

test('una barrera rechazada no ejecuta comandos, resets ni liberaciones ajenas', async () => {
    const settings = { leaseId: '' };
    const forbidden = async () => assert.fail('No debe ejecutarse sin lease propia');
    await assert.rejects(runLocalCampaign(settings, 'node', [], {
        acquire: async () => { throw new Error('guard-rejected'); },
        run: forbidden, renew: forbidden, reset: forbidden, release: forbidden
    }), AggregateError);
});

test('un fallo despues de adquirir conserva la lease para el cleanup', async () => {
    const calls = [];
    await assert.rejects(runLocalCampaign({ leaseId: '' }, 'node', [], {
        acquire: async settings => { settings.leaseId = 'test-lease'; throw new Error('export-failed'); },
        run: async () => assert.fail('No debe ejecutar la campaña'),
        renew: async () => calls.push('renew'), reset: async () => calls.push('reset'), release: async () => calls.push('release')
    }), AggregateError);
    assert.deepEqual(calls, ['renew', 'reset', 'release']);
});
