import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DecisionNotice, DecisionNoticeAction } from '../../interfaces/session-notification';
import { SessionNotificationStoreService } from '../stores/session-notification-store.service';

@Injectable({ providedIn: 'root' })
export class DecisionNoticeService {
    private readonly noticeSubject = new BehaviorSubject<DecisionNotice | null>(null);
    private readonly shownOnceKeys = new Set<string>();
    private holdCondition: () => boolean = () => false;
    private pending: DecisionNotice | null = null;
    readonly notice$ = this.noticeSubject.asObservable();

    constructor(private sessionNotifications: SessionNotificationStoreService) { }

    show(notice: DecisionNotice, onceKey?: string): void {
        if (notice.actions.length < 1 || notice.actions.length > 3) throw new Error('DecisionNotice requiere entre una y tres acciones.');
        const centerAction = notice.actions.find(action => action.showInCenter) ?? notice.actions[0];
        this.sessionNotifications.ensureActionable({ dedupeKey: notice.id, type: notice.type, title: notice.title, message: notice.message, action: { label: centerAction.label, execute: centerAction.execute } });
        if (onceKey && this.shownOnceKeys.has(onceKey)) return;
        if (onceKey) this.shownOnceKeys.add(onceKey);
        if (this.holdCondition()) {
            // Ya está en la campana; se presenta al terminar lo que lo retiene.
            this.pending = notice;
            return;
        }
        this.noticeSubject.next(notice);
    }

    /**
     * Retiene los avisos mientras se cumpla la condición: otra superficie de primera
     * vez (la bienvenida de estilo) ocupa la pantalla. Se evalúa al mostrar cada
     * aviso, así que no depende de que haya pasado un ciclo de detección de cambios.
     */
    holdWhile(condition: () => boolean): void { this.holdCondition = condition; }

    /** Presenta el último aviso retenido si la condición ya no se cumple. */
    releaseHeld(): void {
        if (this.holdCondition() || !this.pending) return;
        const notice = this.pending;
        this.pending = null;
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

    /** Cierra el aviso si está a la vista o retenido, pero lo conserva en la campana. */
    dismiss(id: string): void {
        if (this.noticeSubject.value?.id === id) this.noticeSubject.next(null);
        if (this.pending?.id === id) this.pending = null;
    }

    remove(id: string): void {
        if (this.noticeSubject.value?.id === id) this.noticeSubject.next(null);
        if (this.pending?.id === id) this.pending = null;
        this.sessionNotifications.removeByDedupeKey(id);
    }

    reset(): void { this.noticeSubject.next(null); this.shownOnceKeys.clear(); this.pending = null; }
}
