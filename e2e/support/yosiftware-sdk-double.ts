import type { Page } from '@playwright/test';

/**
 * Doble del SDK de la plataforma Yosiftware para las pruebas locales (ecosistema-kit/ACCESO.md). Sustituye la carga de
 * `/sdk/v1/yosiftware.js` (de cualquier entorno) por un módulo que deja `window.yosiftware` con el estado pedido y un
 * `<yosi-acceso>` mínimo («Entrar» o la inicial). La API de Libros se simula aparte (`GET /usuarios/me`…).
 *
 * La prueba puede cambiar de estado después con `window.__yosiftwareDoble.emitir(estado)`.
 */
export interface SdkDoubleAccount {
    id: string;
    alias: string;
    correo?: string;
}

export interface SdkDoubleOptions {
    /** `null` (por defecto) es `sin_sesion`. */
    cuenta?: SdkDoubleAccount | null;
    token?: string;
}

export const SDK_DOUBLE_TOKEN = 'token-doble-de-la-plataforma';

export function sdkDoubleSource(options: SdkDoubleOptions = {}): string {
    const estado = options.cuenta
        ? { tipo: 'con_sesion', cuenta: { correo: `${options.cuenta.alias}@example.test`, correoVerificado: true, estado: 'activa', propietario: false, ...options.cuenta } }
        : { tipo: 'sin_sesion' };
    return `
const oyentes = new Set();
const sdk = {
    version: 'doble-e2e',
    estado: ${JSON.stringify(estado)},
    listo: async () => sdk.estado,
    alCambiar(oyente) { oyentes.add(oyente); oyente(sdk.estado); return () => oyentes.delete(oyente); },
    entrar: async () => false,
    salir: async () => emitir({ tipo: 'sin_sesion' }),
    cambiarCuenta: async () => false,
    token: async () => sdk.estado.tipo === 'con_sesion' ? ${JSON.stringify(options.token ?? SDK_DOUBLE_TOKEN)} : null,
    perfil: async () => null,
    editarPerfil: async () => false,
    fetch: (entrada, opciones) => fetch(entrada, opciones)
};
function emitir(estado) {
    sdk.estado = estado;
    oyentes.forEach(oyente => oyente(estado));
    document.querySelectorAll('yosi-acceso').forEach(el => el.pintar && el.pintar());
}
window.yosiftware = sdk;
window.__yosiftwareDoble = { emitir };
if (!customElements.get('yosi-acceso')) customElements.define('yosi-acceso', class extends HTMLElement {
    connectedCallback() { this.pintar(); }
    pintar() {
        const raiz = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.setAttribute('part', sdk.estado.tipo === 'con_sesion' ? 'boton cuenta' : 'boton principal');
        boton.textContent = sdk.estado.tipo === 'con_sesion' ? sdk.estado.cuenta.alias.charAt(0).toUpperCase() : 'Entrar';
        boton.setAttribute('aria-label', sdk.estado.tipo === 'con_sesion' ? 'Tu cuenta de Yosiftware' : 'Entrar');
        raiz.replaceChildren(boton);
    }
});
`;
}

export async function installYosiftwareSdkDouble(page: Page, options: SdkDoubleOptions = {}): Promise<void> {
    await page.route('**/sdk/v1/yosiftware.js', route => route.fulfill({
        status: 200,
        contentType: 'text/javascript; charset=utf-8',
        // Es un script de módulo de otro origen: sin CORS el navegador no lo ejecuta.
        headers: { 'access-control-allow-origin': '*' },
        body: sdkDoubleSource(options)
    }));
}
