import { fakeAsync, tick } from '@angular/core/testing';
import { AppToast } from './app-toast';
import { AppToastService } from './app-toast.service';

describe('AppToastService', () => {
    beforeEach(() => sessionStorage.clear());

    it('incrementa repeticiones sin reiniciar el vencimiento original', fakeAsync(() => {
        const service = new AppToastService();
        let toasts: AppToast[] = [];
        service.toasts$.subscribe(value => toasts = value);

        service.showError('Debes aceptar las normas.', { durationMs: 1000 });
        const createdAt = toasts[0].createdAt;
        const expiresAt = toasts[0].expiresAt;
        tick(600);
        service.showError('Debes aceptar las normas.', { durationMs: 1000 });

        expect(toasts[0].repeatCount).toBe(2);
        expect(toasts[0].createdAt).toBe(createdAt);
        expect(toasts[0].expiresAt).toBe(expiresAt);
        tick(399);
        expect(toasts.length).toBe(1);
        tick(1);
        expect(toasts.length).toBe(0);
    }));

    it('asigna un título específico aunque el emisor no lo aporte', () => {
        const service = new AppToastService();
        let toasts: AppToast[] = [];
        service.toasts$.subscribe(value => toasts = value);

        service.showSuccess('Email verificado. Ya puedes iniciar sesión.', { dedupeKey: 'auth:email-verified' });

        expect(toasts[0]).toEqual(jasmine.objectContaining({ dedupeKey: 'auth:email-verified', title: 'Correo verificado' }));
    });

    it('conserva un icono informativo explícito para el host visual', () => {
        const service = new AppToastService();
        let toasts: AppToast[] = [];
        service.toasts$.subscribe(value => toasts = value);

        service.showInfo('Completa los bloques anteriores.', { icon: 'help_outline' });

        expect(toasts[0].type).toBe('info');
        expect(toasts[0].icon).toBe('help_outline');
    });

    it('pausa el vencimiento durante un gesto y lo reanuda con el tiempo restante', fakeAsync(() => {
        const service = new AppToastService();
        let toasts: AppToast[] = [];
        service.toasts$.subscribe(value => toasts = value);
        service.showInfo('Deslízame', { durationMs: 1000 });
        const id = toasts[0].id;

        tick(400);
        service.pause(id);
        tick(900);
        expect(toasts.length).toBe(1);
        service.resume(id);
        tick(599);
        expect(toasts.length).toBe(1);
        tick(1);
        expect(toasts).toEqual([]);
    }));
});
