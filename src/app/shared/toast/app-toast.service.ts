import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppToast, AppToastOptions, AppToastType } from './app-toast';

@Injectable({
    providedIn: 'root',
})
export class AppToastService {
    private readonly toastsSubject = new BehaviorSubject<AppToast[]>([]);
    private readonly closeTimers = new Map<string, number>();
    private sequence = 0;

    readonly toasts$ = this.toastsSubject.asObservable();

    showSuccess(message: string, options?: AppToastOptions): void {
        this.show('success', message, options);
    }

    showError(message: string, options?: AppToastOptions): void {
        this.show('error', message, options);
    }

    showInfo(message: string, options?: AppToastOptions): void {
        this.show('info', message, options);
    }

    showSystem(message: string, options?: AppToastOptions): void {
        this.show('system', message, options);
    }

    dismiss(id: string): void {
        const timer = this.closeTimers.get(id);
        if (timer !== undefined) {
            clearTimeout(timer);
            this.closeTimers.delete(id);
        }

        this.toastsSubject.next(this.toastsSubject.value.filter((toast) => toast.id !== id));
    }

    private show(type: AppToastType, rawMessage: string, options?: AppToastOptions): void {
        const message = `${rawMessage ?? ''}`.trim() || this.getDefaultFallback(type);
        if (message.length < 1)
            return;

        const explicitDedupeKey = `${options?.dedupeKey ?? ''}`.trim();
        const dedupeKey = this.resolveDedupeKey(type, message, options);
        const durationMs = this.resolveDuration(type, options?.durationMs);
        const existing = dedupeKey
            ? this.toastsSubject.value.find((toast) => toast.dedupeKey === dedupeKey) ?? null
            : null;

        const toast: AppToast = {
            id: existing?.id ?? `app-toast-${Date.now()}-${++this.sequence}`,
            dedupeKey,
            message,
            type,
            createdAt: Date.now(),
            durationMs,
            repeatCount: existing && this.sameToastSignature(existing, type, message, explicitDedupeKey.length > 0)
                ? existing.repeatCount + 1
                : 1,
        };

        this.toastsSubject.next(existing
            ? [...this.toastsSubject.value.filter((item) => item.id !== existing.id), toast]
            : [...this.toastsSubject.value, toast]);

        this.scheduleDismiss(toast.id, durationMs);
    }

    private getDefaultFallback(type: AppToastType): string {
        if (type === 'success')
            return 'Accion completada.';
        if (type === 'info' || type === 'system')
            return 'Hay un aviso para revisar.';
        return 'No se pudo completar la accion.';
    }

    private resolveDuration(type: AppToastType, explicit?: number): number {
        if (Number.isFinite(explicit) && Number(explicit) > 0)
            return Math.trunc(Number(explicit));
        if (type === 'success')
            return 3200;
        if (type === 'info')
            return 4200;
        if (type === 'system')
            return 7600;
        return 7200;
    }

    private scheduleDismiss(id: string, durationMs: number): void {
        const previous = this.closeTimers.get(id);
        if (previous !== undefined)
            clearTimeout(previous);

        const timer = window.setTimeout(() => {
            this.closeTimers.delete(id);
            this.dismiss(id);
        }, durationMs);
        this.closeTimers.set(id, timer);
    }

    private resolveDedupeKey(type: AppToastType, message: string, options?: AppToastOptions): string | null {
        const explicit = `${options?.dedupeKey ?? ''}`.trim();
        if (explicit.length > 0)
            return explicit;
        return `toast:${type}:${message}`.toLowerCase();
    }

    private sameToastSignature(
        toast: AppToast,
        type: AppToastType,
        message: string,
        allowMessageVariance: boolean
    ): boolean {
        if (allowMessageVariance)
            return toast.type === type;
        return toast.type === type && toast.message === message;
    }
}
