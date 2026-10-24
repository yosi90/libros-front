import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable, catchError, filter, from, of, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environment/environment';
import { GENERACION_PETICION, PlatformSessionService } from './platform-session.service';

/**
 * Las llamadas a la API de Libros llevan el token de la plataforma (`yosiftware.token()`, audiencia `libros-api`),
 * pedido en cada petición y nunca guardado. Ante un 401 se pide un token nuevo y se repite una vez.
 *
 * Cada petición pertenece a la generación de la identidad con la que empezó (CAMBIO_DE_CUENTA.md): si la cuenta
 * cambia antes de la respuesta, la respuesta (o el error) se descarta y la petición termina sin valor, y nunca se
 * reintenta con la cuenta nueva.
 */
@Injectable({ providedIn: 'root' })
export class PlatformTokenInterceptor implements HttpInterceptor {
    constructor(private session: PlatformSessionService) { }

    intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        if (!isLibrosApiRequest(req))
            return next.handle(req);

        const generation = req.context.get(GENERACION_PETICION) ?? this.session.generation;
        const current = () => this.session.isCurrentGeneration(generation);

        return from(this.session.token()).pipe(
            catchError(() => of(null)),
            switchMap(token => {
                if (!current()) return EMPTY;
                return next.handle(withToken(req, token)).pipe(
                    catchError((error: unknown) => {
                        if (!current()) return EMPTY;
                        if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !token)
                            return throwError(() => error);
                        return this.retryOnce(req, next, token, error, current);
                    })
                );
            }),
            filter(() => current())
        );
    }

    private retryOnce(req: HttpRequest<unknown>, next: HttpHandler, previous: string, original: HttpErrorResponse, current: () => boolean): Observable<HttpEvent<unknown>> {
        return from(this.session.renewToken(previous)).pipe(
            catchError(() => of(null)),
            switchMap(renewed => {
                if (!current()) return EMPTY;
                if (!renewed) return throwError(() => original);
                return next.handle(withToken(req, renewed)).pipe(
                    catchError((error: unknown) => current() ? throwError(() => error) : EMPTY)
                );
            })
        );
    }
}

export function isLibrosApiRequest(req: HttpRequest<unknown>): boolean {
    return req.url.startsWith(environment.apiUrl);
}

function withToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
    return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}
