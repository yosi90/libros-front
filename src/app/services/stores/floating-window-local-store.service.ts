import { Injectable } from '@angular/core';
import { PersistedFloatingWindowState } from '../../interfaces/floating-window';

@Injectable({ providedIn: 'root' })
export class FloatingWindowLocalStoreService {
    load(actorId: number, windowId: string): PersistedFloatingWindowState | null {
        try {
            const raw = localStorage.getItem(this.key(actorId, windowId));
            return raw ? this.normalize(JSON.parse(raw) as unknown) : null;
        } catch {
            return null;
        }
    }

    save(actorId: number, windowId: string, state: PersistedFloatingWindowState): void {
        try {
            localStorage.setItem(this.key(actorId, windowId), JSON.stringify(state));
        } catch {
            // La ventana sigue siendo funcional si el navegador no permite almacenamiento.
        }
    }

    remove(actorId: number, windowId: string): void {
        try { localStorage.removeItem(this.key(actorId, windowId)); } catch { /* sin efecto funcional */ }
    }

    private key(actorId: number, windowId: string): string {
        if (!Number.isInteger(actorId) || actorId < 1 || !windowId.trim())
            throw new Error('La persistencia flotante requiere actor y ventana válidos.');
        return `book-front:floating-window:v1:${actorId}:${windowId.trim()}`;
    }

    private normalize(value: unknown): PersistedFloatingWindowState | null {
        if (!value || typeof value !== 'object') return null;
        const state = value as Record<string, unknown>;
        const placement = state['restoredPlacement'];
        if (state['version'] !== 1 || !['window', 'minimized', 'maximized'].includes(String(state['mode'])) || !placement || typeof placement !== 'object') return null;
        const rect = placement as Record<string, unknown>;
        const numbers = ['left', 'top', 'width', 'height'].map(key => rect[key]);
        if (numbers.some(item => typeof item !== 'number' || !Number.isFinite(item))) return null;
        return {
            version: 1,
            mode: state['mode'] as PersistedFloatingWindowState['mode'],
            restoredPlacement: { left: numbers[0] as number, top: numbers[1] as number, width: numbers[2] as number, height: numbers[3] as number },
            updatedAt: typeof state['updatedAt'] === 'number' ? state['updatedAt'] : 0
        };
    }
}
