import {
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest,
    HttpErrorResponse
} from '@angular/common/http';
import { Injectable } from '@angular/core';
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

@Injectable({
    providedIn: 'root'
})
export class ErrorInterceptorService implements HttpInterceptor {

    private isRefreshing = false;
    private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

    constructor(
        private router: Router,
        private sessionSrv: SessionService
    ) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(req).pipe(
            catchError((error: HttpErrorResponse) => {
                // Ignorar errores de imágenes
                if (req.url.endsWith('.jpg') || req.url.endsWith('.jpeg') || req.url.endsWith('.png')) {
                    return throwError(() => error);
                }

                // Si el error es 401, se intenta renovar el token
                if (error.status === 401) {
                    return this.handle401Error(req, next);
                }

                // Para errores 403 se mantiene la lógica de logout
                if ([403].includes(error.status)) {
                    this.sessionSrv.logout();
                    this.router.navigateByUrl('/home');
                }

                return throwError(() => error);
            })
        );
    }

    private handle401Error(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (req.url.includes('/auth'))
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
                    // Si falla la renovación, se cierra la sesión
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
}
