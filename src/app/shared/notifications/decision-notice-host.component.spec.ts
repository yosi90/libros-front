import { of } from 'rxjs';
import { DecisionNoticeHostComponent } from './decision-notice-host.component';

describe('DecisionNoticeHostComponent presentation', () => {
    function create(options: { mobile: boolean; native?: boolean; compact?: boolean }) {
        const decisions = { notice$: of(null), close: jasmine.createSpy('close'), run: jasmine.createSpy('run') };
        const presentation = {
            snapshot: {
                isMobilePresentationActive: options.mobile,
                isNativeMobile: options.native ?? false
            }
        };
        const layout = { snapshot: { isCompact: options.compact ?? false } };
        return {
            component: new DecisionNoticeHostComponent(decisions as never, presentation as never, layout as never),
            decisions
        };
    }

    it('uses fullscreen for compact Mobile and every native-mobile width, but not Mobile medium', () => {
        expect(create({ mobile: true, compact: true }).component.isFullscreenPresentation).toBeTrue();
        expect(create({ mobile: true, native: true }).component.isFullscreenPresentation).toBeTrue();
        expect(create({ mobile: true, compact: false }).component.isFullscreenPresentation).toBeFalse();
    });

    it('only lets a modal backdrop dismiss a dismissible notice', () => {
        const { component, decisions } = create({ mobile: true, compact: false });

        component.closeFromBackdrop({ dismissible: true } as never);
        component.closeFromBackdrop({ dismissible: false } as never);

        expect(decisions.close).toHaveBeenCalledTimes(1);
    });

    it('never dismisses a fullscreen notice by touching its background', () => {
        const { component, decisions } = create({ mobile: true, compact: true });

        component.closeFromBackdrop({ dismissible: true } as never);

        expect(decisions.close).not.toHaveBeenCalled();
    });
});
