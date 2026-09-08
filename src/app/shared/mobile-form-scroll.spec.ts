import { scrollMobileFormBlockIntoView } from './mobile-form-scroll';

describe('scrollMobileFormBlockIntoView', () => {
    it('waits for the new block and centers it with reduced-motion support', () => {
        const callbacks: FrameRequestCallback[] = [];
        const target = { scrollIntoView: jasmine.createSpy('scrollIntoView') };
        const view = {
            requestAnimationFrame: (callback: FrameRequestCallback) => {
                callbacks.push(callback);
                return callbacks.length;
            },
            matchMedia: () => ({ matches: true })
        };
        const host = {
            ownerDocument: { defaultView: view },
            querySelector: jasmine.createSpy('querySelector').and.returnValue(target)
        } as unknown as HTMLElement;

        scrollMobileFormBlockIntoView(host, '[data-entry-index="1"]');
        callbacks.shift()?.(0);
        callbacks.shift()?.(0);

        expect(host.querySelector).toHaveBeenCalledWith('[data-entry-index="1"]');
        expect(target.scrollIntoView).toHaveBeenCalledWith({
            behavior: 'auto',
            block: 'center',
            inline: 'nearest'
        });
    });
});
