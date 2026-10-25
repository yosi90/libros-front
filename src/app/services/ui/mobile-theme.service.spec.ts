import { Injector } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MobileThemeService } from './mobile-theme.service';
import { WebThemeService } from './web-theme.service';

describe('MobileThemeService', () => {
    beforeEach(() => localStorage.clear());

    it('recuerda el tema en el dispositivo y lo aplica a la raíz del documento', () => {
        localStorage.setItem('libros:mobile-theme:last', 'dark');
        const service = new MobileThemeService(document, false, {} as Injector);

        service.initialize();

        expect(service.theme()).toBe('dark');
        expect(service.actionIcon).toBe('light_mode');
        expect(document.documentElement.dataset['mobileTheme']).toBe('dark');
    });

    it('alterna solo entre claro y oscuro y lo guarda en el dispositivo', () => {
        const service = new MobileThemeService(document, false, {} as Injector);
        service.initialize();

        service.toggle();

        expect(service.theme()).toBe('dark');
        expect(service.actionLabel).toBe('Usar tema claro');
        expect(localStorage.getItem('libros:mobile-theme:last')).toBe('dark');
    });

    it('lleva un Wood guardado antes a claro en Mobile', () => {
        localStorage.setItem('libros:mobile-theme:last', 'wood');
        const service = new MobileThemeService(document, false, {} as Injector);

        service.initialize();

        expect(service.theme()).toBe('light');
        expect(document.documentElement.dataset['mobileTheme']).toBe('light');
    });

    it('mirrors the device web theme in the browser and routes the toggle to it', () => {
        const choice$ = new BehaviorSubject<'light' | 'dark' | 'wood'>('dark');
        const webTheme = jasmine.createSpyObj<WebThemeService>('webTheme', ['select'], { choice$: choice$.asObservable() });
        const injector = { get: () => webTheme } as unknown as Injector;
        const service = new MobileThemeService(document, true, injector);

        service.initialize();
        expect(service.theme()).toBe('dark');

        choice$.next('wood');
        expect(service.theme()).toBe('light');

        service.toggle();
        expect(webTheme.select).toHaveBeenCalledOnceWith('dark');
    });
});
