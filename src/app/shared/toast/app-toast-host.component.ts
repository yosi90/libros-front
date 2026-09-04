import { AsyncPipe, NgClass } from '@angular/common';
import { Component, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppToast } from './app-toast';
import { AppToastService } from './app-toast.service';
import { SessionNotificationStoreService } from '../../services/stores/session-notification-store.service';
import { PresentationModeService } from '../../services/ui/presentation-mode.service';

type ToastMotionPhase = 'idle' | 'dragging' | 'returning' | 'dismiss-down' | 'deliver-up';

interface ToastMotion {
    phase: ToastMotionPhase;
    offsetX: number;
    offsetY: number;
}

@Component({
    standalone: true,
    selector: 'app-toast-host',
    imports: [AsyncPipe, NgClass, MatIconModule],
    templateUrl: './app-toast-host.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './app-toast-host.component.sass'
})
export class AppToastHostComponent implements OnDestroy {
    readonly toasts$ = this.appToastSrv.toasts$;
    private readonly motions = new Map<string, ToastMotion>();
    private readonly dismissalTimers = new Map<string, ReturnType<typeof setTimeout>>();
    private activePointer: { id: number; toastId: string; startY: number; sourceCenterY: number } | null = null;

    constructor(
        private appToastSrv: AppToastService,
        private sessionNotifications: SessionNotificationStoreService,
        private presentation: PresentationModeService
    ) { }

    ngOnDestroy(): void {
        this.dismissalTimers.forEach(timer => clearTimeout(timer));
        this.dismissalTimers.clear();
        this.sessionNotifications.cancelToastDeliveryPreview();
    }

    trackByToastId(_: number, toast: AppToast): string {
        return toast.id;
    }

    dismiss(toast: AppToast): void {
        this.markRead(toast);
        this.clearMotion(toast.id);
        this.appToastSrv.dismiss(toast.id);
    }

    startDrag(event: PointerEvent, toast: AppToast): void {
        if (!this.presentation.snapshot.isMobilePresentationActive || event.button !== 0 || this.activePointer) return;
        const sourceRect = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect();
        this.activePointer = {
            id: event.pointerId,
            toastId: toast.id,
            startY: event.clientY,
            sourceCenterY: sourceRect ? sourceRect.top + sourceRect.height / 2 : event.clientY
        };
        this.motions.set(toast.id, { phase: 'dragging', offsetX: 0, offsetY: 0 });
        this.appToastSrv.pause(toast.id);
        (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
    }

    moveDrag(event: PointerEvent): void {
        const active = this.activePointer;
        if (!active || active.id !== event.pointerId) return;
        const pointerOffset = Math.min(144, event.clientY - active.startY);
        const targetRect = document.querySelector<HTMLElement>('[data-toast-drop-target="true"]')?.getBoundingClientRect();
        const targetOffset = targetRect ? targetRect.top + targetRect.height / 2 - active.sourceCenterY : Number.NEGATIVE_INFINITY;
        const offsetY = pointerOffset < 0 ? Math.max(targetOffset, pointerOffset) : pointerOffset;
        this.motions.set(active.toastId, { phase: 'dragging', offsetX: 0, offsetY });
        if (offsetY <= -20) this.sessionNotifications.previewToastDelivery();
        else this.sessionNotifications.cancelToastDeliveryPreview();
    }

    finishDrag(event: PointerEvent, toast: AppToast): void {
        const active = this.activePointer;
        if (!active || active.id !== event.pointerId || active.toastId !== toast.id) return;
        (event.currentTarget as HTMLElement | null)?.releasePointerCapture?.(event.pointerId);
        this.activePointer = null;
        this.settleDrag(toast, event.currentTarget as HTMLElement);
    }

    cancelDrag(event: PointerEvent, toast: AppToast): void {
        if (!this.activePointer || this.activePointer.id !== event.pointerId || this.activePointer.toastId !== toast.id) return;
        this.activePointer = null;
        this.settleDrag(toast, event.currentTarget as HTMLElement);
    }

    private settleDrag(toast: AppToast, toastElement: HTMLElement): void {
        const offset = this.motionFor(toast.id).offsetY;
        if (offset >= 64) {
            this.markRead(toast);
            this.sessionNotifications.cancelToastDeliveryPreview();
            this.animateAndDismiss(toast.id, { phase: 'dismiss-down', offsetX: 0, offsetY: 180 });
            return;
        }
        if (offset <= -64) {
            this.sessionNotifications.previewToastDelivery();
            requestAnimationFrame(() => this.deliverToBell(toast, toastElement));
            return;
        }
        this.restore(toast.id);
    }

    motionFor(id: string): ToastMotion {
        return this.motions.get(id) ?? { phase: 'idle', offsetX: 0, offsetY: 0 };
    }

    private restore(id: string): void {
        this.sessionNotifications.cancelToastDeliveryPreview();
        this.motions.set(id, { phase: 'returning', offsetX: 0, offsetY: 0 });
        this.appToastSrv.resume(id);
        this.setMotionTimer(id, 220, () => this.motions.delete(id));
    }

    private deliverToBell(toast: AppToast, toastElement: HTMLElement): void {
        const target = document.querySelector<HTMLElement>('[data-toast-drop-target="true"]');
        const sourceRect = toastElement.getBoundingClientRect();
        const targetRect = target?.getBoundingClientRect();
        const currentMotion = this.motionFor(toast.id);
        const sourceOriginX = sourceRect.left + sourceRect.width / 2 - currentMotion.offsetX;
        const sourceOriginY = sourceRect.top + sourceRect.height / 2 - currentMotion.offsetY;
        const offsetX = targetRect ? targetRect.left + targetRect.width / 2 - sourceOriginX : 0;
        const offsetY = targetRect ? targetRect.top + targetRect.height / 2 - sourceOriginY : -Math.max(180, sourceOriginY);
        this.sessionNotifications.completeToastDelivery();
        this.animateAndDismiss(toast.id, { phase: 'deliver-up', offsetX, offsetY });
    }

    private animateAndDismiss(id: string, motion: ToastMotion): void {
        this.motions.set(id, motion);
        this.setMotionTimer(id, 240, () => {
            this.motions.delete(id);
            this.appToastSrv.dismiss(id);
        });
    }

    private markRead(toast: AppToast): void {
        this.sessionNotifications.markSeenByDedupeKey(toast.dedupeKey ?? toast.id);
    }

    private setMotionTimer(id: string, delay: number, action: () => void): void {
        const previous = this.dismissalTimers.get(id);
        if (previous) clearTimeout(previous);
        const timer = setTimeout(() => {
            this.dismissalTimers.delete(id);
            action();
        }, delay);
        this.dismissalTimers.set(id, timer);
    }

    private clearMotion(id: string): void {
        const timer = this.dismissalTimers.get(id);
        if (timer) clearTimeout(timer);
        this.dismissalTimers.delete(id);
        this.motions.delete(id);
    }
}
