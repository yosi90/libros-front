import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environment/environment';
import { crearDobleYosiftware, type DobleYosiftware, type OpcionesDelDoble } from '../../../../pruebas/yosiftware-doble/yosiftware-doble.js';
import { GENERACION_PETICION, IdentityChange, PlatformSessionService } from './platform-session.service';
import { CARGADOR_SDK } from './yosiftware-sdk';

const cuenta = (id: string) => ({ id, alias: id });

describe('PlatformSessionService', () => {
    /** El doble oficial del SDK (kit 1.85, `pruebas/yosiftware-doble/`): por defecto, sin sesión. */
    let doble: DobleYosiftware;
    let http: HttpTestingController;
    let router: { url: string; navigateByUrl: jasmine.Spy };
    let loader: jasmine.Spy;

    function create(): PlatformSessionService {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: CARGADOR_SDK, useValue: loader },
                { provide: Router, useValue: router }
            ]
        });
        http = TestBed.inject(HttpTestingController);
        return TestBed.inject(PlatformSessionService);
    }

    /** El SDK con el que arranca la prueba: con una cuenta (`{ cuenta }`), con su `fetch`… */
    function conDoble(opciones: OpcionesDelDoble): void {
        doble = crearDobleYosiftware(opciones);
    }

    function answerLocalUser(id: number, nombre = `usuario-${id}`) {
        const request = http.expectOne(`${environment.apiUrl}usuarios/me`);
        request.flush({ success: true, user: { Id: id, Nombre: nombre, Role: { Id: 1, Nombre: 'usuario' } } });
        return request;
    }

    beforeEach(() => {
        localStorage.clear();
        conDoble({});
        loader = jasmine.createSpy('cargarSdk').and.callFake(() => Promise.resolve(doble.yosiftware));
        router = { url: '/dashboard/books', navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true) };
    });

    afterEach(() => {
        http?.verify();
        localStorage.clear();
    });

    it('no carga el SDK hasta que la aplicación arranca la sesión', () => {
        create();
        expect(loader).not.toHaveBeenCalled();
    });

    it('sin sesión deja la web en la vista sin sesión, sin pedir nada a la API', fakeAsync(() => {
        const session = create();

        session.start();
        flushMicrotasks();

        expect(session.access).toBe('sin_sesion');
        expect(session.sessionInitializedSubject.value).toBeTrue();
        expect(session.userIsLogged).toBeFalse();
        expect(session.storageScope).toBeNull();
    }));

    it('al quedar lista, quien escucha access$ ya ve la persona dentro (las guardas lo leen en el acto)', fakeAsync(() => {
        const session = create();
        conDoble({ cuenta: cuenta('cuenta-a') });
        const seen: Array<[string, boolean]> = [];
        session.access$.subscribe(access => seen.push([access, session.userIsLogged]));

        session.start();
        flushMicrotasks();
        answerLocalUser(1);
        flushMicrotasks();

        expect(seen).toContain(['lista', true]);
        expect(seen).not.toContain(['lista', false]);
    }));

    it('con sesión pide su usuario local con la generación de esa cuenta y presenta la cuenta', fakeAsync(() => {
        const session = create();
        conDoble({ cuenta: cuenta('cuenta-a') });
        doble.control.ponerPerfil('cuenta-a', { nombre: 'Yosi Lectora' });

        session.start();
        flushMicrotasks();
        expect(session.access).toBe('cargando');
        const request = answerLocalUser(1, 'yosi');
        // Primero el nombre del usuario local; en cuanto llega el perfil de la plataforma, el suyo.
        expect(session.userName).toBe('yosi');
        flushMicrotasks();

        expect(request.request.context.get(GENERACION_PETICION)).toBe(session.generation);
        expect(session.userIsLogged).toBeTrue();
        expect(session.userId).toBe(1);
        expect(session.userName).toBe('Yosi Lectora');
        expect(session.access).toBe('lista');
        expect(session.storageScope).toBe(`${environment.environmentName}:cuenta-a`);
        expect(session.accountStorageKey('libros:x:')).toBe(`libros:x:${environment.environmentName}:cuenta-a`);
    }));

    it('de A a B sin cerrar y sin el aviso previo: vacía lo de A antes de presentar B y vuelve a la biblioteca', fakeAsync(() => {
        const session = create();
        const changes: IdentityChange[] = [];
        session.identityChange$.subscribe(change => changes.push(change));
        // Los avisos del doble van a otro sitio: la web solo ve el estado nuevo, y aun así no mezcla las cuentas.
        conDoble({ cuenta: cuenta('cuenta-a'), ventana: new EventTarget() });
        session.start();
        flushMicrotasks();
        answerLocalUser(1);
        const generationA = session.generation;
        router.url = '/book/73/chapter/11';

        doble.control.iniciarSesion(cuenta('cuenta-b'));

        expect(session.userIsLogged).toBeFalse();
        expect(session.userId).toBe(-1);
        expect(session.generation).toBeGreaterThan(generationA);
        expect(changes.at(-1)).toEqual({ generation: session.generation, accountId: 'cuenta-b' });
        expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard/books', { replaceUrl: true });
        answerLocalUser(2);
        expect(session.userId).toBe(2);
        expect(session.userIsLogged).toBeTrue();
    }));

    it('de A a B con el aviso previo del SDK (como el de verdad): también saca a la persona de lo privado de A', fakeAsync(() => {
        const session = create();
        conDoble({ cuenta: cuenta('cuenta-a') });
        session.start();
        flushMicrotasks();
        answerLocalUser(1);
        router.url = '/book/73/chapter/11';

        // El SDK avisa antes de confirmar (`yosiftware:identidad`); el aviso ya vacía la identidad, y el estado nuevo llega después.
        doble.control.cambioDesdeOtraPestana(cuenta('cuenta-b'));

        expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard/books', { replaceUrl: true });
        answerLocalUser(2);
        expect(session.userId).toBe(2);
    }));

    it('el aviso previo del SDK seguido de sin_sesion (otra pestaña sale) vuelve a la portada', fakeAsync(() => {
        const session = create();
        conDoble({ cuenta: cuenta('cuenta-a') });
        session.start();
        flushMicrotasks();
        answerLocalUser(1);
        router.url = '/dashboard/community/messages';

        doble.control.cambioDesdeOtraPestana(null);

        expect(router.navigateByUrl).toHaveBeenCalledWith('/home', { replaceUrl: true });
        expect(session.userIsLogged).toBeFalse();
    }));

    it('descarta el usuario local de A que llega después de cambiar a B', fakeAsync(() => {
        const session = create();
        conDoble({ cuenta: cuenta('cuenta-a') });
        session.start();
        flushMicrotasks();
        const lateA = http.expectOne(`${environment.apiUrl}usuarios/me`);

        doble.control.cambioDesdeOtraPestana(cuenta('cuenta-b'));
        const requestB = http.match(`${environment.apiUrl}usuarios/me`);
        lateA.flush({ success: true, user: { Id: 1, Nombre: 'de A', Role: null } });

        expect(session.userIsLogged).toBeFalse();
        expect(session.userId).toBe(-1);
        requestB[0].flush({ success: true, user: { Id: 2, Nombre: 'de B', Role: null } });
        expect(session.userId).toBe(2);
        expect(session.userName).toBe('de B');
    }));

    it('A → B → A: el aviso de identidad del SDK obliga a una generación nueva aunque vuelva la misma cuenta', fakeAsync(() => {
        const session = create();
        const changes: IdentityChange[] = [];
        session.identityChange$.subscribe(change => changes.push(change));
        conDoble({ cuenta: cuenta('cuenta-a') });
        session.start();
        flushMicrotasks();
        answerLocalUser(1);
        const before = session.generation;

        // Otra pestaña vuelve a A (de A a B y de vuelta): el SDK avisa aunque sea la misma cuenta.
        doble.control.cambioDesdeOtraPestana(cuenta('cuenta-a'));
        expect(session.userIsLogged).toBeFalse();
        expect(session.access).toBe('cargando');

        answerLocalUser(1);

        expect(session.generation).toBe(before + 2);
        expect(changes.map(change => change.accountId)).toEqual(['cuenta-a', null, 'cuenta-a']);
        expect(session.userIsLogged).toBeTrue();
    }));

    it('al pasar por sin_sesion (la sesión caduca o la revocan, sin aviso) olvida a la persona y vuelve a la portada', fakeAsync(() => {
        const session = create();
        const changes: IdentityChange[] = [];
        session.identityChange$.subscribe(change => changes.push(change));
        conDoble({ cuenta: cuenta('cuenta-a') });
        session.start();
        flushMicrotasks();
        answerLocalUser(1);

        doble.control.sesionCaducada();

        expect(session.userIsLogged).toBeFalse();
        expect(session.userId).toBe(-1);
        expect(session.access).toBe('sin_sesion');
        expect(changes.at(-1)?.accountId).toBeNull();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/home', { replaceUrl: true });
    }));

    it('conserva la cuenta presentada mientras la plataforma no responde', fakeAsync(() => {
        const session = create();
        conDoble({ cuenta: cuenta('cuenta-a') });
        session.start();
        flushMicrotasks();
        answerLocalUser(1);

        doble.control.noDisponible();

        expect(session.userIsLogged).toBeTrue();
        expect(session.cuenta?.id).toBe('cuenta-a');
    }));

    it('sin el SDK (la plataforma no responde) lo dice y no deja la carga colgada', fakeAsync(() => {
        loader.and.callFake(() => Promise.reject(new Error('El SDK de la plataforma no responde.')));
        const session = create();

        session.start();
        flushMicrotasks();

        expect(session.access).toBe('no_disponible');
        expect(session.sessionInitializedSubject.value).toBeTrue();
        session.ngOnDestroy();
    }));

    it('una cuenta borrada en la plataforma vuelve a la vista sin sesión', fakeAsync(() => {
        const session = create();
        conDoble({ cuenta: cuenta('cuenta-a') });
        session.start();
        flushMicrotasks();

        http.expectOne(`${environment.apiUrl}usuarios/me`).flush({ code: 'account_deleted' }, { status: 403, statusText: 'Forbidden' });

        expect(session.access).toBe('cuenta_borrada');
        expect(session.userIsLogged).toBeFalse();
        expect(session.sessionInitializedSubject.value).toBeTrue();
    }));

    it('pide los tokens al SDK cada vez y no guarda ninguno en el navegador', fakeAsync(async () => {
        const session = create();
        conDoble({ cuenta: cuenta('cuenta-a') });
        doble.control.ponerTokens('cuenta-a', { api: 'token-1' });
        session.start();
        flushMicrotasks();
        answerLocalUser(1);

        let token: string | null = null;
        void session.token().then(value => token = value);
        flushMicrotasks();

        expect(token as string | null).toBe('token-1');
        expect(JSON.stringify({ ...localStorage })).not.toContain('token-1');
        expect(JSON.stringify({ ...sessionStorage })).not.toContain('token-1');
    }));

    it('un token pedido mientras cambia la cuenta no se usa', fakeAsync(() => {
        const session = create();
        conDoble({ cuenta: cuenta('cuenta-a') });
        // La cuenta cambia en otra pestaña mientras el SDK busca el token: el doble lo rechaza con `CambioDeIdentidad`.
        const token = doble.yosiftware.token;
        spyOn(doble.yosiftware, 'token').and.callFake(() => {
            const pedido = token();
            doble.control.cambioDesdeOtraPestana(cuenta('cuenta-b'));
            return pedido;
        });

        let result: string | null | undefined;
        void session.token().then(value => result = value);
        flushMicrotasks();

        expect(result).toBeNull();
    }));

    it('tras un 401 da un token nuevo; si el SDK aún tiene el mismo, le obliga a renovarlo', fakeAsync(() => {
        const session = create();
        // La plataforma renueva el token de la cuenta cuando la API responde 401 a `yosiftware.fetch()`.
        const fetch = jasmine.createSpy('fetch').and.callFake(async (_entrada: string, opciones?: RequestInit) => {
            if (new Headers(opciones?.headers).get('Authorization') !== 'Bearer viejo') return new Response(null, { status: 200 });
            doble.control.ponerTokens('cuenta-a', { api: 'nuevo' });
            return new Response(null, { status: 401 });
        });
        conDoble({ cuenta: cuenta('cuenta-a'), fetch });
        doble.control.ponerTokens('cuenta-a', { api: 'viejo' });

        let renewed: string | null = null;
        void session.renewToken('viejo').then(value => renewed = value);
        flushMicrotasks();

        expect(fetch).toHaveBeenCalledWith(`${environment.apiUrl}usuarios/me`, jasmine.objectContaining({ cache: 'no-store' }));
        expect(renewed as string | null).toBe('nuevo');
    }));

    it('con una versión nueva retira lo de la sesión propia y conserva las preferencias y la marca de Yosiftadísticas', () => {
        localStorage.setItem('sessionVersion', '2026-10-01-ediciones-v2');
        localStorage.setItem('jwt', 'x');
        localStorage.setItem('refresh', 'x');
        localStorage.setItem('nativeRefreshSession', '1');
        localStorage.setItem('push-device:7', '17');
        localStorage.setItem('libros:web-theme:7', 'dark');
        localStorage.setItem('narrative-editor-fonts:v1:7', '{}');
        localStorage.setItem('book-front:floating-window:v1:7:chat', '{}');
        localStorage.setItem('yosiftadisticas:excluir', '1');
        localStorage.setItem('libros:web-theme:last', 'dark');

        create().start();

        expect(Object.keys(localStorage).sort()).toEqual(['libros:web-theme:last', 'sessionVersion', 'yosiftadisticas:excluir']);
        expect(localStorage.getItem('sessionVersion')).toBe(environment.sessionVersion);
    });

    it('entra, sale y cambia de cuenta con el SDK', fakeAsync(async () => {
        const session = create();

        void session.entrar('registro');
        void session.salir();
        void session.cambiarCuenta();
        flushMicrotasks();

        expect(doble.control.llamadasA('entrar')).toEqual([[{ vista: 'registro' }]]);
        expect(doble.control.llamadasA('salir')).toEqual([[]]);
        expect(doble.control.llamadasA('cambiarCuenta')).toEqual([[]]);
    }));
});
