import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SessionNotification } from '../../interfaces/session-notification';
import { AppToastAction, AppToastType } from '../../shared/toast/app-toast';

const hiddenPersistentStorageKey = 'book-front:hidden-notifications:v1';

@Injectable({ providedIn: 'root' })
export class SessionNotificationStoreService {
    private readonly noticesSubject = new BehaviorSubject<SessionNotification[]>([]);
    private readonly hiddenPersistentIds = new Set<number>(this.readHiddenPersistentIds());
    private sequence = 0;

    readonly notices$ = this.noticesSubject.asObservable();

    get notices(): SessionNotification[] { return this.noticesSubject.value; }
    get unseenCount(): number { return this.notices.filter(item => !item.seen).length; }

    ingest(input: { dedupeKey: string; type: AppToastType; title?: string; message: string; occurredAt?: number; action?: AppToastAction }): void {
        const now = input.occurredAt ?? Date.now();
        const existing = this.notices.find(item => item.dedupeKey === input.dedupeKey);
        const notice: SessionNotification = existing
            ? { ...existing, type: input.type, title: input.title?.trim() || existing.title, message: input.message, lastOccurredAt: now, repeatCount: existing.repeatCount + 1, seen: false, action: input.action ?? existing.action }
            : { id: `session-notice-${now}-${++this.sequence}`, dedupeKey: input.dedupeKey, type: input.type, title: input.title?.trim() || this.defaultTitle(input.type), message: input.message, firstOccurredAt: now, lastOccurredAt: now, repeatCount: 1, seen: false, action: input.action };
        this.noticesSubject.next(this.sort(existing ? this.notices.map(item => item.id === existing.id ? notice : item) : [...this.notices, notice]));
    }

    ensureActionable(input: { dedupeKey: string; type: AppToastType; title: string; message: string; action: AppToastAction }): void {
        const existing = this.notices.find(item => item.dedupeKey === input.dedupeKey);
        if (existing) {
            this.noticesSubject.next(this.notices.map(item => item.id === existing.id ? { ...item, action: input.action } : item));
            return;
        }
        this.ingest(input);
    }

    removeByDedupeKey(dedupeKey: string): void {
        this.noticesSubject.next(this.notices.filter(item => item.dedupeKey !== dedupeKey));
    }

    markAllSeen(): void {
        if (!this.unseenCount) return;
        this.noticesSubject.next(this.notices.map(item => ({ ...item, seen: true })));
    }

    clearNotices(): void { this.noticesSubject.next([]); }

    hidePersistent(ids: number[]): void {
        ids.filter(id => Number.isInteger(id) && id > 0).forEach(id => this.hiddenPersistentIds.add(id));
        this.persistHiddenPersistentIds();
    }

    isPersistentHidden(id: number): boolean { return this.hiddenPersistentIds.has(id); }

    resetSession(): void {
        this.clearNotices();
        this.hiddenPersistentIds.clear();
        if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(hiddenPersistentStorageKey);
    }

    private defaultTitle(type: AppToastType): string {
        return type === 'success' ? 'Completado' : type === 'error' ? 'Error' : type === 'system' ? 'Sistema' : 'Información';
    }

    private sort(items: SessionNotification[]): SessionNotification[] { return [...items].sort((a, b) => b.lastOccurredAt - a.lastOccurredAt); }

    private readHiddenPersistentIds(): number[] {
        if (typeof sessionStorage === 'undefined') return [];
        try {
            const value = JSON.parse(sessionStorage.getItem(hiddenPersistentStorageKey) || '[]');
            return Array.isArray(value) ? value.filter(id => Number.isInteger(id) && id > 0) : [];
        } catch { return []; }
    }

    private persistHiddenPersistentIds(): void {
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(hiddenPersistentStorageKey, JSON.stringify([...this.hiddenPersistentIds]));
    }
}
