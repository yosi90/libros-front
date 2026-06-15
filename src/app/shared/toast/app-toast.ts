export type AppToastType = 'success' | 'error' | 'info' | 'system';

export interface AppToast {
    id: string;
    dedupeKey: string | null;
    message: string;
    type: AppToastType;
    createdAt: number;
    durationMs: number;
    repeatCount: number;
}

export interface AppToastOptions {
    durationMs?: number;
    dedupeKey?: string | null;
}
