import { HttpErrorResponse } from '@angular/common/http';

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
