import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { BehaviorSubject, NEVER, Subject, of, throwError } from 'rxjs';
import { environment } from '../../../environment/environment';
import { AUDIENCE_EXCLUSION_KEY, SessionService, markAudienceExclusion, shouldRestoreSession, shouldUseCrossTabRefreshLock } from './session.service';

describe('coordinación de refresh', () => {
    it('reserva Web Locks para navegadores con pestañas y nunca para Capacitor', () => {
        expect(shouldUseCrossTabRefreshLock(false, true)).toBeTrue();
        expect(shouldUseCrossTabRefreshLock(true, true)).toBeFalse();
        expect(shouldUseCrossTabRefreshLock(false, false)).toBeFalse();
    });

    it('no consulta una cookie opaca en Android cuando nunca hubo sesión local', () => {
        expect(shouldRestoreSession(true, false)).toBeFalse();
        expect(shouldRestoreSession(true, true)).toBeTrue();
        expect(shouldRestoreSession(false, false)).toBeTrue();
    });

});

describe('exclusión de la medición de audiencia', () => {
    beforeEach(() => localStorage.removeItem(AUDIENCE_EXCLUSION_KEY));
    afterEach(() => localStorage.removeItem(AUDIENCE_EXCLUSION_KEY));

    it('marca el dispositivo solo cuando la cuenta es del propietario', () => {
        markAudienceExclusion({});
        markAudienceExclusion({ ExcluirMedicionAudiencia: false });
        expect(localStorage.getItem(AUDIENCE_EXCLUSION_KEY)).toBeNull();

        markAudienceExclusion({ ExcluirMedicionAudiencia: true });
        expect(localStorage.getItem(AUDIENCE_EXCLUSION_KEY)).toBe('1');
    });

    it('conserva la marca aunque otra cuenta del dispositivo llegue con false', () => {
        localStorage.setItem(AUDIENCE_EXCLUSION_KEY, '1');
        markAudienceExclusion({ ExcluirMedicionAudiencia: false });
        expect(localStorage.getItem(AUDIENCE_EXCLUSION_KEY)).toBe('1');
    });
});

describe('SessionService logout', () => {
    beforeEach(() => localStorage.clear());

    it('limpia inmediatamente toda la sesion aunque la revocacion agote los dos segundos', fakeAsync(() => {
        const universes = jasmine.createSpyObj('UniverseStoreService', ['clear']);
        const authors = jasmine.createSpyObj('AuthorStoreService', ['clear']);
        const books = jasmine.createSpyObj('BookStoreService', ['clear']);
        const router = jasmine.createSpyObj('Router', ['navigateByUrl']);
        router.navigateByUrl.and.resolveTo(true);
        const firebaseSession = jasmine.createSpyObj('FirebaseSessionService', ['clear']);
        const realtime = jasmine.createSpyObj('RealtimeSocketService', ['closeAll'], { events$: new Subject() });
        const presence = jasmine.createSpyObj('FirebasePresenceService', ['clear']);
        presence.clear.and.resolveTo();
        const notifications = jasmine.createSpyObj('NotificationStoreService', ['clear']);
        const moderation = jasmine.createSpyObj('ModerationAccessService', ['clear']);
        const push = jasmine.createSpyObj('PushNotificationService', ['logout']);
        push.logout.and.returnValue(NEVER);
        const capabilities = jasmine.createSpyObj('CommunityCapabilitiesService', ['clear']);
        const loader = jasmine.createSpyObj('LoaderEmmitterService', ['deactivateLoader']);
        const sessionNotifications = jasmine.createSpyObj('SessionNotificationStoreService', ['resetSession']);
        const decisions = jasmine.createSpyObj('DecisionNoticeService', ['reset']);
        const authApi = jasmine.createSpyObj('AuthApiService', ['logout']);
        const providerAuth = jasmine.createSpyObj('FirebaseProviderAuthService', ['clear']);
        providerAuth.clear.and.resolveTo();

        const service = new SessionService(
            authApi, providerAuth, universes, authors, books, router, firebaseSession, realtime, presence,
            notifications, moderation, push, capabilities, loader, sessionNotifications, decisions, false
        );
        localStorage.setItem('sessionVersion', environment.sessionVersion);
        localStorage.setItem('jwt', 'access');
        localStorage.setItem('refresh', 'refresh');
        localStorage.setItem(AUDIENCE_EXCLUSION_KEY, '1');
        service.userId = 42;
        service.userIsLogged$.next(true);

        service.logout();

        expect(push.logout).toHaveBeenCalledOnceWith(42);
        expect(localStorage.getItem('jwt')).toBeNull();
        expect(localStorage.getItem('refresh')).toBeNull();
        expect(localStorage.getItem(AUDIENCE_EXCLUSION_KEY)).toBe('1');
        expect(service.userId).toBe(-1);
        expect(service.userIsLogged).toBeFalse();
        expect(realtime.closeAll).toHaveBeenCalled();
        expect(notifications.clear).toHaveBeenCalled();
        expect(universes.clear).toHaveBeenCalled();
        expect(authors.clear).toHaveBeenCalled();
        expect(books.clear).toHaveBeenCalled();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/home', { replaceUrl: true });

        tick(2001);
        flushMicrotasks();
        expect(firebaseSession.clear).toHaveBeenCalled();
    }));
});

