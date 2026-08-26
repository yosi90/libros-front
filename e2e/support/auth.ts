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
    const email = page.getByLabel('Correo electrónico');
    const password = page.getByLabel('Introduce tu contraseña');
    await email.fill(credentials.email);
    await password.fill(credentials.password);
    const sessionPromise = page.waitForResponse(response => response.url().endsWith('/auth/session')
        && response.request().method() === 'POST', { timeout: 60_000 });
    try {
        await page.getByRole('button', { name: 'Iniciar sesión' }).click();
        const session = await sessionPromise;
        const status = session.status();
        if (status !== 200)
            throw new Error(`La sesión password respondió ${status} (${await safeResponseCode(session)}).`);
        await page.waitForURL(/\/dashboard(?:\/|$)/, { timeout: 60_000 });
    } catch (error) {
        const notice = await page.locator('.mat-mdc-snack-bar-label, [role="alert"], [role="status"]')
            .allTextContents().catch(() => []);
        await password.fill('').catch(() => undefined);
        await email.fill('').catch(() => undefined);
        const detail = notice.map(value => value.trim()).filter(Boolean).join(' | ').slice(0, 240);
        throw new Error(`El login UI no completó la navegación${detail ? `: ${detail}` : '.'}`, { cause: error });
    }
}

async function safeResponseCode(response: { json(): Promise<unknown> }): Promise<string> {
    try {
        const body = await response.json() as { code?: unknown };
        return typeof body.code === 'string' ? body.code : 'sin código contractual';
    } catch {
        return 'respuesta no JSON';
    }
}

export async function loginThroughApi(request: APIRequestContext, qa: QaEnvironment, credentials: QaCredentials): Promise<string> {
    const runtimeResponse = await request.get(`${qa.apiUrl}runtime-config`);
    expect(runtimeResponse.ok(), 'QA debe publicar su runtime config').toBeTruthy();
    const runtime = await runtimeResponse.json() as { Firebase?: { ApiKey?: string } };
    expect(runtime.Firebase?.ApiKey, 'Runtime config debe publicar Firebase.ApiKey').toBeTruthy();

    const firebaseResponse = await request.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(runtime.Firebase!.ApiKey!)}`,
        { data: { email: credentials.email, password: credentials.password, returnSecureToken: true } }
    );
    expect(firebaseResponse.ok(), 'Firebase QA debe aceptar la identidad sembrada').toBeTruthy();
    const firebase = await firebaseResponse.json() as { idToken?: string };
    expect(firebase.idToken, 'Firebase QA debe entregar ID token').toBeTruthy();

    const sessionResponse = await request.post(`${qa.apiUrl}auth/session`, {
        data: { FirebaseIdToken: firebase.idToken, Device: { Name: 'Playwright API', Platform: 'qa' } }
    });
    expect(sessionResponse.ok(), 'Libros API debe intercambiar la identidad Firebase').toBeTruthy();
    const session = await sessionResponse.json() as { Estado?: string; AccessToken?: string };
    expect(session.Estado).toBe('authenticated');
    expect(session.AccessToken, 'Libros API debe entregar access token en memoria').toBeTruthy();
    return session.AccessToken!;
}
