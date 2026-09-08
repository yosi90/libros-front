import { focusedControlScrollDelta, NativeKeyboardFocusService } from './native-keyboard-focus.service';

describe('focusedControlScrollDelta', () => {
    it('moves only the missing distance when a control is hidden by the keyboard', () => {
        expect(focusedControlScrollDelta({ top: 580, bottom: 628 }, 0, 600)).toBe(52);
    });

    it('moves a control below a sticky header down by the minimum distance', () => {
        expect(focusedControlScrollDelta({ top: 40, bottom: 88 }, 0, 600)).toBe(-32);
    });

    it('does not move a control already inside the useful viewport', () => {
        expect(focusedControlScrollDelta({ top: 180, bottom: 228 }, 0, 600)).toBe(0);
    });

    it('scrolls the nearest owner only by the obscured distance after the native viewport shrinks', () => {
        const documentListeners = new Map<string, EventListener>();
        const viewportListeners = new Map<string, EventListener>();
        const viewport = {
            height: 844,
            offsetTop: 0,
            addEventListener: (name: string, listener: EventListener) => viewportListeners.set(name, listener),
            removeEventListener: () => void 0
        };
        const view = {
            innerWidth: 390,
            innerHeight: 844,
            visualViewport: viewport,
            addEventListener: () => void 0,
            removeEventListener: () => void 0,
            requestAnimationFrame: (callback: FrameRequestCallback) => { callback(0); return 1; },
            cancelAnimationFrame: () => void 0,
            setTimeout: () => 1,
            clearTimeout: () => void 0,
            getComputedStyle: (element: Element) => window.getComputedStyle(element),
            scrollBy: jasmine.createSpy('scrollBy')
        };
        const owner = document.createElement('section');
        owner.style.height = '400px';
        owner.style.overflowY = 'auto';
        const input = document.createElement('input');
        const spacer = document.createElement('div');
        spacer.style.height = '1000px';
        owner.append(input, spacer);
        document.body.appendChild(owner);
        spyOn(input, 'getBoundingClientRect').and.returnValue({ top: 550, bottom: 598 } as DOMRect);
        const fakeDocument = {
            defaultView: view,
            body: document.body,
            documentElement: document.documentElement,
            scrollingElement: document.documentElement,
            activeElement: input,
            addEventListener: (name: string, listener: EventListener) => documentListeners.set(name, listener),
            removeEventListener: () => void 0
        } as unknown as Document;
        const service = new NativeKeyboardFocusService(fakeDocument, true);
        service.initialize();
        documentListeners.get('focusin')?.({ target: input } as unknown as Event);

        viewport.height = 500;
        viewportListeners.get('resize')?.(new Event('resize'));

        expect(owner.scrollTop).toBe(122);
        expect(Number.parseFloat(owner.style.paddingBottom)).toBeGreaterThanOrEqual(368);

        service.ngOnDestroy();
        owner.remove();
    });
});
