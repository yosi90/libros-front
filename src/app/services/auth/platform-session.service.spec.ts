import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environment/environment';
import { GENERACION_PETICION, IdentityChange, PlatformSessionService } from './platform-session.service';
import { CARGADOR_SDK, CuentaPlataforma, EstadoPlataforma, YosiftwareSdk } from './yosiftware-sdk';

/** Doble del SDK de la plataforma: el estado lo decide la prueba. */
class SdkDouble implements YosiftwareSdk {
    estado: EstadoPlataforma = { tipo: 'comprobando' };
    tokens: Array<string | null> = ['token-1'];
    private oyentes: Array<(estado: EstadoPlataforma) => void> = [];
    readonly salir = jasmine.createSpy('salir').and.resolveTo();
    readonly entrar = jasmine.createSpy('entrar').and.resolveTo(true);
    readonly cambiarCuenta = jasmine.createSpy('cambiarCuenta').and.resolveTo(true);
    readonly editarPerfil = jasmine.createSpy('editarPerfil').and.resolveTo(false);
    readonly perfil = jasmine.createSpy('perfil').and.resolveTo(null);
    readonly fetch = jasmine.createSpy('fetch').and.callFake(async () => { this.tokens.shift(); return new Response(null, { status: 200 }); });
    readonly token = jasmine.createSpy('token').and.callFake(async () => this.tokens[0] ?? null);

    listo(): Promise<EstadoPlataforma> { return Promise.resolve(this.estado); }
    alCambiar(oyente: (estado: EstadoPlataforma) => void): () => void {
        this.oyentes.push(oyente);
        oyente(this.estado);
        return () => this.oyentes = this.oyentes.filter(item => item !== oyente);
    }
    emitir(estado: EstadoPlataforma): void {
        this.estado = estado;
        this.oyentes.forEach(oyente => oyente(estado));
    }
}

const cuenta = (id: string, alias = id): CuentaPlataforma => ({ id, alias, correo: `${alias}@example.test` });
const conSesion = (id: string): EstadoPlataforma => ({ tipo: 'con_sesion', cuenta: cuenta(id) });

