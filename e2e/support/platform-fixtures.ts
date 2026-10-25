import type { Page, Request, Route } from '@playwright/test';
import { localAccount, localUser } from './local-visual-session';

// Lo que comparten las pruebas que simulan la API de la plataforma (`/v1/…`) junto a la de Libros.

/** La persona de la sesión local tal como la cuenta la plataforma (`PlataformaPersona`). */
export const localPlatformPerson = { ...localAccount, nombre: localUser.Nombre, avatar: null };

/** Responde una ruta simulada con JSON. */
export const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

/**
 * Apunta las llamadas a rutas de la API de Libros que la adhesión retiró (RUTAS_RETIRADAS.md): la web no las pide
 * nunca. Las de la plataforma (`/v1/…` o su dominio de cuentas) no cuentan. Se compara la ruta con su consulta.
 */
export function watchRetiredCalls(page: Page, retired: readonly RegExp[]): string[] {
    const calls: string[] = [];
    page.on('request', (request: Request) => {
        const url = new URL(request.url());
        if (url.pathname.startsWith('/v1/') || url.hostname.includes('cuentas')) return;
        if (retired.some(pattern => pattern.test(url.pathname + url.search))) calls.push(`${request.method()} ${url.pathname}`);
    });
    return calls;
}
