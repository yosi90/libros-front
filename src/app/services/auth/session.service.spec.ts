import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { NEVER, Subject } from 'rxjs';
import { environment } from '../../../environment/environment';
import { SessionService, shouldRestoreSession, shouldUseCrossTabRefreshLock } from './session.service';

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
        service.userId = 42;
        service.userIsLogged$.next(true);

        service.logout();

        expect(push.logout).toHaveBeenCalledOnceWith(42);
        expect(localStorage.getItem('jwt')).toBeNull();
        expect(localStorage.getItem('refresh')).toBeNull();
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
