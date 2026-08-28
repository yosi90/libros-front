import { canOpenMobileDesignPreview } from './mobile-design-preview.guard';

describe('mobileDesignPreviewGuard', () => {
    it('solo habilita el laboratorio en hosts locales no nativos', () => {
        expect(canOpenMobileDesignPreview('127.0.0.1', false)).toBeTrue();
        expect(canOpenMobileDesignPreview('localhost', false)).toBeTrue();
        expect(canOpenMobileDesignPreview('qa-libros.yosiftware.es', false)).toBeFalse();
        expect(canOpenMobileDesignPreview('localhost', true)).toBeFalse();
    });
});
