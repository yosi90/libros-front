import { spawn, spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium, firefox } from '@playwright/test';
import { fixtures } from '../../../qa/rtf-fixtures.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const outputRoot = path.join(root, 'test-results', 'rtf-interop');
const harnessProject = path.join(root, 'qa', 'winforms-rtf-harness', 'WinformsRtfHarness.csproj');
const harnessExecutable = path.join(root, 'qa', 'winforms-rtf-harness', 'bin', 'Release', 'net10.0-windows10.0.17763.0', 'WinformsRtfHarness.exe');
const adapterEntry = path.join(root, 'scripts', 'qa', 'rtf-interop', 'web-adapter.ts');
const adapterBundle = path.join(outputRoot, 'web-adapter.js');
const corpusReader = path.join(root, 'scripts', 'qa', 'rtf-interop', 'read-local-corpus.ps1');
const expectedCorpus = { escena: 952, entrada: 365, total: 1317 };

function fail(message) {
    throw new Error(message);
}

function runChecked(command, args, options = {}) {
    const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', stdio: 'inherit', ...options });
    if (result.error)
        throw result.error;
    if (result.status !== 0)
        fail(`${command} termino con codigo ${result.status}.`);
}

async function prepareTools() {
    await mkdir(outputRoot, { recursive: true });
    runChecked('dotnet', ['build', harnessProject, '--configuration', 'Release', '--nologo']);
    await build({
        entryPoints: [adapterEntry],
        outfile: adapterBundle,
        bundle: true,
        format: 'iife',
        platform: 'browser',
        target: 'es2022',
        logLevel: 'info'
    });
}

async function loadCorpus() {
    const child = spawn('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', corpusReader], {
        cwd: root,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
    });
    const items = [];
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => { stderr += chunk; });
    const completion = new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('close', resolve);
    });

    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
    for await (const line of lines) {
        if (!line.trim())
            continue;
        const item = JSON.parse(line);
        if (!item.id || !item.rtfBase64)
            fail('El lector SQL produjo un registro incompleto.');
        items.push(item);
    }

    const exitCode = await completion;
    if (exitCode !== 0)
        fail(`No se pudo leer el corpus SQL de solo lectura. ${stderr.trim()}`.trim());

    const counts = items.reduce((value, item) => {
        value[item.surface] = (value[item.surface] ?? 0) + 1;
        return value;
    }, {});
    if (items.length !== expectedCorpus.total || counts.escena !== expectedCorpus.escena || counts.entrada !== expectedCorpus.entrada)
        fail(`Corpus inesperado: escenas=${counts.escena ?? 0}, entradas=${counts.entrada ?? 0}, total=${items.length}.`);
    return items;
}

class HarnessClient {
    constructor() {
        this.child = spawn(harnessExecutable, [], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
        this.lines = createInterface({ input: this.child.stdout, crlfDelay: Infinity })[Symbol.asyncIterator]();
        this.stderr = '';
        this.child.stderr.setEncoding('utf8');
        this.child.stderr.on('data', chunk => { this.stderr += chunk; });
    }

    async compare(id, leftRtf, rightRtf) {
        const request = {
            id,
            leftRtfBase64: Buffer.from(leftRtf, 'utf8').toString('base64'),
            rightRtfBase64: Buffer.from(rightRtf, 'utf8').toString('base64')
        };
        if (!this.child.stdin.write(`${JSON.stringify(request)}\n`))
            await new Promise(resolve => this.child.stdin.once('drain', resolve));
        const result = await this.lines.next();
        if (result.done)
            fail(`El harness RichEdit termino antes de responder. ${this.stderr.trim()}`.trim());
        return JSON.parse(result.value);
    }

    async close() {
        this.child.stdin.end();
        await new Promise(resolve => {
            if (this.child.exitCode !== null)
                resolve();
            else
                this.child.once('close', resolve);
        });
    }
}

async function openAdapter(browserType) {
    const browser = await browserType.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ content: await readFile(adapterBundle, 'utf8') });
    const ready = await page.evaluate(() => typeof window.__rtfInterop?.roundTrip === 'function');
    if (!ready)
        fail('El adaptador RTF no quedo disponible en el navegador.');
    return { browser, page };
}

async function roundTrip(page, rtf) {
    return page.evaluate(value => window.__rtfInterop.roundTrip(value), rtf);
}

