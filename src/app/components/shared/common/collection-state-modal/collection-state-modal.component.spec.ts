import { CollectionStateModalComponent } from './collection-state-modal.component';

describe('CollectionStateModalComponent presentation', () => {
    function create(options: { mobile: boolean; native?: boolean; compact?: boolean }) {
        const presentation = {
            snapshot: {
                isMobilePresentationActive: options.mobile,
                isNativeMobile: options.native ?? false
            }
        };
        const layout = { snapshot: { isCompact: options.compact ?? false } };
        return new CollectionStateModalComponent(presentation as never, layout as never);
    }

    it('uses fullscreen only in native-mobile and compact Mobile', () => {
        expect(create({ mobile: true, native: true }).isFullscreenPresentation).toBeTrue();
        expect(create({ mobile: true, compact: true }).isFullscreenPresentation).toBeTrue();
        expect(create({ mobile: true, compact: false }).isFullscreenPresentation).toBeFalse();
        expect(create({ mobile: false, compact: true }).isFullscreenPresentation).toBeFalse();
    });

    it('keeps a medium Mobile modal dismissible from its backdrop', () => {
        const component = create({ mobile: true, compact: false });
        spyOn(component.closeModal, 'emit');

        component.closeFromBackdrop();

        expect(component.closeModal.emit).toHaveBeenCalled();
    });

    it('does not dismiss a fullscreen surface from its background or while saving', () => {
        const component = create({ mobile: true, compact: true });
        spyOn(component.closeModal, 'emit');

        component.closeFromBackdrop();
        component.isSaving = true;
        component.requestClose();

        expect(component.closeModal.emit).not.toHaveBeenCalled();
    });
});
