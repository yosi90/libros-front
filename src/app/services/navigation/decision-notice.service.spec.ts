import { DecisionNoticeService } from './decision-notice.service';

describe('DecisionNoticeService', () => {
    beforeEach(() => sessionStorage.clear());

    it('no descarta un diálogo obligatorio por cierre externo pero sí tras ejecutar una acción', async () => {
        const service = new DecisionNoticeService();
        const execute = jasmine.createSpy();
        service.show({ id: 'required', title: 'Requerido', message: 'Decide', type: 'system', dismissible: false, actions: [{ id: 'accept', label: 'Aceptar', appearance: 'primary', execute }] });
        let current = service['noticeSubject'].value;
        service.close();
        expect(service['noticeSubject'].value).toBe(current);
        await service.run(current!.actions[0]);
        expect(execute).toHaveBeenCalled();
        expect(service['noticeSubject'].value).toBeNull();
    });

    it('solo abre una vez la misma decisión durante la sesión', () => {
        const service = new DecisionNoticeService();
        const notice = { id: 'policy', title: 'Normas', message: 'Revisa', type: 'system' as const, dismissible: true, actions: [{ id: 'later', label: 'Más tarde', appearance: 'secondary' as const, execute: () => void 0 }] };
        service.show(notice, 'policy-once');
        service.close();
        service.show(notice, 'policy-once');
        expect(service['noticeSubject'].value).toBeNull();
    });

    it('retiene el aviso mientras la bienvenida de estilo está abierta y lo presenta al terminar', () => {
        const service = new DecisionNoticeService();
        const notice = { id: 'community-policies', title: 'Normas', message: 'Revisa', type: 'system' as const, dismissible: true, actions: [{ id: 'later', label: 'Más tarde', appearance: 'secondary' as const, execute: () => void 0 }] };
        let held = true;
        service.holdWhile(() => held);
        service.show(notice, 'policy-once');
        expect(service['noticeSubject'].value).toBeNull();
        held = false;
        service.releaseHeld();
        expect(service['noticeSubject'].value?.id).toBe('community-policies');
    });

    it('no presenta un aviso retenido que se retiró antes de liberarlo', () => {
        const service = new DecisionNoticeService();
        const notice = { id: 'community-policies', title: 'Normas', message: 'Revisa', type: 'system' as const, dismissible: true, actions: [{ id: 'later', label: 'Más tarde', appearance: 'secondary' as const, execute: () => void 0 }] };
        let held = true;
        service.holdWhile(() => held);
        service.show(notice);
        service.remove('community-policies');
        held = false;
        service.releaseHeld();
        expect(service['noticeSubject'].value).toBeNull();
    });
});
