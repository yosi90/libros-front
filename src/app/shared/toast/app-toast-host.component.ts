import { AsyncPipe, NgClass } from '@angular/common';
import { Component, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppToast } from './app-toast';
import { AppToastService } from './app-toast.service';
import { PresentationModeService } from '../../services/ui/presentation-mode.service';
import { isSameToastText } from './app-toast';

type ToastMotionPhase = 'idle' | 'dragging' | 'returning' | 'dismiss-down' | 'dismiss-up';

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
    readonly sameText = isSameToastText;
    readonly toasts$ = this.appToastSrv.toasts$;
    private readonly motions = new Map<string, ToastMotion>();
    private readonly dismissalTimers = new Map<string, ReturnType<typeof setTimeout>>();
    private activePointer: { id: number; toastId: string; startY: number } | null = null;

    constructor(
        private appToastSrv: AppToastService,
        private presentation: PresentationModeService
    ) { }

    ngOnDestroy(): void {
        this.dismissalTimers.forEach(timer => clearTimeout(timer));
        this.dismissalTimers.clear();
    }

    trackByToastId(_: number, toast: AppToast): string {
        return toast.id;
    }

    dismiss(toast: AppToast): void {
        this.clearMotion(toast.id);
        this.appToastSrv.dismiss(toast.id);
    }

    executeAction(event: Event, toast: AppToast): void {
        event.stopPropagation();
        const action = toast.action;
        if (!action) return;
        this.clearMotion(toast.id);
        this.appToastSrv.dismiss(toast.id);
        void Promise.resolve(action.execute());
    }

    startDrag(event: PointerEvent, toast: AppToast): void {
        if (!this.presentation.snapshot.isMobilePresentationActive || event.button !== 0 || this.activePointer) return;
        this.activePointer = { id: event.pointerId, toastId: toast.id, startY: event.clientY };
        this.motions.set(toast.id, { phase: 'dragging', offsetX: 0, offsetY: 0 });
        this.appToastSrv.pause(toast.id);
        (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
    }

    moveDrag(event: PointerEvent): void {
        const active = this.activePointer;
        if (!active || active.id !== event.pointerId) return;
        const offsetY = Math.max(-144, Math.min(144, event.clientY - active.startY));
        this.motions.set(active.toastId, { phase: 'dragging', offsetX: 0, offsetY });
    }

    finishDrag(event: PointerEvent, toast: AppToast): void {
        const active = this.activePointer;
        if (!active || active.id !== event.pointerId || active.toastId !== toast.id) return;
        (event.currentTarget as HTMLElement | null)?.releasePointerCapture?.(event.pointerId);
        this.activePointer = null;
        this.settleDrag(toast);
    }

    cancelDrag(event: PointerEvent, toast: AppToast): void {
        if (!this.activePointer || this.activePointer.id !== event.pointerId || this.activePointer.toastId !== toast.id) return;
        this.activePointer = null;
        this.settleDrag(toast);
    }

    /**
     * Un arrastre suficiente, hacia abajo o hacia arriba, retira el aviso; uno corto lo devuelve a su sitio. Los avisos
     * de la interfaz ya no se guardan en una campana propia: la campana es la de la plataforma (NOTIFICACIONES.md).
     */
    private settleDrag(toast: AppToast): void {
        const offset = this.motionFor(toast.id).offsetY;
        if (offset >= 64) {
            this.animateAndDismiss(toast.id, { phase: 'dismiss-down', offsetX: 0, offsetY: 180 });
            return;
        }
        if (offset <= -64) {
            this.animateAndDismiss(toast.id, { phase: 'dismiss-up', offsetX: 0, offsetY: -180 });
            return;
        }
        this.restore(toast.id);
    }

    motionFor(id: string): ToastMotion {
        return this.motions.get(id) ?? { phase: 'idle', offsetX: 0, offsetY: 0 };
    }

    private restore(id: string): void {
        this.motions.set(id, { phase: 'returning', offsetX: 0, offsetY: 0 });
        this.appToastSrv.resume(id);
        this.setMotionTimer(id, 220, () => this.motions.delete(id));
    }

    private animateAndDismiss(id: string, motion: ToastMotion): void {
        this.motions.set(id, motion);
        this.setMotionTimer(id, 240, () => {
            this.motions.delete(id);
            this.appToastSrv.dismiss(id);
        });
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
