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
});
