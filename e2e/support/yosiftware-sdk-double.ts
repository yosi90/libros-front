import type { Page } from '@playwright/test';

/**
 * Doble del SDK de la plataforma Yosiftware para las pruebas locales (ecosistema-kit/ACCESO.md). Sustituye la carga de
 * `/sdk/v1/yosiftware.js` (de cualquier entorno) por un módulo que deja `window.yosiftware` con el estado pedido y
 * elementos mínimos: `<yosi-acceso>` («Entrar» o la inicial), `<yosi-webs>`, `<yosi-notificaciones>`,
 * `<yosi-privacidad>` y `<yosi-reportar>` (un botón con su nombre accesible). La API de Libros y la de la plataforma
 * (`/v1/chat/…`, `/v1/social/…`) se simulan aparte con `page.route`.
 *
 * La prueba puede cambiar de estado después con `window.__yosiftwareDoble.emitir(estado)`, entregar un evento del
 * tiempo real con `window.__yosiftwareDoble.evento(tipo, datos)` y leer lo guardado en los ajustes en
 * `window.__yosiftwareDoble.ajustes`.
 *
 * Los espacios (ESPACIOS.md): `yosiftware.espacios.canal(id, oyente)` registra el canal; la prueba entrega un mensaje
 * con `window.__yosiftwareDoble.canal(id, mensaje)` y ve los abiertos en `window.__yosiftwareDoble.canalesAbiertos()`.
 * Las rutas `/v1/espacios/…` se simulan con `page.route`, como las del chat.
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
    /** El bloque de ajustes de Libros de la cuenta (`yosiftware.ajustes`). */
    ajustes?: Record<string, unknown>;
}

export const SDK_DOUBLE_TOKEN = 'token-doble-de-la-plataforma';
export const SDK_DOUBLE_PLATFORM_TOKEN = 'token-doble-de-la-plataforma-cuentas';

export function sdkDoubleSource(options: SdkDoubleOptions = {}): string {
    const estado = options.cuenta
        ? { tipo: 'con_sesion', cuenta: { correo: `${options.cuenta.alias}@example.test`, correoVerificado: true, estado: 'activa', propietario: false, ...options.cuenta } }
        : { tipo: 'sin_sesion' };
    return `
const oyentes = new Set();
const oyentesEvento = new Set();
const oyentesAviso = new Set();
const oyentesConexion = new Set();
const oyentesNoLeidos = new Set();
let ajustes = { version: 0, documento: ${JSON.stringify(options.ajustes ?? {})} };
const canales = new Map();
let secuencia = 0;
const conSesion = () => sdk.estado.tipo === 'con_sesion';
const sdk = {
    version: 'doble-e2e',
    estado: ${JSON.stringify(estado)},
    listo: async () => sdk.estado,
    alCambiar(oyente) { oyentes.add(oyente); oyente(sdk.estado); return () => oyentes.delete(oyente); },
    entrar: async () => false,
    salir: async () => emitir({ tipo: 'sin_sesion' }),
    cambiarCuenta: async () => false,
    token: async () => conSesion() ? ${JSON.stringify(options.token ?? SDK_DOUBLE_TOKEN)} : null,
    tokenPlataforma: async () => conSesion() ? ${JSON.stringify(SDK_DOUBLE_PLATFORM_TOKEN)} : null,
    perfil: async () => null,
    editarPerfil: async () => false,
    reportar: async () => false,
    denunciar: async () => false,
    privacidad: async () => undefined,
    ajustes: {
        leer: async () => conSesion() ? JSON.parse(JSON.stringify(ajustes)) : null,
        guardar: async (cambios) => {
            if (!conSesion()) return null;
            const documento = { ...ajustes.documento };
            for (const [clave, valor] of Object.entries(cambios)) { if (valor === null) delete documento[clave]; else documento[clave] = valor; }
            ajustes = { version: ajustes.version + 1, documento };
            window.__yosiftwareDoble.ajustes = ajustes;
            return JSON.parse(JSON.stringify(ajustes));
        }
    },
    tiempoReal: {
        estado: { tipo: 'conectado' },
        alEvento(oyente) { oyentesEvento.add(oyente); return () => oyentesEvento.delete(oyente); },
        alAviso(oyente) { oyentesAviso.add(oyente); return () => oyentesAviso.delete(oyente); },
        alCambiar(oyente) { oyentesConexion.add(oyente); oyente(sdk.tiempoReal.estado); return () => oyentesConexion.delete(oyente); },
        sincronizar() {}
    },
    chat: {
        noLeidos: 0,
        alCambiarNoLeidos(oyente) { oyentesNoLeidos.add(oyente); oyente(0); return () => oyentesNoLeidos.delete(oyente); },
        escribiendo() {}
    },
    espacios: {
        canal(id, oyente) {
            const oyentes = canales.get(id) ?? new Set();
            oyentes.add(oyente);
            canales.set(id, oyentes);
            setTimeout(() => oyente({ tipo: 'abierto', espacio: id, presentes: [] }), 0);
            return { espacio: id, presentes: [], cerrar() { oyentes.delete(oyente); if (!oyentes.size) canales.delete(id); } };
        }
    },
    fetch: (entrada, opciones) => fetch(entrada, opciones)
};
function emitir(estado) {
    sdk.estado = estado;
    oyentes.forEach(oyente => oyente(estado));
    document.querySelectorAll('yosi-acceso').forEach(el => el.pintar && el.pintar());
}
function evento(tipo, datos) {
    const ev = { secuencia: ++secuencia, tipo, datos: datos ?? null, fecha: new Date().toISOString() };
    oyentesEvento.forEach(oyente => oyente(ev));
}
window.yosiftware = sdk;
function canal(id, mensaje) {
    (canales.get(id) ?? new Set()).forEach(oyente => oyente({ espacio: id, ...mensaje }));
}
window.__yosiftwareDoble = {
    emitir, evento, canal, ajustes,
    oyentesDelTiempoReal: () => oyentesEvento.size + oyentesAviso.size,
    canalesAbiertos: () => [...canales.entries()].filter(([, oyentes]) => oyentes.size).map(([id]) => id)
};
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
for (const [etiqueta, nombre] of [['yosi-webs', 'Webs de Yosiftware'], ['yosi-notificaciones', 'Notificaciones'], ['yosi-privacidad', 'Privacidad'], ['yosi-reportar', 'Errores y propuestas']]) {
    if (customElements.get(etiqueta)) continue;
    customElements.define(etiqueta, class extends HTMLElement {
        connectedCallback() {
            const raiz = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
            const boton = document.createElement('button');
            boton.type = 'button';
            boton.setAttribute('aria-label', nombre);
            boton.textContent = nombre.charAt(0);
            raiz.replaceChildren(boton);
        }
    });
}
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
