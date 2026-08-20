import { Injectable } from '@angular/core';
import { ManagerKind, ManagerViewState } from '../components/shared/user-pages/object-manager/object-manager.models';

const STORAGE_KEY = 'books-app.manager-view-state';

@Injectable({ providedIn: 'root' })
export class ManagerViewStateService {
    private readonly states = this.readStates();

    get(kind: ManagerKind): Partial<ManagerViewState> {
        return { ...(this.states[kind] ?? {}) };
    }

    update(kind: ManagerKind, patch: Partial<ManagerViewState>): void {
        this.states[kind] = { ...(this.states[kind] ?? {}), ...patch };
        this.persist();
    }

    private readStates(): Partial<Record<ManagerKind, Partial<ManagerViewState>>> {
        if (typeof sessionStorage === 'undefined')
            return {};

        try {
            return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}');
        } catch {
            return {};
        }
    }

    private persist(): void {
        if (typeof sessionStorage === 'undefined')
            return;

        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.states));
        } catch {
            // El estado de navegación es una mejora progresiva: la gestión sigue funcionando sin storage.
        }
    }
}
