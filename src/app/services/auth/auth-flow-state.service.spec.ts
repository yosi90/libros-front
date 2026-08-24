import { AuthFlowStateService } from './auth-flow-state.service';

describe('AuthFlowStateService', () => {
    it('keeps onboarding and link tickets only until they are consumed', () => {
        const service = new AuthFlowStateService();
        const onboarding = { success: true as const, Estado: 'onboarding_required' as const, Ticket: 'onboarding', ExpiresIn: 600 as const };
        const link = { success: true as const, Estado: 'link_required' as const, Ticket: 'link', ExpiresIn: 600 as const };

        service.setOnboarding(onboarding, { alias: 'Lectora' });
        service.setLink(link);

        expect(service.consumeOnboarding()?.draft.alias).toBe('Lectora');
        expect(service.onboarding).toBeNull();
        expect(service.consumeLink()?.Ticket).toBe('link');
        expect(service.link).toBeNull();
    });
});
