import { expect } from '@playwright/test';
import { QaEnvironment, verifyQaEnvironmentWithFetch } from './qa-environment';

export type QaScenario = 'baseline' | 'version-conflict' | 'expired-sessions' | 'rate-limited' | 'realtime-recovery';

export interface QaFixture {
    Type: string;
    Id: number;
    Metadata: Record<string, unknown>;
}

export interface QaFixturesResponse {
    success: true;
    Environment: 'qa';
    DatasetVersion: string;
    ResetInProgress: boolean;
    Fixtures: Record<string, QaFixture>;
}

export interface QaResetResponse extends QaFixturesResponse {
    Scenario: QaScenario;
    StartedAt: string;
    CompletedAt: string;
}

type QaCampaignCapability = 'ContinueCampaign' | 'Reset' | 'Cleanup';
type QaCapabilityState = 'allowed' | 'retry' | 'blocked' | 'not-needed';

interface QaStatusResponse {
    success: true;
    Environment: 'qa';
    DatasetVersion: string;
    Status: 'ready' | 'degraded' | 'blocked';
    Reasons: string[];
    Scenario: { Active: QaScenario; ResetInProgress: boolean };
    Lease: { Active: boolean; CallerState: 'absent' | 'active' | 'invalid' };
    Capabilities: {
        BeginCampaign: 'allowed' | 'blocked';
        ContinueCampaign: 'allowed' | 'blocked';
        Reset: 'allowed' | 'retry' | 'blocked';
        Cleanup: QaCapabilityState;
    };
}

const CONTROL_REQUEST_TIMEOUT_MS = 30_000;
const CONTROL_RETRY_TIMEOUT_MS = 110_000;
const CONTROL_RETRY_INTERVAL_MS = 1_000;

export async function resetQaDataset(qa: QaEnvironment, scenario: QaScenario = 'baseline', capability: 'Reset' | 'Cleanup' = 'Reset'): Promise<QaResetResponse> {
    const verified = await verifyQaEnvironmentWithFetch(qa);
    await waitForQaCapability(verified, capability);
    const body = await controlJson<QaResetResponse>(`${qa.apiUrl}qa/reset`, {
        method: 'POST',
        headers: controlHeaders(),
        body: JSON.stringify({ Scenario: scenario })
    }, ['qa_reset_in_progress']);
    assertFixtureResponse(body, verified, scenario);
    return body;
}

export async function getQaFixtures(qa: QaEnvironment): Promise<QaFixturesResponse> {
    const verified = await verifyQaEnvironmentWithFetch(qa);
    await waitForQaCapability(verified, 'ContinueCampaign');
    const body = await controlJson<QaFixturesResponse>(`${qa.apiUrl}qa/fixtures`, { headers: controlHeaders() });
    assertFixtureResponse(body, verified);
    return body;
}

async function waitForQaCapability(qa: QaEnvironment, capability: QaCampaignCapability): Promise<QaStatusResponse> {
    const deadline = Date.now() + CONTROL_RETRY_TIMEOUT_MS;
    while (true) {
        const status = await controlJson<QaStatusResponse>(`${qa.apiUrl}qa/status`, { headers: controlHeaders() });
        assertStatusResponse(status, qa);
        const value = status.Capabilities[capability];
        if (value === 'allowed') return status;
        if (value === 'retry' && Date.now() < deadline) {
            await new Promise(resolve => setTimeout(resolve, CONTROL_RETRY_INTERVAL_MS));
            continue;
        }
        throw new Error(`/qa/status impide ${capability}: ${value}; Reasons=${status.Reasons.join(',') || 'none'}.`);
    }
}

function assertStatusResponse(body: QaStatusResponse, qa: QaEnvironment): void {
    const reasons = new Set([
        'reset_in_progress', 'campaign_lease_active', 'caller_lease_invalid', 'api_source_dirty',
        'gateway_source_dirty_or_unknown', 'release_unavailable', 'release_mismatch',
        'component_degraded', 'component_unavailable'
    ]);
    expect(body.success).toBe(true);
    expect(body.Environment).toBe('qa');
    expect(body.DatasetVersion).toBe(qa.datasetVersion);
    expect(['ready', 'degraded', 'blocked']).toContain(body.Status);
    expect(new Set(body.Reasons).size).toBe(body.Reasons.length);
    for (const reason of body.Reasons) expect(reasons.has(reason), `Reason QA desconocida: ${reason}`).toBe(true);
    expect(['baseline', 'version-conflict', 'expired-sessions', 'rate-limited', 'realtime-recovery']).toContain(body.Scenario.Active);
    expect(typeof body.Scenario.ResetInProgress).toBe('boolean');
    expect(body.Lease.Active).toBe(true);
    expect(body.Lease.CallerState).toBe('active');
    expect(['allowed', 'blocked']).toContain(body.Capabilities.BeginCampaign);
    expect(['allowed', 'blocked']).toContain(body.Capabilities.ContinueCampaign);
    expect(['allowed', 'retry', 'blocked']).toContain(body.Capabilities.Reset);
    expect(['allowed', 'retry', 'blocked', 'not-needed']).toContain(body.Capabilities.Cleanup);
}

export function fixture(fixtures: QaFixturesResponse, alias: string): QaFixture {
    const value = fixtures.Fixtures[alias];
    expect(value, `Falta el alias QA ${alias}`).toBeTruthy();
    return value;
}

function assertFixtureResponse(body: QaFixturesResponse, qa: QaEnvironment, scenario?: QaScenario): void {
    expect(body.success).toBe(true);
    expect(body.Environment).toBe('qa');
    expect(body.DatasetVersion).toBe(qa.datasetVersion);
    expect(body.ResetInProgress).toBe(false);
    expect(Object.keys(body.Fixtures)).toHaveLength(37);
    if (scenario) expect((body as QaResetResponse).Scenario).toBe(scenario);
}

function controlHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'X-QA-Reset-Token': requiredSecret('QA_RESET_TOKEN'),
        'X-QA-Lease-Id': requiredSecret('QA_LEASE_ID')
    };
}

async function controlJson<T>(url: string, init: RequestInit, retryCodes: string[] = []): Promise<T> {
    const deadline = Date.now() + CONTROL_RETRY_TIMEOUT_MS;
    while (true) {
        const response = await fetch(url, { ...init, signal: AbortSignal.timeout(CONTROL_REQUEST_TIMEOUT_MS) });
        let body: unknown;
        try { body = await response.json(); }
        catch { throw new Error(`${new URL(url).pathname} no devolvio JSON (${response.status}).`); }
        if (response.ok) return body as T;

        const code = typeof body === 'object' && body !== null && typeof (body as { code?: unknown }).code === 'string'
            ? (body as { code: string }).code
            : '';
        if (response.status === 409 && retryCodes.includes(code) && Date.now() < deadline) {
            await new Promise(resolve => setTimeout(resolve, CONTROL_RETRY_INTERVAL_MS));
            continue;
        }
        const codeSuffix = code ? `, codigo ${code}` : '';
        throw new Error(`${new URL(url).pathname} respondio ${response.status}${codeSuffix}.`);
    }
}

function requiredSecret(name: 'QA_RESET_TOKEN' | 'QA_LEASE_ID'): string {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`${name} debe proceder de secretos locales o CI.`);
    return value;
}
