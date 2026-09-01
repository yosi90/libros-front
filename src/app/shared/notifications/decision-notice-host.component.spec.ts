import { of } from 'rxjs';
import { DecisionNoticeHostComponent } from './decision-notice-host.component';

describe('DecisionNoticeHostComponent presentation', () => {
    function create(options: { mobile: boolean }) {
        const decisions = { notice$: of(null), close: jasmine.createSpy('close'), run: jasmine.createSpy('run') };
        const presentation = {
            snapshot: {
                isMobilePresentationActive: options.mobile
            }
        };
        return {
            component: new DecisionNoticeHostComponent(decisions as never, presentation as never),
            decisions
        };
    }

    it('does not let a Mobile notification background dismiss the notice', () => {
        const { component, decisions } = create({ mobile: true });

        component.closeFromBackdrop({ dismissible: true } as never);

        expect(decisions.close).not.toHaveBeenCalled();
    });

    it('keeps the existing dismissible backdrop behavior in Wood', () => {
        const { component, decisions } = create({ mobile: false });

        component.closeFromBackdrop({ dismissible: true } as never);
        component.closeFromBackdrop({ dismissible: false } as never);

        expect(decisions.close).toHaveBeenCalledTimes(1);
    });
});
