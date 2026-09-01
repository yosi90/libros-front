import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SessionNotification } from '../../interfaces/session-notification';
import { AppToastAction, AppToastType } from '../../shared/toast/app-toast';
import { resolveNotificationTitle } from '../../shared/toast/notification-title';

const hiddenPersistentStorageKey = 'book-front:hidden-notifications:v1';

export type ToastDeliveryCue = 'idle' | 'preview' | 'received';

export interface ToastDeliveryState {
    requested: boolean;
    cue: ToastDeliveryCue;
}

@Injectable({ providedIn: 'root' })
export class SessionNotificationStoreService {
    private readonly noticesSubject = new BehaviorSubject<SessionNotification[]>([]);
    private readonly toastDeliverySubject = new BehaviorSubject<ToastDeliveryState>({ requested: false, cue: 'idle' });
    private readonly hiddenPersistentIds = new Set<number>(this.readHiddenPersistentIds());
    private sequence = 0;
    private deliveryCueTimer: ReturnType<typeof setTimeout> | null = null;
    private toastDeliveryPinned = false;

    readonly notices$ = this.noticesSubject.asObservable();
    readonly toastDelivery$ = this.toastDeliverySubject.asObservable();

    get notices(): SessionNotification[] { return this.noticesSubject.value; }
    get unseenCount(): number { return this.notices.filter(item => !item.seen).length; }

    ingest(input: { dedupeKey: string; type: AppToastType; title?: string; message: string; occurredAt?: number; action?: AppToastAction }): void {
        const message = `${input.message ?? ''}`.trim();
        if (!message) return;
        const now = input.occurredAt ?? Date.now();
        const existing = this.notices.find(item => item.dedupeKey === input.dedupeKey);
        const notice: SessionNotification = existing
            ? { ...existing, type: input.type, title: input.title?.trim() || existing.title, message, lastOccurredAt: now, repeatCount: existing.repeatCount + 1, seen: false, action: input.action ?? existing.action }
            : { id: `session-notice-${now}-${++this.sequence}`, dedupeKey: input.dedupeKey, type: input.type, title: resolveNotificationTitle(input.type, message, input.title), message, firstOccurredAt: now, lastOccurredAt: now, repeatCount: 1, seen: false, action: input.action };
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

    markSeenByDedupeKey(dedupeKey: string): void {
        const notice = this.notices.find(item => item.dedupeKey === dedupeKey);
        if (!notice || notice.seen) return;
        this.noticesSubject.next(this.notices.map(item => item.id === notice.id ? { ...item, seen: true } : item));
    }

    previewToastDelivery(): void {
        this.cancelDeliveryCueTimer();
        const current = this.toastDeliverySubject.value;
        if (current.cue !== 'preview') this.toastDeliverySubject.next({ requested: true, cue: 'preview' });
    }

    cancelToastDeliveryPreview(): void {
        if (this.toastDeliverySubject.value.cue !== 'preview') return;
        this.toastDeliverySubject.next({ requested: this.toastDeliveryPinned, cue: 'idle' });
    }

    completeToastDelivery(): void {
        this.cancelDeliveryCueTimer();
        this.toastDeliveryPinned = true;
        this.toastDeliverySubject.next({ requested: true, cue: 'received' });
        this.deliveryCueTimer = setTimeout(() => {
            this.deliveryCueTimer = null;
            this.toastDeliverySubject.next({ requested: true, cue: 'idle' });
        }, 560);
    }

    clearNotices(): void {
        this.noticesSubject.next([]);
        this.resetToastDelivery();
    }

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

    private resetToastDelivery(): void {
        this.cancelDeliveryCueTimer();
        this.toastDeliveryPinned = false;
        this.toastDeliverySubject.next({ requested: false, cue: 'idle' });
    }

    private cancelDeliveryCueTimer(): void {
        if (this.deliveryCueTimer) clearTimeout(this.deliveryCueTimer);
        this.deliveryCueTimer = null;
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
