export type FloatingWindowMode = 'window' | 'minimized' | 'maximized';

export const FLOATING_WINDOW_MINIMIZED_WIDTH = 280;
export const FLOATING_WINDOW_MINIMIZED_HEIGHT = 48;

export interface FloatingWindowPlacement {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface PersistedFloatingWindowState {
    version: 1;
    mode: FloatingWindowMode;
    restoredPlacement: FloatingWindowPlacement;
    updatedAt: number;
}

export interface FloatingWindowRuntimeState extends PersistedFloatingWindowState {
    id: string;
    title: string;
    open: boolean;
    zIndex: number;
}
