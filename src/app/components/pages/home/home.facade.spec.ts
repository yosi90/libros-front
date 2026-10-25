import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { LibraryAccessState, PlatformSessionService } from '../../../services/auth/platform-session.service';
import { HomeFacade, homeNotice, safeReturnUrl } from './home.facade';

describe('HomeFacade', () => {
    function create(volver: string | null = null) {
        const session = {
            access: 'sin_sesion' as LibraryAccessState,
            access$: new BehaviorSubject<LibraryAccessState>('sin_sesion'),
            userIsLogged$: new BehaviorSubject(false),
            entrar: jasmine.createSpy('entrar').and.resolveTo(true),
            retry: jasmine.createSpy('retry'),
            socialUrl: (vista?: string) => `https://social.test/?vista=${vista}`
        };
        const router = { navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true) };
        TestBed.configureTestingModule({
            providers: [
                HomeFacade,
                { provide: PlatformSessionService, useValue: session },
                { provide: Router, useValue: router },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(volver ? { volver } : {}) } } }
            ]
        });
        return { facade: TestBed.inject(HomeFacade), session, router };
    }

    it('mantiene la misma cita durante toda la vida de la ruta', () => {
        spyOn(Math, 'random').and.returnValue(0.25);
        const { facade } = create();
        const initialQuote = facade.readingQuote();

        expect(facade.readingQuote()).toBe(initialQuote);
        expect(initialQuote.texto).toBeTruthy();
        expect(initialQuote.autor).toBeTruthy();
    });

    it('abre el acceso de Yosiftware para entrar o crear la cuenta', () => {
        const { facade, session } = create();

        facade.entrar('registro');
        facade.entrar();

        expect(session.entrar.calls.allArgs()).toEqual([['registro'], ['entrar']]);
    });

    it('al entrar vuelve a donde se pidió la sesión', () => {
        const { session, router } = create('/book/73/chapter/11');

        session.userIsLogged$.next(true);

        expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/book/73/chapter/11', { replaceUrl: true });
    });

    it('solo vuelve a rutas propias de Libros', () => {
        expect(safeReturnUrl('/dashboard/catalog?q=1')).toBe('/dashboard/catalog?q=1');
        expect(safeReturnUrl('//evil.example/x')).toBe('/dashboard');
        expect(safeReturnUrl('https://evil.example')).toBe('/dashboard');
        expect(safeReturnUrl('/home')).toBe('/dashboard');
        expect(safeReturnUrl(null)).toBe('/dashboard');
    });

    it('explica por qué aún no se puede entrar y permite reintentar tras un fallo', () => {
        const { facade, session } = create();
        session.access$.next('error');

        expect(facade.notice()).toContain('No hemos podido abrir tu biblioteca');
        expect(facade.canRetry()).toBeTrue();
        facade.retry();
        expect(session.retry).toHaveBeenCalled();

        expect(homeNotice('sin_sesion')).toBeNull();
        expect(homeNotice('cuenta_borrada')).toContain('se ha borrado');
    });
});
