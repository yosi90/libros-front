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
    title?: string;
    action?: AppToastAction;
}

export interface AppToastOptions {
    durationMs?: number;
    dedupeKey?: string | null;
    title?: string;
    action?: AppToastAction;
}
