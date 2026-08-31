import { shouldEnableServiceWorker } from './pwa-registration';

describe('shouldEnableServiceWorker', () => {
    it('enables the optimized QA worker only on canonical Hosting', () => {
        expect(shouldEnableServiceWorker(false, 'qa', 'qa-libros.yosiftware.es')).toBeTrue();
        expect(shouldEnableServiceWorker(false, 'qa', '127.0.0.1')).toBeFalse();
        expect(shouldEnableServiceWorker(false, 'qa', 'localhost')).toBeFalse();
    });

    it('enables the optimized QA worker inside the native WebView', () => {
        expect(shouldEnableServiceWorker(false, 'qa', 'localhost', true)).toBeTrue();
        expect(shouldEnableServiceWorker(true, 'qa', 'localhost', true)).toBeTrue();
    });

    it('preserves production PWA and disables every development build', () => {
        expect(shouldEnableServiceWorker(false, 'produccion', 'libros.yosiftware.es')).toBeTrue();
        expect(shouldEnableServiceWorker(true, 'qa', 'qa-libros.yosiftware.es')).toBeFalse();
        expect(shouldEnableServiceWorker(true, 'desarrollo', 'localhost', true)).toBeFalse();
    });
});
