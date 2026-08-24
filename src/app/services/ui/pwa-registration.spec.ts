import { shouldEnableServiceWorker } from './pwa-registration';

describe('shouldEnableServiceWorker', () => {
    it('enables the optimized QA worker only on canonical Hosting', () => {
        expect(shouldEnableServiceWorker(false, 'qa', 'qa-libros.yosiftware.es')).toBeTrue();
        expect(shouldEnableServiceWorker(false, 'qa', '127.0.0.1')).toBeFalse();
        expect(shouldEnableServiceWorker(false, 'qa', 'localhost')).toBeFalse();
    });

    it('preserves production PWA and disables every development build', () => {
        expect(shouldEnableServiceWorker(false, 'produccion', 'libros.yosiftware.es')).toBeTrue();
        expect(shouldEnableServiceWorker(true, 'qa', 'qa-libros.yosiftware.es')).toBeFalse();
    });
});