describe('SessionService renovación proactiva', () => {
    afterEach(() => localStorage.clear());
    function createService(): SessionService {
        const spy = (name: string) => jasmine.createSpyObj(name, ['clear']);
        const realtime = jasmine.createSpyObj('RealtimeSocketService', ['closeAll'], { events$: new Subject() });
        const service = new SessionService(
            spy('AuthApiService'), spy('FirebaseProviderAuthService'), spy('UniverseStoreService'), spy('AuthorStoreService'),
            spy('BookStoreService'), spy('Router'), spy('FirebaseSessionService'), realtime, spy('FirebasePresenceService'),
            spy('NotificationStoreService'), spy('ModerationAccessService'), spy('PushNotificationService'),
            spy('CommunityCapabilitiesService'), spy('LoaderEmmitterService'), spy('SessionNotificationStoreService'),
            spy('DecisionNoticeService'), false
        );
        // Sus dobles no cubren el cierre de sesión: no deben oír los logout que emiten otras suites.
        (service as any).sessionChannel?.close();
        return service;
    }

    it('revokes the old cookie without restoring an access token after a contract change', async () => {
        const service = createService() as any;
        service.authApi = jasmine.createSpyObj('AuthApiService', ['restoreCsrf', 'logout', 'clearNativeSessionCookie']);
        service.authApi.restoreCsrf.and.returnValue(of({ CsrfToken: 'csrf' }));
        service.authApi.logout.and.returnValue(of({}));
        service.authApi.clearNativeSessionCookie.and.resolveTo();
        service.router = jasmine.createSpyObj('Router', ['navigateByUrl']);
        const close = spyOn(service, 'closeLocalSession');
        const renew = spyOn(service, 'requestNewToken');
        localStorage.setItem('sessionVersion', 'old-contract');

        await service.initialize();

        expect(close).toHaveBeenCalledWith(false);
        expect(service.authApi.logout).toHaveBeenCalledOnceWith('csrf');
        expect(service.authApi.clearNativeSessionCookie).toHaveBeenCalled();
        expect(renew).not.toHaveBeenCalled();
        expect(service.sessionInitializedSubject.value).toBeTrue();
        expect(service.router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
        expect(localStorage.getItem('sessionVersion')).toBe('old-contract');
    });

    it('keeps the version barrier on the next startup if cookie revocation fails', async () => {
        const service = createService() as any;
        service.authApi = jasmine.createSpyObj('AuthApiService', ['restoreCsrf', 'clearNativeSessionCookie']);
        service.authApi.restoreCsrf.and.returnValue(throwError(() => new Error('offline')));
        service.authApi.clearNativeSessionCookie.and.resolveTo();
        service.router = jasmine.createSpyObj('Router', ['navigateByUrl']);
        spyOn(service, 'closeLocalSession');
        const renew = spyOn(service, 'requestNewToken');
        localStorage.setItem('sessionVersion', 'old-contract');

        await service.initialize();
        await service.initialize();

        expect(service.authApi.restoreCsrf).toHaveBeenCalledTimes(2);
        expect(renew).not.toHaveBeenCalled();
        expect(localStorage.getItem('sessionVersion')).toBe('old-contract');
    });

    it('restores an existing session with the current contract version', async () => {
        const service = createService() as any;
        localStorage.setItem('sessionVersion', environment.sessionVersion);
        const renew = spyOn(service, 'requestNewToken').and.returnValue(of(void 0));

        await service.initialize();

        expect(renew).toHaveBeenCalledTimes(1);
        expect(service.sessionInitializedSubject.value).toBeTrue();
    });

    it('releases the version barrier only after a successful new session', () => {
        const service = createService() as any;
        localStorage.setItem('sessionVersion', 'old-contract');
        spyOn(service, 'scheduleProactiveRefresh');
        spyOn(service, 'applyProfile');
        spyOn(service, 'startAuthenticatedServices');

        service.applyAuthenticatedSession({ AccessToken: 'test-access', CsrfToken: 'test-csrf', ExpiresIn: 900, Usuario: {} });

        expect(localStorage.getItem('sessionVersion')).toBe(environment.sessionVersion);
        expect(service.userIsLogged).toBeTrue();
    });

    it('marca el dispositivo del propietario al aplicar su perfil', () => {
        const service = createService() as any;

        service.applyProfile({ Id: 1, Nombre: 'Propietario', Email: '', Imagen: '', Role: { Id: 1, Nombre: 'usuario' }, ExcluirMedicionAudiencia: true });

        expect(localStorage.getItem(AUDIENCE_EXCLUSION_KEY)).toBe('1');
    });

    it('renueva el token un minuto antes de que caduque, sin esperar al 401', fakeAsync(() => {
        const service = createService() as any;
        const renew = spyOn(service, 'requestNewToken').and.returnValue(NEVER);
        service.accessToken = 'access';

        service.scheduleProactiveRefresh(900);

        tick(840_000 - 1);
        expect(renew).not.toHaveBeenCalled();
        tick(1);
        expect(renew).toHaveBeenCalledTimes(1);
    }));

    it('no renueva si la sesión ya se cerró', fakeAsync(() => {
        const service = createService() as any;
        const renew = spyOn(service, 'requestNewToken').and.returnValue(NEVER);
        service.accessToken = 'access';

        service.scheduleProactiveRefresh(900);
        service.clearSessionState();

        tick(900_000);
        expect(renew).not.toHaveBeenCalled();
    }));
});

describe('SessionService arranque con normas de uso pendientes', () => {
    function createService() {
        const spy = (name: string, methods: string[] = ['clear']) => jasmine.createSpyObj(name, methods);
        const realtime = jasmine.createSpyObj('RealtimeSocketService', ['closeAll'], { events$: new Subject() });
        const accessState = new BehaviorSubject<any>(null);
        const moderation = jasmine.createSpyObj('ModerationAccessService', ['refresh', 'clear'], { state$: accessState });
        const firebase = spy('FirebaseSessionService', ['startForUser', 'clear']);
        firebase.startForUser.and.returnValue(of(void 0));
        const presence = spy('FirebasePresenceService', ['start', 'clear']);
        presence.start.and.resolveTo();
        const push = spy('PushNotificationService', ['restore', 'logout']);
        push.restore.and.returnValue(of(void 0));
        const capabilities = spy('CommunityCapabilitiesService', ['initialize', 'clear']);
        capabilities.initialize.and.returnValue(of({}));
        const notifications = spy('NotificationStoreService', ['initialize', 'clear']);
        const service = new SessionService(
            spy('AuthApiService'), spy('FirebaseProviderAuthService'), spy('UniverseStoreService'), spy('AuthorStoreService'),
            spy('BookStoreService'), spy('Router'), firebase, realtime, presence, notifications, moderation, push,
            capabilities, spy('LoaderEmmitterService'), spy('SessionNotificationStoreService'), spy('DecisionNoticeService'), false
        ) as any;
        (service as any).sessionChannel?.close();
        service.userId = 37;
        service.userIsLogged$.next(true);
        service.accessToken = 'access';
        return { service, moderation, accessState, firebase, capabilities, notifications, push };
    }
    const pending = { Restricciones: [], Politicas: [{ Tipo: 'uso', Pendiente: true }] };
    const accepted = { Restricciones: [], Politicas: [{ Tipo: 'uso', Pendiente: false }] };

    it('consulta el acceso antes que nada y aplaza Firebase y push hasta aceptar', fakeAsync(() => {
        const { service, moderation, firebase, capabilities, notifications } = createService();
        moderation.refresh.and.returnValue(of(pending));

        service.startAuthenticatedServices();
        flushMicrotasks();

        expect(moderation.refresh).toHaveBeenCalledTimes(1);
        expect(capabilities.initialize).toHaveBeenCalledOnceWith(37);
        expect(notifications.initialize).toHaveBeenCalled();
        expect(firebase.startForUser).not.toHaveBeenCalled();
    }));

    it('relanza lo aplazado una sola vez al aceptar las normas', fakeAsync(() => {
        const { service, moderation, accessState, firebase, push } = createService();
        moderation.refresh.and.returnValue(of(pending));
        service.startAuthenticatedServices();
        flushMicrotasks();

        accessState.next(pending);
        expect(firebase.startForUser).not.toHaveBeenCalled();
        accessState.next(accepted);
        accessState.next(accepted);
        flushMicrotasks();

        expect(firebase.startForUser).toHaveBeenCalledOnceWith(37);
        expect(push.restore).toHaveBeenCalledOnceWith(37);
    }));

    it('sin normas pendientes arranca todo como siempre', fakeAsync(() => {
        const { service, moderation, firebase } = createService();
        moderation.refresh.and.returnValue(of(accepted));
        service.startAuthenticatedServices();
        flushMicrotasks();
        expect(firebase.startForUser).toHaveBeenCalledOnceWith(37);
    }));

    it('si mi-estado-acceso falla conserva el arranque normal', fakeAsync(() => {
        const { service, moderation, firebase } = createService();
        moderation.refresh.and.returnValue(of(null));
        service.startAuthenticatedServices();
        flushMicrotasks();
        expect(firebase.startForUser).toHaveBeenCalledOnceWith(37);
    }));
});
