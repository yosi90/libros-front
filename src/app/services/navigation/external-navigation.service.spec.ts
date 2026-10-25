import { ExternalNavigationService } from './external-navigation.service';

describe('ExternalNavigationService', () => {
    it('rechaza esquemas que podrían ejecutar contenido', async () => {
        const windowOpen = spyOn(window, 'open');
        const service = new ExternalNavigationService(document);

        expect(await service.open('javascript:alert(1)')).toBeFalse();
        expect(windowOpen).not.toHaveBeenCalled();
    });

    it('abre los destinos web en otra pestaña sin dar acceso a la página', async () => {
        const windowOpen = spyOn(window, 'open').and.returnValue(window);
        const service = new ExternalNavigationService(document);

        expect(await service.open('https://example.com/cover.png')).toBeTrue();
        expect(windowOpen).toHaveBeenCalledOnceWith('https://example.com/cover.png', '_blank', 'noopener,noreferrer');
    });
});
