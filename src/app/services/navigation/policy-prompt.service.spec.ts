import { NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { DecisionNoticeService } from './decision-notice.service';
import { PolicyPromptService } from './policy-prompt.service';
import { SessionNotificationStoreService } from '../stores/session-notification-store.service';

describe('PolicyPromptService', () => {
    beforeEach(() => sessionStorage.clear());

    function create() {
        const decisions = new DecisionNoticeService(new SessionNotificationStoreService());
        const router = jasmine.createSpyObj('Router', ['navigate'], { url: '/dashboard/home' });
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

    it('sin contexto avisa una vez por pantalla y vuelve a avisar en cada pantalla nueva', () => {
        const { service, decisions, router } = create();
        service.trigger('usage_policy_acceptance_required');
        expect(decisions['noticeSubject'].value).not.toBeNull();
        decisions.close();
        service.trigger('usage_policy_acceptance_required');
        expect(decisions['noticeSubject'].value).toBeNull();

        (Object.getOwnPropertyDescriptor(router, 'url')!.get as jasmine.Spy).and.returnValue('/dashboard/library?tab=1');
        service.trigger('usage_policy_acceptance_required');
        expect(decisions['noticeSubject'].value).not.toBeNull();
    });

    it('no tapa la sección donde se aceptan las normas', () => {
        const { service, decisions, router } = create();
        const url = Object.getOwnPropertyDescriptor(router, 'url')!.get as jasmine.Spy;
        for (const route of ['/dashboard/account-security?section=policies', '/dashboard/profile?section=security&tab=policies']) {
            url.and.returnValue(route);
            service.trigger('usage_policy_acceptance_required');
            service.trigger('usage_policy_acceptance_required', 'abrir tus libros');
            expect(decisions['noticeSubject'].value).toBeNull();
        }
    });

    it('al limpiarse vuelve a avisar en la misma pantalla', () => {
        const { service, decisions } = create();
        service.trigger('usage_policy_acceptance_required');
        service.clear();
        expect(decisions['noticeSubject'].value).toBeNull();
        service.trigger('usage_policy_acceptance_required');
        expect(decisions['noticeSubject'].value).not.toBeNull();
    });

    it('se cierra al llegar a las normas aunque se disparase antes de navegar', () => {
        const decisions = new DecisionNoticeService(new SessionNotificationStoreService());
        const events = new Subject<unknown>();
        const router = jasmine.createSpyObj('Router', ['navigate'], { url: '/', events });
        const service = new PolicyPromptService(decisions, router);
        service.trigger('usage_policy_acceptance_required');
        expect(decisions['noticeSubject'].value).not.toBeNull();

        events.next(new NavigationEnd(1, '/dashboard/account-security?section=policies', '/dashboard/profile?section=security&tab=policies'));
        expect(decisions['noticeSubject'].value).toBeNull();
    });
});
