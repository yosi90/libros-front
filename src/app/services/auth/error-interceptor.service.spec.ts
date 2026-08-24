import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ErrorInterceptorService } from './error-interceptor.service';
import { environment } from '../../../environment/environment';

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
            logout: jasmine.createSpy('logout'),
            requestNewToken: jasmine.createSpy('requestNewToken')
        };
        const injector = { get: (_token: unknown, fallback?: unknown) => fallback !== undefined ? null : moderationAccess };
        const interceptor = new ErrorInterceptorService(session as any, injector as any);
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

    it('does not close the administrator session when a different user is missing', () => {
        const { interceptor, session } = createInterceptor();
        const request = new HttpRequest('GET', `${environment.apiUrl}administracion/usuarios/404`);
        const missingTarget = new HttpErrorResponse({ status: 404, error: { code: 'user_not_found' } });

        interceptor.intercept(request, { handle: () => throwError(() => missingTarget) }).subscribe({ error: () => undefined });

        expect(session.logout).not.toHaveBeenCalled();
    });

    it('keeps the interface recoverable when refresh is temporarily unavailable', () => {
        const { interceptor, session } = createInterceptor();
        const unauthorized = new HttpErrorResponse({ status: 401 });
        const unavailable = new HttpErrorResponse({ status: 503, error: { code: 'session_refresh_unavailable' } });
        session.requestNewToken.and.returnValue(throwError(() => unavailable));
        const request = new HttpRequest('GET', `${environment.apiUrl}coleccion/universos`);

        interceptor.intercept(request, { handle: () => throwError(() => unauthorized) }).subscribe({ error: () => undefined });

        expect(session.logout).not.toHaveBeenCalled();
    });

    it('closes the device session when refresh replay is detected', () => {
        const { interceptor, session } = createInterceptor();
        const replay = new HttpErrorResponse({ status: 401, error: { code: 'refresh_replay_detected' } });

        interceptor.intercept(new HttpRequest('POST', `${environment.apiUrl}auth/session/refresh`, {}), { handle: () => throwError(() => replay) }).subscribe({ error: () => undefined });

        expect(session.logout).toHaveBeenCalledOnceWith();
    });
});