async function serializeHtml(page, html) {
    return page.evaluate(value => window.__rtfInterop.serialize(value), html);
}

function safeResult(browser, direction, id, response) {
    return {
        browser,
        direction,
        id,
        equal: response.equal,
        leftSha256: response.leftSha256,
        rightSha256: response.rightSha256,
        leftSummary: response.leftSummary,
        rightSummary: response.rightSummary,
        differences: response.differences,
        errorCode: response.errorCode ?? null,
        errorMessage: response.errorMessage ?? null
    };
}

async function compareFixtureSet(browserName, page, harness) {
    const results = [];
    for (const fixture of fixtures) {
        const candidate = await roundTrip(page, fixture.sourceRtf);
        const roundTripResponse = await harness.compare(`${browserName}:${fixture.id}:richedit-web-richedit`, fixture.sourceRtf, candidate);
        results.push(safeResult(browserName, 'richedit-web-richedit', fixture.id, roundTripResponse));

        if (fixture.webHtml) {
            const webRtf = await serializeHtml(page, fixture.webHtml);
            const webResponse = await harness.compare(`${browserName}:${fixture.id}:web-richedit`, fixture.sourceRtf, webRtf);
            results.push(safeResult(browserName, 'web-richedit', fixture.id, webResponse));
        }
    }
    return results;
}

async function compareCorpus(browserName, page, harness, corpus) {
    const failures = [];
    let scene2297 = null;
    let processed = 0;
    for (const item of corpus) {
        const sourceRtf = Buffer.from(item.rtfBase64, 'base64').toString('utf8');
        const candidate = await roundTrip(page, sourceRtf);
        const response = await harness.compare(`${browserName}:${item.id}`, sourceRtf, candidate);
        processed++;
        if (item.id === 'escena:2297')
            scene2297 = response.leftSummary;
        if (!response.equal)
            failures.push(safeResult(browserName, 'richedit-web-richedit', item.id, response));
        if (processed % 100 === 0)
            console.log(`${browserName}: ${processed}/${corpus.length}`);
    }

    if (!scene2297 || scene2297.leadingNewline || scene2297.paragraphCount !== 3)
        fail(`${browserName}: la escena 2297 no conserva tres parrafos sin salto inicial.`);
    return { browser: browserName, processed, failures, scene2297 };
}

async function main() {
    if (process.platform !== 'win32')
        fail('La comprobacion RTF requiere Windows y RichEdit.');
    const mode = process.argv[2];
    if (!['--fixtures', '--corpus'].includes(mode))
        fail('Uso: node scripts/qa/rtf-interop/run.mjs --fixtures|--corpus');

    await prepareTools();
    const corpus = mode === '--corpus' ? await loadCorpus() : null;
    const harness = new HarnessClient();
    const report = {
        schemaVersion: 1,
        mode: mode.slice(2),
        generatedAt: new Date().toISOString(),
        containsDocumentContent: false,
        expectedCorpus: mode === '--corpus' ? expectedCorpus : null,
        browsers: []
    };

    try {
        for (const [browserName, browserType] of [['chromium', chromium], ['firefox', firefox]]) {
            const { browser, page } = await openAdapter(browserType);
            try {
                if (mode === '--fixtures') {
                    const results = await compareFixtureSet(browserName, page, harness);
                    report.browsers.push({ browser: browserName, processed: results.length, failures: results.filter(result => !result.equal) });
                } else {
                    report.browsers.push(await compareCorpus(browserName, page, harness, corpus));
                }
            } finally {
                await browser.close();
            }
        }
    } finally {
        await harness.close();
    }

    const reportPath = path.join(outputRoot, `${report.mode}-report.json`);
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    const failureCount = report.browsers.reduce((count, browser) => count + browser.failures.length, 0);
    console.log(`Informe seguro: ${path.relative(root, reportPath)}`);
    if (failureCount > 0)
        fail(`Se detectaron ${failureCount} diferencias RTF. El informe no contiene textos.`);
    console.log(`RTF ${report.mode}: equivalencia completa en Chromium y Firefox.`);
}

main().catch(error => {
    console.error(error instanceof Error ? error.message : 'Fallo desconocido en la campaña RTF.');
    process.exitCode = 1;
});
