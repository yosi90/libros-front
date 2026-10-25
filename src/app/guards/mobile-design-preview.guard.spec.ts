import { canOpenMobileDesignPreview } from './mobile-design-preview.guard';

describe('mobileDesignPreviewGuard', () => {
    it('solo habilita el laboratorio en hosts locales', () => {
        expect(canOpenMobileDesignPreview('127.0.0.1')).toBeTrue();
        expect(canOpenMobileDesignPreview('localhost')).toBeTrue();
        expect(canOpenMobileDesignPreview('qa-libros.yosiftware.es')).toBeFalse();
    });
});
