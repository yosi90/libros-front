import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { findEvidenceSecretLeaks, secretNeedles } from './scan-evidence-secrets.mjs';

const require = createRequire(import.meta.url);
const { yazl } = require('playwright-core/lib/utilsBundle');

const environment = {
    QA_RESET_TOKEN: 'reset-test-value',
    QA_ADMIN_PASSWORD: 'admin-test-value',
    QA_MODERATOR_PASSWORD: 'moderator-test-value',
    QA_USER_A_PASSWORD: 'member-a-test-value',
    QA_USER_B_PASSWORD: 'member-b-test-value',
    QA_LEASE_ID: 'lease-test-value'
};

test('detecta valores sensibles crudos y codificados sin imprimirlos', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'libros-qa-evidence-'));
    try {
        const evidence = path.join(root, 'test-results');
        await mkdir(evidence, { recursive: true });
        await writeFile(path.join(evidence, 'call-log.txt'), `header=${environment.QA_RESET_TOKEN}\npassword=${encodeURIComponent(environment.QA_USER_A_PASSWORD)}`);

        const leaks = await findEvidenceSecretLeaks(['test-results'], environment, root);
        assert.deepEqual(leaks.map(leak => leak.secret).sort(), ['QA_RESET_TOKEN', 'QA_USER_A_PASSWORD']);
    } finally { await rm(root, { recursive: true, force: true }); }
});

test('revisa solo la evidencia publicable y excluye estados autenticados', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'libros-qa-evidence-'));
    try {
        await mkdir(path.join(root, 'test-results', 'auth'), { recursive: true });
        await writeFile(path.join(root, 'test-results', 'auth', 'chromium.json'), environment.QA_ADMIN_PASSWORD);
        await writeFile(path.join(root, 'test-results', 'report.json'), '{"status":"passed"}');

        assert.deepEqual(await findEvidenceSecretLeaks(['test-results'], environment, root), []);
        assert.equal(secretNeedles(environment).length, 6);
    } finally { await rm(root, { recursive: true, force: true }); }
});

test('inspecciona el ZIP Base64 incrustado por el reporter HTML de Playwright', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'libros-qa-evidence-'));
    try {
        const report = path.join(root, 'playwright-report');
        await mkdir(report, { recursive: true });
        const archive = await zipBuffer('report.json', JSON.stringify({ callLog: environment.QA_RESET_TOKEN }));
        await writeFile(path.join(report, 'index.html'), `<template id="playwrightReportBase64">data:application/zip;base64,${archive.toString('base64')}</template>`);

        const leaks = await findEvidenceSecretLeaks(['playwright-report'], environment, root);
        assert.deepEqual(leaks, [{ file: 'playwright-report/index.html::<playwright-report>', secret: 'QA_RESET_TOKEN' }]);
    } finally { await rm(root, { recursive: true, force: true }); }
});

function zipBuffer(name, content) {
    return new Promise((resolve, reject) => {
        const archive = new yazl.ZipFile();
        const chunks = [];
        archive.outputStream.on('data', chunk => chunks.push(chunk));
        archive.outputStream.on('error', reject);
        archive.outputStream.on('end', () => resolve(Buffer.concat(chunks)));
        archive.addBuffer(Buffer.from(content, 'utf8'), name);
        archive.end();
    });
}
