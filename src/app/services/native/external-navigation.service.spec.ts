import { ExternalNavigationService } from './external-navigation.service';

describe('ExternalNavigationService', () => {
    it('abre destinos web con el navegador nativo en Android', async () => {
        const browser = jasmine.createSpyObj('Browser', ['open']);
        browser.open.and.resolveTo(undefined);
        const service = new ExternalNavigationService(document, browser, true);

        expect(await service.open('https://example.com/wiki')).toBeTrue();

        expect(browser.open).toHaveBeenCalledOnceWith({ url: 'https://example.com/wiki', presentationStyle: 'popover' });
    });

    it('rechaza esquemas que podrían ejecutar contenido', async () => {
        const browser = jasmine.createSpyObj('Browser', ['open']);
        const service = new ExternalNavigationService(document, browser, true);

        expect(await service.open('javascript:alert(1)')).toBeFalse();
        expect(browser.open).not.toHaveBeenCalled();
    });

    it('mantiene window.open en web', async () => {
        const browser = jasmine.createSpyObj('Browser', ['open']);
        const windowOpen = spyOn(window, 'open').and.returnValue(window);
        const service = new ExternalNavigationService(document, browser, false);

        expect(await service.open('https://example.com/cover.png')).toBeTrue();
        expect(windowOpen).toHaveBeenCalledOnceWith('https://example.com/cover.png', '_blank', 'noopener,noreferrer');
        expect(browser.open).not.toHaveBeenCalled();
    });
});
