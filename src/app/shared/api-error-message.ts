import { HttpErrorResponse } from '@angular/common/http';

const productStateMessages: Record<string, string> = {
    account_sanctioned: 'Las funciones sociales de esta cuenta están restringidas temporalmente.',
    capability_sanctioned: 'Esta acción no está disponible por una restricción de cuenta.',
    usage_policy_acceptance_required: 'Debes aceptar la política de uso antes de continuar.',
    creation_policy_acceptance_required: 'Debes aceptar la política de creación antes de publicar o modificar contenido.',
    club_owner_limit_reached: 'Ya administras un club propio. Solo puedes crear uno.',
    club_membership_limit_reached: 'Ya participas en tres clubes activos. Sal de uno antes de unirte a otro.',
    club_post_target_unavailable: 'No puedes publicar en ese club o ya no está disponible.'
};

export function getApiErrorCode(error: unknown): string | null {
    if (!error)
        return null;

    if (error instanceof HttpErrorResponse)
        return getApiErrorCode(error.error);

    if (typeof error === 'object') {
        const apiError = error as Record<string, unknown>;
        const code = apiError['code'];

        if (typeof code === 'string' && code.trim())
            return code;
    }

    return null;
}

export function getApiErrorMessage(error: unknown, fallback: string = 'Error desconocido'): string {
    if (!error)
        return fallback;

    if (typeof error === 'string')
        return error || fallback;

    if (error instanceof Error)
        return error.message || fallback;

    if (error instanceof HttpErrorResponse)
        return getApiErrorMessage(error.error, error.message || fallback);

    if (Array.isArray(error))
        return error.map(item => getApiErrorMessage(item, '')).filter(Boolean).join('\n') || fallback;

    if (typeof error === 'object') {
        const apiError = error as Record<string, unknown>;

        for (const key of ['message', 'detail', 'error', 'title']) {
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

export function getProductStateMessage(error: unknown, fallback: string = 'Esta acción no está disponible actualmente.'): string {
    const code = getApiErrorCode(error);
    return (code && productStateMessages[code]) || getApiErrorMessage(error, fallback);
}
