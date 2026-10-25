import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { LibraryAccessState, PlatformSessionService } from '../services/auth/platform-session.service';
import { notAuthGuard } from './notAuth.guard';

describe('notAuthGuard', () => {
    function run(options: { logged: boolean; access?: LibraryAccessState; query?: Record<string, string> }) {
        TestBed.resetTestingModule();
        const router = jasmine.createSpyObj<Router>('Router', ['parseUrl']);
        router.parseUrl.and.callFake(url => `tree:${url}` as never);
        const access = new BehaviorSubject<LibraryAccessState>(options.access ?? 'lista');
        TestBed.configureTestingModule({ providers: [
            { provide: PlatformSessionService, useValue: { access$: access, userIsLogged: options.logged } },
            { provide: Router, useValue: router }
        ] });
        const route = { queryParamMap: convertToParamMap(options.query ?? {}) } as ActivatedRouteSnapshot;
        let result: unknown;
        TestBed.runInInjectionContext(() => (notAuthGuard(route, {} as never) as Observable<unknown>).subscribe(value => result = value));
        return { result, router, access };
    }

    it('con la cuenta lista vuelve a donde se pidió entrar (una recarga del libro sigue en el libro)', () => {
        const { result } = run({ logged: true, query: { volver: '/book/29/statistics' } });

        expect(result).toBe('tree:/book/29/statistics' as never);
    });

    it('sin «volver» o con uno de fuera de la biblioteca va a la biblioteca', () => {
        expect(run({ logged: true }).result).toBe('tree:/dashboard' as never);
        expect(run({ logged: true, query: { volver: '//otra.web/x' } }).result).toBe('tree:/dashboard' as never);
    });

    it('sin sesión deja ver la portada', () => {
        expect(run({ logged: false, access: 'sin_sesion' }).result).toBeTrue();
    });

    it('espera mientras se comprueba la cuenta o se carga el usuario', () => {
        const { result, access } = run({ logged: false, access: 'cargando' });

        expect(result).toBeUndefined();
        access.next('sin_sesion');
    });
});
