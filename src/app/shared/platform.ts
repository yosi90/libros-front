import { environment } from '../../environment/environment';

// Lo común de la plataforma Yosiftware para las piezas de Libros que hablan con su API (ecosistema-kit/ACCESO.md).

/** La API de la plataforma del entorno, sin barra final: `PlatformApiService` le añade cada ruta (`/v1/…`). */
export const PLATFORM_API_URL = environment.plataforma.apiUrl.replace(/\/+$/, '');

/**
 * El error de lo que pide la plataforma sin sesión: no hay a quién preguntar. Lleva el `code` arriba (para
 * `getApiErrorCode`, `spaceErrorMessage`) y la forma de una respuesta de la API (para `getApiErrorMessage`).
 */
export const SIN_SESION_PLATAFORMA = { status: 401, code: 'sin_sesion', error: { code: 'sin_sesion', error: 'Entra con tu cuenta de Yosiftware.' } } as const;

/** Las direcciones de los avatares llegan relativas a la API de la plataforma (`/v1/perfiles/…`). */
export function platformAssetUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    try {
        return new URL(path, `${PLATFORM_API_URL}/`).href;
    } catch {
        return null;
    }
}
