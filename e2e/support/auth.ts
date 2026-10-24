import { APIRequestContext, Page } from '@playwright/test';
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

/**
 * La campaña de integración entraba con el login propio (formulario, Firebase y `POST /auth/session`), que se retira con
 * la adhesión a Yosiftware. Se rehace en el hito 4 del roadmap del ecosistema con las cuentas de prueba de QA de la
 * plataforma (MIGRACION.md del kit, paso 7) y la verificación A → B → A.
 */
export const PENDIENTE_HITO_4 = 'Pendiente del hito 4 de la adhesión: entraba con el login propio de Libros, retirado; se rehace con las cuentas de prueba de QA de la plataforma Yosiftware.';

export async function loginThroughUi(_page: Page, _credentials: QaCredentials): Promise<void> {
    throw new Error(PENDIENTE_HITO_4);
}

export async function loginThroughApi(_request: APIRequestContext, _qa: QaEnvironment, _credentials: QaCredentials): Promise<string> {
    throw new Error(PENDIENTE_HITO_4);
}
