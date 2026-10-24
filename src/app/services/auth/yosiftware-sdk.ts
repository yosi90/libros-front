import { InjectionToken } from '@angular/core';
import { environment } from '../../../environment/environment';

// Lo que Libros usa del SDK de la plataforma Yosiftware (ecosistema-kit/ACCESO.md). Los tipos completos están junto
// al SDK: <SDK>/sdk/v1/yosiftware.d.ts. El SDK se carga siempre de la página de acceso del entorno, nunca se copia.

export interface CuentaPlataforma {
    /** Identificador estable de la persona en todo el ecosistema (el `sub` de los tokens). */
    id: string;
    /** Alias público. Puede cambiar: no identifica a nadie. */
    alias: string;
    correo: string;
    correoVerificado?: boolean;
    estado?: 'pendiente_verificacion' | 'activa' | 'suspendida' | 'cerrada';
    propietario?: boolean;
}

export type AlcanceRestringido = 'comunidad' | 'chat' | 'publicacion' | 'creacion';

export interface RestriccionesPlataforma {
    /** Con `comunidad` vienen también `chat` y `publicacion`. */
    alcances: AlcanceRestringido[];
    /** Cuándo termina lo último (ISO 8601); `null` si alguna es permanente. */
    hasta: string | null;
}

export interface NormasPendientesPlataforma {
    id: number;
    version: number;
    titulo: string;
    importante: boolean;
    publicadas: string;
}

export type EstadoPlataforma =
    | { tipo: 'comprobando' }
    | { tipo: 'sin_sesion'; motivo?: string; web?: string | null; alias?: string | null }
    | { tipo: 'no_disponible' }
    | { tipo: 'con_sesion'; cuenta: CuentaPlataforma; restricciones?: RestriccionesPlataforma; normasPendientes?: NormasPendientesPlataforma };

export interface PerfilPlataforma {
    id: string;
    alias: string;
    nombre: string | null;
    avatar: { url: string; miniatura: string; version: number } | null;
}

export interface YosiftwareSdk {
    readonly estado: EstadoPlataforma;
    listo(): Promise<EstadoPlataforma>;
    alCambiar(oyente: (estado: EstadoPlataforma) => void): () => void;
    entrar(opciones?: { vista?: 'entrar' | 'registro' }): Promise<boolean>;
    salir(): Promise<void>;
    cambiarCuenta(): Promise<boolean>;
    token(): Promise<string | null>;
    perfil(): Promise<PerfilPlataforma | null>;
    editarPerfil(): Promise<boolean>;
    fetch(entrada: string, opciones?: RequestInit): Promise<Response>;
}

/** Carga el SDK y resuelve con `window.yosiftware`. Las pruebas lo sustituyen por un doble. */
export type CargadorSdk = () => Promise<YosiftwareSdk>;

/** Hoja con el aspecto de Libros para lo que pinta el SDK, también dentro de sus ventanas (ecosistema-kit/ESTILOS.md). */
export const HOJA_ESTILOS_SDK = '/assets/yosiftware.css?v=1';

export function cargarSdkDesdeLaPlataforma(sdkUrl: string = environment.plataforma.sdkUrl, documento: Document = document): Promise<YosiftwareSdk> {
    const ventana = documento.defaultView as (Window & { yosiftware?: YosiftwareSdk }) | null;
    if (ventana?.yosiftware)
        return Promise.resolve(ventana.yosiftware);
    return new Promise<YosiftwareSdk>((resolve, reject) => {
        const script = documento.createElement('script');
        script.type = 'module';
        script.src = sdkUrl;
        script.dataset['estilos'] = HOJA_ESTILOS_SDK;
        script.onload = () => {
            const sdk = ventana?.yosiftware;
            if (sdk) resolve(sdk);
            else reject(new Error('El SDK de la plataforma no se ha cargado.'));
        };
        script.onerror = () => {
            script.remove();
            reject(new Error('El SDK de la plataforma no responde.'));
        };
        documento.head.appendChild(script);
    });
}

export const CARGADOR_SDK = new InjectionToken<CargadorSdk>('CARGADOR_SDK', {
    providedIn: 'root',
    factory: () => () => cargarSdkDesdeLaPlataforma()
});

/** El SDK rechaza lo que empezó con otra cuenta (`CambioDeIdentidad`, CAMBIO_DE_CUENTA.md): nunca se reintenta. */
export function esCambioDeIdentidad(error: unknown): boolean {
    return (error as { name?: unknown } | null)?.name === 'CambioDeIdentidad';
}
