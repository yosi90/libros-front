import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ErrorInterceptorService } from './error-interceptor.service';

describe('ErrorInterceptorService', () => {
    const accessError = new HttpErrorResponse({
        status: 403,
        error: { code: 'usage_policy_acceptance_required' }
    });

    function createInterceptor(logged = true) {
        const moderationAccess = jasmine.createSpyObj('ModerationAccessService', ['refresh']);
        moderationAccess.refresh.and.returnValue(of(null));
        const session = {
            userIsLogged: logged,
            getToken: () => logged ? 'token' : null,
            logout: jasmine.createSpy('logout')
        };
        const injector = { get: () => moderationAccess };
        const interceptor = new ErrorInterceptorService({} as any, session as any, injector as any);
        return { interceptor, moderationAccess, session };
    }

    it('does not refresh access status when that request itself receives a 403', fakeAsync(() => {
        const { interceptor, moderationAccess } = createInterceptor();
        const request = new HttpRequest('GET', '/moderacion/mi-estado-acceso');
        const next = { handle: () => throwError(() => accessError) };

        interceptor.intercept(request, next).subscribe({ error: () => undefined });
        flushMicrotasks();

        expect(moderationAccess.refresh).not.toHaveBeenCalled();
    }));

    it('refreshes access status once after a related 403 from another endpoint', fakeAsync(() => {
        const { interceptor, moderationAccess } = createInterceptor();
        const request = new HttpRequest('GET', '/coleccion/universos');
        const next = { handle: () => throwError(() => accessError) };

        interceptor.intercept(request, next).subscribe({ error: () => undefined });
        flushMicrotasks();

        expect(moderationAccess.refresh).toHaveBeenCalledTimes(1);
    }));

    it('does not refresh access status after the session has been closed', fakeAsync(() => {
        const { interceptor, moderationAccess } = createInterceptor(false);
        const request = new HttpRequest('GET', '/coleccion/universos');
        const next = { handle: () => throwError(() => accessError) };

        interceptor.intercept(request, next).subscribe({ error: () => undefined });
        flushMicrotasks();

        expect(moderationAccess.refresh).not.toHaveBeenCalled();
    }));

    it('closes a persisted session when the API rejects its token as invalid', () => {
        const { interceptor, session } = createInterceptor();
        const request = new HttpRequest('GET', '/coleccion/universos');
        const invalidToken = new HttpErrorResponse({ status: 422, error: { code: 'invalid_token' } });
        const next = { handle: () => throwError(() => invalidToken) };

        interceptor.intercept(request, next).subscribe({ error: () => undefined });

        expect(session.logout).toHaveBeenCalledOnceWith();
    });

    it('closes a persisted session when its user no longer exists in the API', () => {
        const { interceptor, session } = createInterceptor();
        const request = new HttpRequest('GET', '/coleccion/universos');
        const missingUser = new HttpErrorResponse({ status: 403, error: { code: 'user_not_found' } });
        const next = { handle: () => throwError(() => missingUser) };

        interceptor.intercept(request, next).subscribe({ error: () => undefined });

        expect(session.logout).toHaveBeenCalledOnceWith();
    });
});
