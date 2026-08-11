import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { NEVER } from 'rxjs';
import { environment } from '../../../environment/environment';
import { SessionService } from './session.service';

describe('SessionService logout', () => {
    beforeEach(() => localStorage.clear());

    it('limpia inmediatamente toda la sesion aunque la revocacion agote los dos segundos', fakeAsync(() => {
        const universes = jasmine.createSpyObj('UniverseStoreService', ['clear']);
        const authors = jasmine.createSpyObj('AuthorStoreService', ['clear']);
        const books = jasmine.createSpyObj('BookStoreService', ['clear']);
        const router = jasmine.createSpyObj('Router', ['navigateByUrl']);
        router.navigateByUrl.and.resolveTo(true);
        const firebaseSession = jasmine.createSpyObj('FirebaseSessionService', ['clear']);
        const realtime = jasmine.createSpyObj('RealtimeSocketService', ['closeAll']);
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

        const service = new SessionService(
            {} as never, universes, authors, books, router, firebaseSession, realtime, presence,
            notifications, moderation, push, capabilities, loader, sessionNotifications, decisions
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
