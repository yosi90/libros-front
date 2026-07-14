import { DecisionNoticeService } from './decision-notice.service';
import { SessionNotificationStoreService } from '../stores/session-notification-store.service';

describe('DecisionNoticeService', () => {
    beforeEach(() => sessionStorage.clear());

    it('no descarta un diálogo obligatorio por cierre externo pero sí tras ejecutar una acción', async () => {
        const session = new SessionNotificationStoreService();
        const service = new DecisionNoticeService(session);
        const execute = jasmine.createSpy();
        service.show({ id: 'required', title: 'Requerido', message: 'Decide', type: 'system', dismissible: false, actions: [{ id: 'accept', label: 'Aceptar', appearance: 'primary', execute }] });
        let current = service['noticeSubject'].value;
        service.close();
        expect(service['noticeSubject'].value).toBe(current);
        await service.run(current!.actions[0]);
        expect(execute).toHaveBeenCalled();
        expect(service['noticeSubject'].value).toBeNull();
        expect(session.notices[0].action?.label).toBe('Aceptar');
    });

    it('solo abre una vez la misma decisión durante la sesión', () => {
        const service = new DecisionNoticeService(new SessionNotificationStoreService());
        const notice = { id: 'policy', title: 'Normas', message: 'Revisa', type: 'system' as const, dismissible: true, actions: [{ id: 'later', label: 'Más tarde', appearance: 'secondary' as const, execute: () => void 0 }] };
        service.show(notice, 'policy-once');
        service.close();
        service.show(notice, 'policy-once');
        expect(service['noticeSubject'].value).toBeNull();
    });
});
