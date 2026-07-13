import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FLOATING_WINDOW_MINIMIZED_HEIGHT, FLOATING_WINDOW_MINIMIZED_WIDTH, FloatingWindowMode, FloatingWindowPlacement, FloatingWindowRuntimeState, PersistedFloatingWindowState } from '../../interfaces/floating-window';
import { FloatingWindowLocalStoreService } from './floating-window-local-store.service';

@Injectable({ providedIn: 'root' })
export class FloatingWindowManagerService {
    private readonly subject = new BehaviorSubject<FloatingWindowRuntimeState[]>([]);
    private actorId: number | null = null;
    private zIndexCursor = 1200;

    readonly windows$: Observable<FloatingWindowRuntimeState[]> = this.subject.asObservable();
    get snapshot(): FloatingWindowRuntimeState[] { return this.subject.value; }

    constructor(private local: FloatingWindowLocalStoreService) { }

    initialize(actorId: number): void {
        if (this.actorId === actorId) return;
        this.actorId = Number.isInteger(actorId) && actorId > 0 ? actorId : null;
        this.zIndexCursor = 1200;
        this.subject.next([]);
    }

    open(id: string, title: string, fallback: FloatingWindowPlacement): FloatingWindowRuntimeState | null {
        if (!this.actorId || !id.trim()) return null;
        const existing = this.subject.value.find(item => item.id === id);
        if (existing) {
            this.patch(id, { open: true, zIndex: this.nextZIndex() });
            return this.subject.value.find(item => item.id === id) ?? null;
        }
        const persisted = this.local.load(this.actorId, id);
        const state: FloatingWindowRuntimeState = {
            id,
            title,
            open: true,
            zIndex: this.nextZIndex(),
            version: 1,
            mode: persisted?.mode ?? 'window',
            restoredPlacement: this.normalize(persisted?.restoredPlacement ?? fallback),
            updatedAt: persisted?.updatedAt ?? Date.now()
        };
        this.subject.next([...this.subject.value, state]);
        return state;
    }

    focus(id: string): void { this.patch(id, { zIndex: this.nextZIndex() }, false); }

    update(id: string, mode: FloatingWindowMode, placement: FloatingWindowPlacement): void {
        let normalized = this.normalize(placement, window.innerWidth, window.innerHeight, mode);
        if (mode === 'minimized') normalized = this.resolveMinimizedCollision(id, normalized);
        this.patch(id, { mode, restoredPlacement: normalized, updatedAt: Date.now() });
    }

    close(id: string): void { this.patch(id, { open: false, updatedAt: Date.now() }); }

    clear(): void {
        this.actorId = null;
        this.subject.next([]);
        this.zIndexCursor = 1200;
    }

    normalize(placement: FloatingWindowPlacement, viewportWidth = window.innerWidth, viewportHeight = window.innerHeight, mode: FloatingWindowMode = 'window'): FloatingWindowPlacement {
        const margin = 12;
        const width = Math.max(320, Math.min(placement.width, Math.max(320, viewportWidth - margin * 2)));
        const height = Math.max(220, Math.min(placement.height, Math.max(220, viewportHeight - margin * 2)));
        const visibleWidth = mode === 'minimized' ? FLOATING_WINDOW_MINIMIZED_WIDTH : width;
        const visibleHeight = mode === 'minimized' ? FLOATING_WINDOW_MINIMIZED_HEIGHT : height;
        return {
            left: Math.max(margin, Math.min(placement.left, viewportWidth - visibleWidth - margin)),
            top: Math.max(margin, Math.min(placement.top, viewportHeight - visibleHeight - margin)),
            width,
            height
        };
    }

    private patch(id: string, patch: Partial<FloatingWindowRuntimeState>, persist = true): void {
        let changed: FloatingWindowRuntimeState | null = null;
        const windows = this.subject.value.map(item => {
            if (item.id !== id) return item;
            changed = { ...item, ...patch };
            return changed;
        });
        if (!changed) return;
        this.subject.next(windows);
        if (persist && this.actorId) {
            const state = changed as FloatingWindowRuntimeState;
            const persisted: PersistedFloatingWindowState = { version: 1, mode: state.mode, restoredPlacement: state.restoredPlacement, updatedAt: state.updatedAt };
            this.local.save(this.actorId, state.id, persisted);
        }
    }

    private resolveMinimizedCollision(id: string, placement: FloatingWindowPlacement): FloatingWindowPlacement {
        const occupied = this.subject.value.filter(item => item.id !== id && item.open && item.mode === 'minimized').map(item => item.restoredPlacement);
        const collides = (candidate: FloatingWindowPlacement) => occupied.some(item => candidate.left < item.left + FLOATING_WINDOW_MINIMIZED_WIDTH && candidate.left + FLOATING_WINDOW_MINIMIZED_WIDTH > item.left && candidate.top < item.top + FLOATING_WINDOW_MINIMIZED_HEIGHT && candidate.top + FLOATING_WINDOW_MINIMIZED_HEIGHT > item.top);
        if (!collides(placement)) return placement;
        const step = FLOATING_WINDOW_MINIMIZED_HEIGHT + 8;
        for (let distance = step; distance < window.innerHeight; distance += step) {
            for (const top of [placement.top + distance, placement.top - distance]) {
                const candidate = this.normalize({ ...placement, top }, window.innerWidth, window.innerHeight, 'minimized');
                if (!collides(candidate)) return candidate;
            }
        }
        return placement;
    }

    private nextZIndex(): number { return ++this.zIndexCursor; }
}
