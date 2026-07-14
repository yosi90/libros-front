import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DecisionNotice, DecisionNoticeAction } from '../../interfaces/session-notification';
import { SessionNotificationStoreService } from '../stores/session-notification-store.service';

@Injectable({ providedIn: 'root' })
export class DecisionNoticeService {
    private readonly noticeSubject = new BehaviorSubject<DecisionNotice | null>(null);
    private readonly shownOnceKeys = new Set<string>();
    readonly notice$ = this.noticeSubject.asObservable();

    constructor(private sessionNotifications: SessionNotificationStoreService) { }

    show(notice: DecisionNotice, onceKey?: string): void {
        if (notice.actions.length < 1 || notice.actions.length > 3) throw new Error('DecisionNotice requiere entre una y tres acciones.');
        const centerAction = notice.actions.find(action => action.showInCenter) ?? notice.actions[0];
        this.sessionNotifications.ensureActionable({ dedupeKey: notice.id, type: notice.type, title: notice.title, message: notice.message, action: { label: centerAction.label, execute: centerAction.execute } });
        if (onceKey && this.shownOnceKeys.has(onceKey)) return;
        if (onceKey) this.shownOnceKeys.add(onceKey);
        this.noticeSubject.next(notice);
    }

    async run(action: DecisionNoticeAction): Promise<void> {
        await action.execute();
        if (action.closeOnSelect !== false) this.close(true);
    }

    close(force = false): void {
        if (!force && this.noticeSubject.value && !this.noticeSubject.value.dismissible) return;
        this.noticeSubject.next(null);
    }

    remove(id: string): void {
        if (this.noticeSubject.value?.id === id) this.noticeSubject.next(null);
        this.sessionNotifications.removeByDedupeKey(id);
    }

    reset(): void { this.noticeSubject.next(null); this.shownOnceKeys.clear(); }
}
