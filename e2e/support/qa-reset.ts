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

const CONTROL_TIMEOUT_MS = 90_000;

export async function resetQaDataset(qa: QaEnvironment, scenario: QaScenario = 'baseline'): Promise<QaResetResponse> {
    const verified = await verifyQaEnvironmentWithFetch(qa);
    const body = await controlJson<QaResetResponse>(`${qa.apiUrl}qa/reset`, {
        method: 'POST',
        headers: controlHeaders(),
        body: JSON.stringify({ Scenario: scenario })
    });
    assertFixtureResponse(body, verified, scenario);
    return body;
}

export async function getQaFixtures(qa: QaEnvironment): Promise<QaFixturesResponse> {
    const verified = await verifyQaEnvironmentWithFetch(qa);
    const body = await controlJson<QaFixturesResponse>(`${qa.apiUrl}qa/fixtures`, { headers: controlHeaders() });
    assertFixtureResponse(body, verified);
    return body;
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
    expect(Object.keys(body.Fixtures)).toHaveLength(36);
    if (scenario) expect((body as QaResetResponse).Scenario).toBe(scenario);
}

function controlHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'X-QA-Reset-Token': requiredSecret('QA_RESET_TOKEN'),
        'X-QA-Lease-Id': requiredSecret('QA_LEASE_ID')
    };
}

async function controlJson<T>(url: string, init: RequestInit): Promise<T> {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(CONTROL_TIMEOUT_MS) });
    let body: unknown;
    try { body = await response.json(); }
    catch { throw new Error(`${new URL(url).pathname} no devolvio JSON (${response.status}).`); }
    if (!response.ok) {
        const code = typeof body === 'object' && body !== null && typeof (body as { code?: unknown }).code === 'string'
            ? `, codigo ${(body as { code: string }).code}`
            : '';
        throw new Error(`${new URL(url).pathname} respondio ${response.status}${code}.`);
    }
    return body as T;
}

function requiredSecret(name: 'QA_RESET_TOKEN' | 'QA_LEASE_ID'): string {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`${name} debe proceder de secretos locales o CI.`);
    return value;
}
