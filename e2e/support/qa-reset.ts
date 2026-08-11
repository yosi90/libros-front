import { APIRequestContext, expect } from '@playwright/test';
import { QaEnvironment, verifyQaEnvironment } from './qa-environment';

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

export async function resetQaDataset(request: APIRequestContext, qa: QaEnvironment, scenario: QaScenario = 'baseline'): Promise<QaResetResponse> {
    const token = process.env['QA_RESET_TOKEN'];
    const leaseId = process.env['QA_LEASE_ID'];
    expect(token, 'QA_RESET_TOKEN debe proceder de secretos locales o CI.').toBeTruthy();
    expect(leaseId, 'QA_LEASE_ID debe proceder de la lease adquirida por el runner.').toBeTruthy();
    const verified = await verifyQaEnvironment(request, qa);

    const response = await request.post(`${qa.apiUrl}qa/reset`, {
        headers: { 'X-QA-Reset-Token': token!, 'X-QA-Lease-Id': leaseId! },
        data: { Scenario: scenario }
    });
    expect(response.ok(), 'El reset QA protegido debe ser idempotente y finalizar correctamente.').toBeTruthy();
    const body = await response.json() as QaResetResponse;
    assertFixtureResponse(body, verified, scenario);
    return body;
}

export async function getQaFixtures(request: APIRequestContext, qa: QaEnvironment): Promise<QaFixturesResponse> {
    const token = process.env['QA_RESET_TOKEN'];
    const leaseId = process.env['QA_LEASE_ID'];
    expect(token, 'QA_RESET_TOKEN debe proceder de secretos locales o CI.').toBeTruthy();
    expect(leaseId, 'QA_LEASE_ID debe proceder de la lease adquirida por el runner.').toBeTruthy();
    const verified = await verifyQaEnvironment(request, qa);
    const response = await request.get(`${qa.apiUrl}qa/fixtures`, {
        headers: { 'X-QA-Reset-Token': token!, 'X-QA-Lease-Id': leaseId! }
    });
    expect(response.ok(), 'GET /qa/fixtures debe resolver los aliases del dataset').toBeTruthy();
    const body = await response.json() as QaFixturesResponse;
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
