import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { qaSettings, renewQaLease } from './campaign-control.mjs';

export const LEASE_KEEPALIVE_INTERVAL_MS = 180_000;

export async function runWithLeaseKeepalive(settings, command, args = [], options = {}) {
    if (!settings.leaseId) throw new Error('QA_LEASE_ID es obligatoria para ejecutar una operación protegida.');
    if (!command?.trim()) throw new Error('Falta el comando que debe ejecutar el keepalive de lease.');

    const renewLease = options.renewLease || renewQaLease;
    const startProcess = options.startProcess || startChildProcess;
    const intervalMs = options.intervalMs || LEASE_KEEPALIVE_INTERVAL_MS;
    const waitForInterval = options.waitForInterval || cancellableDelay;
    if (intervalMs > 240_000) throw new Error('El intervalo de keepalive no puede superar cuatro minutos.');

    await renewLease(settings);
    const child = startProcess(command, args);
    let activeDelay = null;
    let stopped = false;
    let renewalFailure = null;

    const keepalive = (async () => {
        while (!stopped) {
            activeDelay = waitForInterval(intervalMs);
            await activeDelay.promise;
            activeDelay = null;
            if (stopped) break;
            try {
                await renewLease(settings);
            } catch (error) {
                renewalFailure = error instanceof Error ? error : new Error(String(error));
                await child.terminate();
                break;
            }
        }
    })();

    const exitCode = await child.completion;
    stopped = true;
    activeDelay?.cancel();
    await keepalive;

    if (renewalFailure)
        throw new Error(`Falló el keepalive de la lease QA: ${renewalFailure.message}`);
    if (exitCode !== 0)
        throw new Error(`La operación protegida por lease terminó con código ${exitCode}.`);
}

function startChildProcess(command, args) {
    const child = spawn(command, args, {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        detached: process.platform !== 'win32'
    });
    let settled = false;
    const completion = new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('close', code => {
            settled = true;
            resolve(code ?? 1);
        });
    });

    return {
        completion,
        async terminate() {
            if (settled || !child.pid) return;
            killChildProcess(child, 'SIGTERM');
            const forceKill = setTimeout(() => {
                if (!settled) killChildProcess(child, 'SIGKILL');
            }, 5_000);
            try { await completion; }
            catch { /* El error de renovacion sigue siendo la causa principal. */ }
            finally { clearTimeout(forceKill); }
        }
    };
}

function killChildProcess(child, signal) {
    try {
        if (process.platform === 'win32') child.kill(signal);
        else process.kill(-child.pid, signal);
    } catch {
        try { child.kill(signal); }
        catch { /* El proceso ya puede haber terminado. */ }
    }
}

function cancellableDelay(intervalMs) {
    let resolveDelay;
    const timer = setTimeout(() => resolveDelay(), intervalMs);
    return {
        promise: new Promise(resolve => { resolveDelay = resolve; }),
        cancel() {
            clearTimeout(timer);
            resolveDelay();
        }
    };
}

async function main() {
    const [command, ...args] = process.argv.slice(2);
    await runWithLeaseKeepalive(qaSettings(), command, args);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch(error => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    });
}
