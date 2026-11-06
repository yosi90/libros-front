import { HttpErrorResponse } from '@angular/common/http';

export function getApiErrorCode(error: unknown): string | null {
    if (!error)
        return null;

    if (error instanceof HttpErrorResponse)
        return getApiErrorCode(error.error);

    if (typeof error === 'object') {
        const apiError = error as Record<string, unknown>;
        const raw = apiError['raw'];

        if (raw && raw !== error) {
            const rawCode = getApiErrorCode(raw);
            if (rawCode)
                return rawCode;
        }
        const code = apiError['code'];

        if (typeof code === 'string' && code.trim())
            return code;
    }

    return null;
}

export const connectionErrorMessage = 'No se ha podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';

/**
 * Texto para el usuario de una respuesta de la API (docs/backend/api/ERRORES.md):
 * el backend garantiza que `error` es una frase final en español. `debug`,
 * `code`, `field` y `details` nunca se muestran.
 */
/** Bloqueo por normas pendientes: lo explica el aviso de normas, no un error. */
export function isPolicyAcceptanceBlock(error: unknown): boolean {
    const code = getApiErrorCode(error);
    return code === 'platform_rules_acceptance_required';
}

const restrictionScopeLabels: Record<string, string> = {
    creacion: 'la creación de contenido',
    comunidad: 'la comunidad',
    chat: 'el chat',
    publicacion: 'publicar en la comunidad'
};

/**
 * «Tu cuenta de Yosiftware tiene limitada la comunidad hasta el 2 de noviembre de 2026 a las 18:30.» Lo limitado por
 * la moderación de la plataforma (`restricciones` de la sesión o `details` del 403), en la hora de la persona.
 */
export function describePlatformRestriction(scopes: readonly string[], until: string | null | undefined): string | null {
    // `comunidad` ya incluye el chat y publicar: no se repiten.
    const known = scopes.filter(scope => scope in restrictionScopeLabels);
    const visible = known.includes('comunidad') ? known.filter(scope => scope !== 'chat' && scope !== 'publicacion') : known;
    if (!scopes.length) return null;
    const labels = visible.length ? visible.map(scope => restrictionScopeLabels[scope]) : ['esta acción'];
    const what = labels.length > 1 ? `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}` : labels[0];
    // «limitada la comunidad», «limitado el chat»: concuerda con lo primero que se nombra.
    const limited = what.startsWith('el ') ? 'limitado' : 'limitada';
    const date = until ? new Date(until) : null;
    if (!date || Number.isNaN(date.getTime()))
        return `Tu cuenta de Yosiftware tiene ${limited} ${what} sin fecha de fin.`;
    const day = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `Tu cuenta de Yosiftware tiene ${limited} ${what} hasta el ${day} a las ${time}.`;
}

/** `403 platform_restriction_active` (ADHESION_YOSIFTWARE.md): qué y hasta cuándo. `null` si el error es otro. */
export function getPlatformRestrictionMessage(error: unknown): string | null {
    if (getApiErrorCode(error) !== 'platform_restriction_active') return null;
    const details = getErrorDetails(error);
    const scope = typeof details?.['Alcance'] === 'string' ? details['Alcance'] : '';
    const until = typeof details?.['Hasta'] === 'string' ? details['Hasta'] : null;
    return describePlatformRestriction([scope], until);
}

function getErrorDetails(error: unknown): Record<string, unknown> | null {
    if (error instanceof HttpErrorResponse)
        return getErrorDetails(error.error);
    if (!error || typeof error !== 'object')
        return null;
    const details = (error as Record<string, unknown>)['details'];
    return details && typeof details === 'object' ? details as Record<string, unknown> : null;
}

export function getBackendErrorText(error: unknown): string | null {
    if (error instanceof HttpErrorResponse)
        return getBackendErrorText(error.error);
    if (!error || typeof error !== 'object')
        return null;
    const body = error as Record<string, unknown>;
    const text = body['error'];
    if (typeof text === 'string' && text.trim())
        return text;
    const raw = body['raw'];
    return raw && raw !== error ? getBackendErrorText(raw) : null;
}

export function getApiErrorMessage(error: unknown, fallback: string = 'Error desconocido'): string {
    if (!error)
        return fallback;

    const restriction = getPlatformRestrictionMessage(error);
    if (restriction)
        return restriction;

    const backendText = getBackendErrorText(error);
    if (backendText)
        return backendText;

    // El `message` de HttpErrorResponse es técnico («Http failure response for…»):
    // sin cuerpo válido se usa el texto de la pantalla o un aviso de conexión.
    if (error instanceof HttpErrorResponse)
        return error.status === 0 ? connectionErrorMessage : fallback;

    if (typeof error === 'string')
        return error || fallback;

    // Errores propios de la app: sus textos ya están escritos para el usuario.
    if (error instanceof Error)
        return error.message || fallback;

    if (Array.isArray(error))
        return error.map(item => getApiErrorMessage(item, '')).filter(Boolean).join('\n') || fallback;

    if (typeof error === 'object') {
        const apiError = error as Record<string, unknown>;
        const nested = apiError['error'];
        if (nested && typeof nested === 'object')
            return getApiErrorMessage(nested, fallback);

        for (const key of ['message', 'detail', 'title']) {
            const value = apiError[key];
            if (typeof value === 'string' && value.trim())
                return value;
        }

        const messages = apiError['messages'];
        if (Array.isArray(messages)) {
            const message = messages.map(item => getApiErrorMessage(item, '')).filter(Boolean).join('\n');
            if (message)
                return message;
        }
    }

    return fallback;
}

/**
 * Igual que getApiErrorMessage, pero con textos propios para los códigos de estado
 * de producto cuando el error no trae ya su frase del backend (p. ej. tiempo real).
 */
export function getProductStateMessage(error: unknown, fallback: string = 'Esta acción no está disponible actualmente.'): string {
    const backendText = getBackendErrorText(error);
    if (backendText)
        return backendText;
    // La frase es la de la API (una sola fuente; punto 12 de los duplicados): sin ella, la de la pantalla.
    return getApiErrorMessage(error, fallback);
}