describe('PlatformSessionService', () => {
    let sdk: SdkDouble;
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

    function answerLocalUser(id: number, nombre = `usuario-${id}`) {
        const request = http.expectOne(`${environment.apiUrl}usuarios/me`);
        request.flush({ success: true, user: { Id: id, Nombre: nombre, Role: { Id: 1, Nombre: 'usuario' } } });
        return request;
    }

    beforeEach(() => {
        localStorage.clear();
        sdk = new SdkDouble();
        loader = jasmine.createSpy('cargarSdk').and.callFake(() => Promise.resolve(sdk));
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
        sdk.estado = { tipo: 'sin_sesion' };

        session.start();
        flushMicrotasks();

        expect(session.access).toBe('sin_sesion');
        expect(session.sessionInitializedSubject.value).toBeTrue();
        expect(session.userIsLogged).toBeFalse();
        expect(session.storageScope).toBeNull();
    }));

    it('con sesión pide su usuario local con la generación de esa cuenta y presenta la cuenta', fakeAsync(() => {
        const session = create();
        sdk.estado = conSesion('cuenta-a');

        session.start();
        flushMicrotasks();
        expect(session.access).toBe('cargando');
        const request = answerLocalUser(1, 'yosi');
        flushMicrotasks();

        expect(request.request.context.get(GENERACION_PETICION)).toBe(session.generation);
        expect(session.userIsLogged).toBeTrue();
        expect(session.userId).toBe(1);
        expect(session.userName).toBe('yosi');
        expect(session.access).toBe('lista');
        expect(session.storageScope).toBe(`${environment.environmentName}:cuenta-a`);
        expect(session.accountStorageKey('libros:x:')).toBe(`libros:x:${environment.environmentName}:cuenta-a`);
    }));

    it('de A a B sin cerrar: vacía lo de A antes de presentar B y vuelve a la biblioteca', fakeAsync(() => {
        const session = create();
        const changes: IdentityChange[] = [];
        session.identityChange$.subscribe(change => changes.push(change));
        sdk.estado = conSesion('cuenta-a');
        session.start();
        flushMicrotasks();
        answerLocalUser(1);
        const generationA = session.generation;
        router.url = '/book/73/chapter/11';

        sdk.emitir(conSesion('cuenta-b'));

        expect(session.userIsLogged).toBeFalse();
        expect(session.userId).toBe(-1);
        expect(session.generation).toBeGreaterThan(generationA);
        expect(changes.at(-1)).toEqual({ generation: session.generation, accountId: 'cuenta-b' });
        expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard/books', { replaceUrl: true });
        answerLocalUser(2);
        expect(session.userId).toBe(2);
        expect(session.userIsLogged).toBeTrue();
    }));

    it('descarta el usuario local de A que llega después de cambiar a B', fakeAsync(() => {
        const session = create();
        sdk.estado = conSesion('cuenta-a');
        session.start();
        flushMicrotasks();
        const lateA = http.expectOne(`${environment.apiUrl}usuarios/me`);

        sdk.emitir(conSesion('cuenta-b'));
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
        sdk.estado = conSesion('cuenta-a');
        session.start();
        flushMicrotasks();
        answerLocalUser(1);
        const before = session.generation;

        window.dispatchEvent(new CustomEvent('yosiftware:identidad'));
        expect(session.userIsLogged).toBeFalse();
        expect(session.access).toBe('cargando');

        sdk.emitir(conSesion('cuenta-a'));
        answerLocalUser(1);

        expect(session.generation).toBe(before + 2);
        expect(changes.map(change => change.accountId)).toEqual(['cuenta-a', null, 'cuenta-a']);
        expect(session.userIsLogged).toBeTrue();
    }));

    it('al pasar por sin_sesion olvida a la persona y vuelve a la portada', fakeAsync(() => {
        const session = create();
        const changes: IdentityChange[] = [];
        session.identityChange$.subscribe(change => changes.push(change));
        sdk.estado = conSesion('cuenta-a');
        session.start();
        flushMicrotasks();
        answerLocalUser(1);

        sdk.emitir({ tipo: 'sin_sesion' });

        expect(session.userIsLogged).toBeFalse();
        expect(session.userId).toBe(-1);
        expect(session.access).toBe('sin_sesion');
        expect(changes.at(-1)?.accountId).toBeNull();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/home', { replaceUrl: true });
    }));

    it('conserva la cuenta presentada mientras la plataforma no responde', fakeAsync(() => {
        const session = create();
        sdk.estado = conSesion('cuenta-a');
        session.start();
        flushMicrotasks();
        answerLocalUser(1);

        sdk.emitir({ tipo: 'no_disponible' });

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
        sdk.estado = conSesion('cuenta-a');
        session.start();
        flushMicrotasks();

        http.expectOne(`${environment.apiUrl}usuarios/me`).flush({ code: 'account_deleted' }, { status: 403, statusText: 'Forbidden' });

        expect(session.access).toBe('cuenta_borrada');
        expect(session.userIsLogged).toBeFalse();
        expect(session.sessionInitializedSubject.value).toBeTrue();
    }));

    it('pide los tokens al SDK cada vez y no guarda ninguno en el navegador', fakeAsync(async () => {
        const session = create();
        sdk.estado = conSesion('cuenta-a');
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
        const cambio = new Error('La cuenta ha cambiado.');
        cambio.name = 'CambioDeIdentidad';
        sdk.token.and.rejectWith(cambio);

        let token: string | null | undefined;
        void session.token().then(value => token = value);
        flushMicrotasks();

        expect(token).toBeNull();
    }));

    it('tras un 401 da un token nuevo; si el SDK aún tiene el mismo, le obliga a renovarlo', fakeAsync(() => {
        const session = create();
        sdk.tokens = ['viejo', 'nuevo'];

        let renewed: string | null = null;
        void session.renewToken('viejo').then(value => renewed = value);
        flushMicrotasks();

        expect(sdk.fetch).toHaveBeenCalledOnceWith(`${environment.apiUrl}usuarios/me`, { cache: 'no-store' });
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
        sdk.estado = { tipo: 'sin_sesion' };

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

        expect(sdk.entrar).toHaveBeenCalledOnceWith({ vista: 'registro' });
        expect(sdk.salir).toHaveBeenCalled();
        expect(sdk.cambiarCuenta).toHaveBeenCalled();
    }));
});
