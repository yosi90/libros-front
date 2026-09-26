export type AppToastType = 'success' | 'error' | 'info' | 'system';

export interface AppToastAction {
    label: string;
    execute: () => void | Promise<unknown>;
}

export interface AppToast {
    id: string;
    dedupeKey: string | null;
    message: string;
    type: AppToastType;
    createdAt: number;
    lastOccurredAt: number;
    expiresAt: number;
    durationMs: number;
    repeatCount: number;
    title: string;
    icon?: string;
    action?: AppToastAction;
}

export interface AppToastOptions {
    durationMs?: number;
    dedupeKey?: string | null;
    title?: string;
    icon?: string;
    action?: AppToastAction;
}

/** Título y mensaje dicen lo mismo (salvo mayúsculas y puntuación final): se muestra solo el título. */
export function isSameToastText(title: string, message: string): boolean {
    const normalize = (value: string) => `${value ?? ''}`.trim().replace(/[.!?…\s]+$/u, '').toLocaleLowerCase('es');
    return normalize(title) === normalize(message);
}
