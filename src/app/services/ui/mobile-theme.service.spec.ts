import { of } from 'rxjs';
import { Style } from '@capacitor/status-bar';
import { AuthApiService } from '../auth/auth-api.service';
import { SessionService } from '../auth/session.service';
import { MobileThemeService, nativeStatusBarStyle } from './mobile-theme.service';

describe('MobileThemeService', () => {
    beforeEach(() => localStorage.clear());

    it('loads the canonical dark preference and applies it to the document root', () => {
        const api = jasmine.createSpyObj<AuthApiService>('api', ['getInterfacePreferences', 'patchInterfacePreferences']);
        api.getInterfacePreferences.and.returnValue(of({
            success: true,
            Preferencias: { Tema: 'dark', Version: 4, FechaActualizacion: null }
        }));
        const service = new MobileThemeService(api, { userId: 12 } as SessionService, document, false);

        service.initialize();

        expect(service.theme()).toBe('dark');
        expect(service.actionIcon).toBe('light_mode');
        expect(document.documentElement.dataset['mobileTheme']).toBe('dark');
        expect(localStorage.getItem('libros:mobile-theme:12')).toBe('dark');
    });

    it('toggles only between light and dark and persists the current API version', () => {
        const api = jasmine.createSpyObj<AuthApiService>('api', ['getInterfacePreferences', 'patchInterfacePreferences']);
        api.getInterfacePreferences.and.returnValue(of({
            success: true,
            Preferencias: { Tema: 'light', Version: 7, FechaActualizacion: null }
        }));
        api.patchInterfacePreferences.and.returnValue(of({
            success: true,
            Preferencias: { Tema: 'dark', Version: 8, FechaActualizacion: null }
        }));
        const service = new MobileThemeService(api, { userId: 15 } as SessionService, document, false);
        service.initialize();

        service.toggle();

        expect(api.patchInterfacePreferences).toHaveBeenCalledOnceWith(7, 'dark');
        expect(service.theme()).toBe('dark');
        expect(service.actionLabel).toBe('Usar tema claro');
    });

    it('maps a legacy wood value to light in Mobile', () => {
        const api = jasmine.createSpyObj<AuthApiService>('api', ['getInterfacePreferences', 'patchInterfacePreferences']);
        api.getInterfacePreferences.and.returnValue(of({
            success: true,
            Preferencias: { Tema: 'wood', Version: 2, FechaActualizacion: null }
        }));
        const service = new MobileThemeService(api, { userId: 3 } as SessionService, document, false);

        service.initialize();

        expect(service.theme()).toBe('light');
        expect(document.documentElement.dataset['mobileTheme']).toBe('light');
    });

    it('uses dark native text on light and light native text on dark', () => {
        expect(nativeStatusBarStyle('light')).toBe(Style.Light);
        expect(nativeStatusBarStyle('dark')).toBe(Style.Dark);
    });
});
