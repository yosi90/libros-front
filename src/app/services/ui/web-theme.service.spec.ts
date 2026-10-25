import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { PlatformSessionService } from '../auth/platform-session.service';
import { PresentationModeService, WEB_PRESENTATION_ENABLED } from './presentation-mode.service';
import { WebThemeService } from './web-theme.service';

describe('WebThemeService', () => {
    let session: { userIsLogged$: BehaviorSubject<boolean> };
    let presentation: jasmine.SpyObj<PresentationModeService>;

    function create(enabled = true): WebThemeService {
        TestBed.configureTestingModule({
            providers: [
                { provide: PlatformSessionService, useValue: session },
                { provide: PresentationModeService, useValue: presentation },
                { provide: WEB_PRESENTATION_ENABLED, useValue: enabled }
            ]
        });
        return TestBed.inject(WebThemeService);
    }

    beforeEach(() => {
        localStorage.clear();
        session = { userIsLogged$: new BehaviorSubject<boolean>(false) };
        presentation = jasmine.createSpyObj<PresentationModeService>('presentation', ['attachWebTheme']);
    });

    afterEach(() => {
        const root = TestBed.inject(DOCUMENT).documentElement;
        delete root.dataset['webTheme'];
        delete root.dataset['theme'];
    });

    it('recuerda el tema por dispositivo y lo conserva al cambiar de cuenta', () => {
        localStorage.setItem('libros:web-theme:last', 'dark');
        const service = create();
        session.userIsLogged$.next(true);
        session.userIsLogged$.next(false);
        session.userIsLogged$.next(true);

        expect(service.choice()).toBe('dark');
        expect(localStorage.getItem('libros:web-theme:last')).toBe('dark');
        expect(presentation.attachWebTheme).toHaveBeenCalledTimes(1);
    });

    it('dice a las ventanas del SDK si el tema es claro u oscuro (Wood es oscuro)', () => {
        const service = create();
        const root = TestBed.inject(DOCUMENT).documentElement;
        expect(root.dataset['theme']).toBe('light');

        service.select('wood');
        expect(root.dataset['theme']).toBe('dark');
        expect(root.dataset['webTheme']).toBe('light');

        service.select('dark');
        expect(root.dataset['theme']).toBe('dark');
        expect(root.dataset['webTheme']).toBe('dark');
    });

    it('sabe si el dispositivo aún no ha elegido estilo, para la bienvenida', () => {
        const service = create();
        expect(service.choiceUnset()).toBeNull();

        session.userIsLogged$.next(true);
        expect(service.choiceUnset()).toBeTrue();

        service.select('light');
        expect(service.choiceUnset()).toBeFalse();
        expect(localStorage.getItem('libros:web-theme:last')).toBe('light');
    });

    it('no actúa sin la flag', () => {
        const service = create(false);
        session.userIsLogged$.next(true);
        service.select('dark');

        expect(service.enabled).toBeFalse();
        expect(presentation.attachWebTheme).not.toHaveBeenCalled();
        expect(localStorage.getItem('libros:web-theme:last')).toBeNull();
    });
});
