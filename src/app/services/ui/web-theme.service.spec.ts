import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { AuthApiService } from '../auth/auth-api.service';
import { SessionService } from '../auth/session.service';
import { NATIVE_MOBILE_PLATFORM, PresentationModeService, WEB_PRESENTATION_ENABLED } from './presentation-mode.service';
import { WebThemeService } from './web-theme.service';

describe('WebThemeService', () => {
    let api: jasmine.SpyObj<AuthApiService>;
    let session: { userId: number; userIsLogged$: BehaviorSubject<boolean> };
    let presentation: jasmine.SpyObj<PresentationModeService>;

    function create(accountTheme: 'light' | 'dark' | 'wood' = 'light', enabled = true, native = false): WebThemeService {
        api.getInterfacePreferences.and.returnValue(of({ success: true, Preferencias: { Tema: accountTheme, Version: 3, FechaActualizacion: null } }));
        api.patchInterfacePreferences.and.returnValue(of({ success: true, Preferencias: { Tema: 'dark', Version: 4, FechaActualizacion: null } }));
        TestBed.configureTestingModule({
            providers: [
                { provide: AuthApiService, useValue: api },
                { provide: SessionService, useValue: session },
                { provide: PresentationModeService, useValue: presentation },
                { provide: WEB_PRESENTATION_ENABLED, useValue: enabled },
                { provide: NATIVE_MOBILE_PLATFORM, useValue: native }
            ]
        });
        return TestBed.inject(WebThemeService);
    }

    beforeEach(() => {
        localStorage.clear();
        api = jasmine.createSpyObj<AuthApiService>('api', ['getInterfacePreferences', 'patchInterfacePreferences']);
        session = { userId: 21, userIsLogged$: new BehaviorSubject<boolean>(false) };
        presentation = jasmine.createSpyObj<PresentationModeService>('presentation', ['attachWebTheme']);
    });

    afterEach(() => delete TestBed.inject(DOCUMENT).documentElement.dataset['webTheme']);

    it('adopta el tema de la cuenta solo en un dispositivo sin elección propia', () => {
        const service = create('wood');
        session.userIsLogged$.next(true);

        expect(service.choice()).toBe('wood');
        expect(localStorage.getItem('libros:web-theme:21')).toBe('wood');
        expect(presentation.attachWebTheme).toHaveBeenCalledTimes(1);
    });

    it('conserva la elección del dispositivo aunque la cuenta diga otra cosa', () => {
        localStorage.setItem('libros:web-theme:21', 'dark');
        const service = create('wood');
        session.userIsLogged$.next(true);

        expect(service.choice()).toBe('dark');
        expect(TestBed.inject(DOCUMENT).documentElement.dataset['webTheme']).toBe('dark');
    });

    it('guarda la selección localmente y la ofrece a la cuenta como valor inicial', () => {
        const service = create('light');
        session.userIsLogged$.next(true);

        service.select('dark');

        expect(service.choice()).toBe('dark');
        expect(localStorage.getItem('libros:web-theme:21')).toBe('dark');
        expect(localStorage.getItem('libros:web-theme:last')).toBe('dark');
        expect(api.patchInterfacePreferences).toHaveBeenCalledOnceWith(3, 'dark');
    });

    it('no actúa en la APK ni sin la flag', () => {
        const service = create('dark', true, true);
        session.userIsLogged$.next(true);
        service.select('dark');

        expect(service.enabled).toBeFalse();
        expect(presentation.attachWebTheme).not.toHaveBeenCalled();
        expect(api.getInterfacePreferences).not.toHaveBeenCalled();
    });
});
