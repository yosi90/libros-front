import { SessionNotificationStoreService } from './session-notification-store.service';

describe('SessionNotificationStoreService', () => {
    beforeEach(() => sessionStorage.clear());

    it('marca vistos, limpia avisos y conserva ocultaciones persistentes en sessionStorage', () => {
        const service = new SessionNotificationStoreService();
        service.ingest({ dedupeKey: 'error:a', type: 'error', message: 'A' });
        expect(service.unseenCount).toBe(1);
        service.markAllSeen();
        expect(service.unseenCount).toBe(0);
        service.hidePersistent([4, 7]);
        service.clearNotices();

        const restored = new SessionNotificationStoreService();
        expect(restored.notices).toEqual([]);
        expect(restored.isPersistentHidden(4)).toBeTrue();
        expect(restored.isPersistentHidden(7)).toBeTrue();
    });

    it('deriva un título útil cuando el toast no proporciona uno', () => {
        const service = new SessionNotificationStoreService();
        service.ingest({ dedupeKey: 'success:library', type: 'success', message: 'Añadido a tu biblioteca' });
        service.ingest({ dedupeKey: 'success:policy', type: 'success', message: 'Norma aceptada correctamente' });

        expect(Object.fromEntries(service.notices.map(item => [item.dedupeKey, item.title]))).toEqual({
            'success:library': 'Biblioteca actualizada',
            'success:policy': 'Normas de comunidad actualizadas'
        });
    });

    it('no introduce títulos genéricos para avisos sin título explícito', () => {
        const service = new SessionNotificationStoreService();
        service.ingest({ dedupeKey: 'success:email', type: 'success', message: 'Email verificado. Ya puedes iniciar sesión.' });
        service.ingest({ dedupeKey: 'info:custom', type: 'info', message: 'Hay una invitación nueva para tu club.' });

        expect(service.notices.find(item => item.dedupeKey === 'success:email')?.title).toBe('Correo verificado');
        expect(service.notices.map(item => item.title)).not.toContain('Operación completada');
        expect(service.notices.map(item => item.title)).not.toContain('Información');
    });
});
