import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environment/environment';
import { getApiErrorCode } from '../../shared/api-error-message';
import { PolicyPromptService } from '../navigation/policy-prompt.service';
import { ModerationAccessService } from '../stores/moderation-access.service';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class ErrorInterceptorService implements HttpInterceptor {
    constructor(
        private session: SessionService,
        private injector: Injector
    ) { }

    intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        return next.handle(req).pipe(catchError((error: HttpErrorResponse) => {
            if (this.isImageRequest(req))
                return throwError(() => error);

            const errorCode = getApiErrorCode(error);
            if (this.session.getToken() && errorCode && this.isTerminalSessionError(error, errorCode)) {
                this.session.logout(true, `terminal:${errorCode}`);
                return throwError(() => error);
            }

            if (error.status === 403 && errorCode) {
                this.refreshModerationAccess(req, errorCode);
                return throwError(() => error);
            }

            if (error.status === 401 && this.shouldRefresh(req))
                return this.retryAfterRefresh(req, next);

            return throwError(() => error);
        }));
    }

    private retryAfterRefresh(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        return this.session.requestNewToken().pipe(
            catchError((refreshError: HttpErrorResponse) => {
                if (refreshError.status !== 0 && refreshError.status !== 503)
                    this.session.logout(true, `refresh:${getApiErrorCode(refreshError) ?? refreshError.status}`);
                return throwError(() => refreshError);
            }),
            switchMap(() => {
                const token = this.session.getToken();
                if (!token)
                    return throwError(() => new Error('No se pudo restaurar la sesión.'));
                return next.handle(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
            })
        );
    }

    private shouldRefresh(req: HttpRequest<unknown>): boolean {
        return !!this.session.getToken()
            && req.url.startsWith(environment.apiUrl)
            && !this.isSessionRequest(req);
    }

    private isTerminalSessionError(error: HttpErrorResponse, errorCode: string): boolean {
        if (errorCode === 'invalid_token')
            return error.status === 422;
        if (errorCode === 'user_not_found')
            return error.status === 403;

        return error.status === 401 && new Set([
            'session_refresh_invalid',
            'session_revoked',
            'refresh_replay_detected',
            'firebase_identity_revoked'
        ]).has(errorCode);
    }

    private isSessionRequest(req: HttpRequest<unknown>): boolean {
        return req.url.startsWith(`${environment.apiUrl}auth/session`);
    }

    private isImageRequest(req: HttpRequest<unknown>): boolean {
        return /\.(?:jpe?g|png|gif|webp|svg)(?:\?|$)/i.test(req.url);
    }

    private refreshModerationAccess(req: HttpRequest<unknown>, errorCode: string): void {
        const accessErrors = new Set([
            'account_sanctioned',
            'capability_sanctioned',
            'usage_policy_acceptance_required',
            'creation_policy_acceptance_required'
        ]);
        if (!accessErrors.has(errorCode) || req.url.includes('/moderacion/mi-estado-acceso'))
            return;

        if (errorCode === 'usage_policy_acceptance_required' || errorCode === 'creation_policy_acceptance_required') {
            const prompt = this.injector.get(PolicyPromptService, null);
            prompt?.trigger(errorCode);
        }

        queueMicrotask(() => {
            if (this.session.userIsLogged && this.session.getToken())
                this.injector.get(ModerationAccessService).refresh().subscribe();
        });
    }
}
