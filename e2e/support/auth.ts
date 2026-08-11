import { APIRequestContext, expect, Page } from '@playwright/test';
import path from 'node:path';
import { fixture, QaFixturesResponse } from './qa-reset';
import { QaEnvironment } from './qa-environment';

export type QaRole = 'admin' | 'moderator' | 'userA' | 'userB';

export interface QaCredentials {
    email: string;
    password: string;
}

const roleConfig: Record<QaRole, { alias: string; passwordVariable: string }> = {
    admin: { alias: 'user.admin', passwordVariable: 'QA_ADMIN_PASSWORD' },
    moderator: { alias: 'user.moderator', passwordVariable: 'QA_MODERATOR_PASSWORD' },
    userA: { alias: 'user.member-a', passwordVariable: 'QA_USER_A_PASSWORD' },
    userB: { alias: 'user.member-b', passwordVariable: 'QA_USER_B_PASSWORD' }
};

export function credentialsFor(role: QaRole, fixtures: QaFixturesResponse): QaCredentials | null {
    const config = roleConfig[role];
    const email = fixture(fixtures, config.alias).Metadata['Email'];
    const password = process.env[config.passwordVariable];
    return typeof email === 'string' && email.trim() && password ? { email: email.trim(), password } : null;
}

export function authStatePath(role: QaRole, browserName: string): string {
    return path.join('test-results', 'auth', `${browserName}-${role}.json`);
}

export async function loginThroughUi(page: Page, credentials: QaCredentials): Promise<void> {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(credentials.email);
    await page.getByLabel('Introduce tu contraseña').fill(credentials.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL(/\/dashboard(?:\/|$)/, { timeout: 20_000 });
}

export async function loginThroughApi(request: APIRequestContext, qa: QaEnvironment, credentials: QaCredentials): Promise<string> {
    const response = await request.post(`${qa.apiUrl}auth`, { data: credentials });
    expect(response.ok(), 'El login QA debe aceptar la identidad sembrada').toBeTruthy();
    const body = await response.json() as { token?: string };
    expect(body.token, 'El login QA debe entregar access token').toBeTruthy();
    return body.token!;
}
