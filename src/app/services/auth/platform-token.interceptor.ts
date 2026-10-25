import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { GENERACION_PETICION, PlatformSessionService } from './platform-session.service';
import { requestWithToken } from './token-request';

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
        return requestWithToken({
            token: () => this.session.token(),
            renew: previous => this.session.renewToken(previous),
            send: token => next.handle(withToken(req, token)),
            isCurrent: () => this.session.isCurrentGeneration(generation)
        });
    }
}

export function isLibrosApiRequest(req: HttpRequest<unknown>): boolean {
    return req.url.startsWith(environment.apiUrl);
}

function withToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
    return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}
