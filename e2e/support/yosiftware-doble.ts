import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import type { ControlDelDoble, OpcionesDelDoble } from '../../pruebas/yosiftware-doble/yosiftware-doble';

/**
 * El doble oficial del SDK de la plataforma (kit 1.85, `pruebas/yosiftware-doble/`, guía en `ecosistema-kit/PRUEBAS.md`)
 * en lugar de `/sdk/v1/yosiftware.js` (de cualquier entorno). Se instala solo en `window.yosiftware` al cargarse, con las
 * opciones de `window.__YOSIFTWARE_DOBLE__`, y deja su control en `window.yosiftwareDoble`: la prueba cambia de cuenta,
 * entrega eventos del tiempo real o del canal de un espacio y lee lo que la web ha pedido con `page.evaluate`.
 *
 * No registra los elementos del SDK (`<yosi-acceso>`, `<yosi-webs>`, la campana…): en las pruebas son etiquetas vacías.
 * La API de Libros y la de la plataforma (`/v1/chat/…`, `/v1/espacios/…`) se simulan aparte con `page.route`.
 */

/** Lo que el doble acepta desde Playwright: lo que se puede pasar a la página (ni `ventana` ni `fetch`). */
export type YosiftwareDoubleOptions = Omit<OpcionesDelDoble, 'ventana' | 'fetch'>;

/** La ventana de la página con el control del doble, para `page.evaluate`. */
export type WindowWithDouble = Window & { yosiftwareDoble: ControlDelDoble };

/** Los tokens que da el doble a cada cuenta si la prueba no pone otros (`control.ponerTokens`). */
export const doubleToken = (accountId: string) => `doble-api.${accountId}`;
export const doublePlatformToken = (accountId: string) => `doble-plataforma.${accountId}`;

const DOUBLE_SOURCE = readFileSync(resolve('pruebas/yosiftware-doble/yosiftware-doble.js'), 'utf8');

/** Sin `cuenta`, empieza sin sesión. Si se instala otra vez, mandan las últimas opciones. */
export async function installYosiftwareDouble(page: Page, options: YosiftwareDoubleOptions = {}): Promise<void> {
    await page.addInitScript(opciones => {
        (window as unknown as { __YOSIFTWARE_DOBLE__: unknown }).__YOSIFTWARE_DOBLE__ = opciones;
    }, options);
    await page.route('**/sdk/v1/yosiftware.js', route => route.fulfill({
        status: 200,
        contentType: 'text/javascript; charset=utf-8',
        // Es un script de módulo de otro origen: sin CORS el navegador no lo ejecuta.
        headers: { 'access-control-allow-origin': '*' },
        body: DOUBLE_SOURCE
    }));
}
