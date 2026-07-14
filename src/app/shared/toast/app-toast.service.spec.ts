import { fakeAsync, tick } from '@angular/core/testing';
import { AppToast } from './app-toast';
import { AppToastService } from './app-toast.service';
import { SessionNotificationStoreService } from '../../services/stores/session-notification-store.service';

describe('AppToastService', () => {
    beforeEach(() => sessionStorage.clear());

    it('incrementa repeticiones sin reiniciar el vencimiento original', fakeAsync(() => {
        const session = new SessionNotificationStoreService();
        const service = new AppToastService(session);
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
        expect(session.notices[0].repeatCount).toBe(2);
        tick(399);
        expect(toasts.length).toBe(1);
        tick(1);
        expect(toasts.length).toBe(0);
    }));

    it('conserva todos los tipos en el historial de sesión', () => {
        const session = new SessionNotificationStoreService();
        const service = new AppToastService(session);
        service.showSuccess('Uno'); service.showInfo('Dos'); service.showError('Tres'); service.showSystem('Cuatro');
        expect(session.notices.map(item => item.type).sort()).toEqual(['error', 'info', 'success', 'system']);
    });

    it('asigna un título específico aunque el emisor no lo aporte', () => {
        const session = new SessionNotificationStoreService();
        const service = new AppToastService(session);

        service.showSuccess('Email verificado. Ya puedes iniciar sesión.', { dedupeKey: 'auth:email-verified' });

        expect(session.notices).toEqual([jasmine.objectContaining({
            dedupeKey: 'auth:email-verified',
            title: 'Correo verificado'
        })]);
    });
});
