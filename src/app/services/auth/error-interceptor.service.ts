import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import {
    catchError,
    Observable,
    throwError,
    BehaviorSubject,
    filter,
    take,
    switchMap,
    finalize
} from 'rxjs';
import { Router } from '@angular/router';
import { SessionService } from './session.service';
import { getApiErrorCode } from '../../shared/api-error-message';
import { ModerationAccessService } from '../stores/moderation-access.service';

@Injectable({
    providedIn: 'root'
})
export class ErrorInterceptorService implements HttpInterceptor {

    private isRefreshing = false;
    private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

    constructor(
        private router: Router,
        private sessionSrv: SessionService,
        private injector: Injector
    ) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(req).pipe(
            catchError((error: HttpErrorResponse) => {
                // Ignorar errores de imágenes
                if (req.url.endsWith('.jpg') || req.url.endsWith('.jpeg') || req.url.endsWith('.png')) {
                    return throwError(() => error);
                }

                const errorCode = getApiErrorCode(error);

                // Una sancion, politica pendiente o limite funcional puede responder 403.
                // Esos estados llegan a la interfaz con su code y nunca invalidan la sesion.
                if (error.status === 403 && errorCode) {
                    this.refreshModerationAccess(errorCode);
                    return throwError(() => error);
                }

                // Solo un 401 de una peticion autenticada requiere renovar o cerrar sesion.
                if (error.status === 401 && this.shouldRefreshToken(req)) {
                    return this.handle401Error(req, next);
                }

                return throwError(() => error);
            })
        );
    }

    private handle401Error(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (this.isRefreshRequest(req))
            return next.handle(req);
        if (!this.isRefreshing) {
            this.isRefreshing = true;
            this.refreshTokenSubject.next(null);

            return this.sessionSrv.requestNewToken().pipe(
                switchMap(() => {
                    const token = this.sessionSrv.getToken();
                    if (token) {
                        this.refreshTokenSubject.next(token);
                        return next.handle(this.addToken(req, token));
                    }
                    // Si no se obtiene token, se fuerza el logout
                    this.sessionSrv.logout();
                    return throwError(() => new Error('No se pudo refrescar el token'));
                }),
                catchError(err => {
                    // Solo una renovacion fallida confirma que la sesion ya no es recuperable.
                    this.sessionSrv.logout();
                    this.router.navigateByUrl('/home');
                    return throwError(() => err);
                }),
                finalize(() => {
                    this.isRefreshing = false;
                })
            );
        } else {
            // Si ya se está renovando, esperamos a que finalice y reintentamos la solicitud
            return this.refreshTokenSubject.pipe(
                filter(token => token !== null),
                take(1),
                switchMap(token => next.handle(this.addToken(req, token!)))
            );
        }
    }

    private addToken(req: HttpRequest<any>, token: string): HttpRequest<any> {
        return req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    private shouldRefreshToken(req: HttpRequest<any>): boolean {
        return !!this.sessionSrv.getToken() && !this.isRefreshRequest(req);
    }

    private isRefreshRequest(req: HttpRequest<any>): boolean {
        return req.url.includes('/auth/refresh-token');
    }

    private refreshModerationAccess(errorCode: string): void {
        const accessErrors = new Set([
            'account_sanctioned',
            'capability_sanctioned',
            'usage_policy_acceptance_required',
            'creation_policy_acceptance_required'
        ]);
        if (!accessErrors.has(errorCode))
            return;

        queueMicrotask(() => this.injector.get(ModerationAccessService).refresh().subscribe());
    }
}
