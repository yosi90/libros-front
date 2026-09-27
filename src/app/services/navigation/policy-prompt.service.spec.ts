import { DecisionNoticeService } from './decision-notice.service';
import { PolicyPromptService } from './policy-prompt.service';
import { SessionNotificationStoreService } from '../stores/session-notification-store.service';

describe('PolicyPromptService', () => {
    beforeEach(() => sessionStorage.clear());

    function create() {
        const decisions = new DecisionNoticeService(new SessionNotificationStoreService());
        const router = jasmine.createSpyObj('Router', ['navigate']);
        return { service: new PolicyPromptService(decisions, router), decisions, router };
    }

    it('nombra lo que se intentaba y se muestra en cada intento', () => {
        const { service, decisions, router } = create();
        service.trigger('creation_policy_acceptance_required', 'añadir libros a tu biblioteca o cambiar su estado');
        const notice = decisions['noticeSubject'].value!;
        expect(notice.message).toBe('Para añadir libros a tu biblioteca o cambiar su estado, acepta primero las normas de creación.');
        notice.actions[0].execute();
        expect(router.navigate).toHaveBeenCalledWith(['/dashboard/account-security'], { queryParams: { section: 'policies' } });

        decisions.close();
        service.trigger('usage_policy_acceptance_required', 'abrir tus libros');
        expect(decisions['noticeSubject'].value!.message).toBe('Para abrir tus libros, acepta primero las normas de uso.');
    });

    it('sin contexto abre el aviso genérico una sola vez por sesión', () => {
        const { service, decisions } = create();
        service.trigger('usage_policy_acceptance_required');
        decisions.close();
        service.trigger('usage_policy_acceptance_required');
        expect(decisions['noticeSubject'].value).toBeNull();
    });
});
