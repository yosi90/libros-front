import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, Observable, catchError, filter, from, of, switchMap, throwError } from 'rxjs';

export interface TokenRequest<T> {
    /** El token en vigor, pedido en cada llamada y nunca guardado. `null` sin sesión. */
    token(): Promise<string | null>;
    /** Un token nuevo tras un 401. `null` si no lo hay: entonces no se repite. */
    renew(previous: string): Promise<string | null>;
    /** La llamada con ese token (`null`: sin cabecera). */
    send(token: string | null): Observable<T>;
    /** La cuenta con la que empezó la llamada sigue presentada (CAMBIO_DE_CUENTA.md). */
    isCurrent(): boolean;
    /** Sin token: qué se responde en lugar de llamar. Si falta, se llama sin token. */
    withoutToken?(): Observable<T>;
}

/**
 * Una llamada con el token de la plataforma, como la hacen la API de Libros (`PlatformTokenInterceptor`) y la de la
 * plataforma (`PlatformApiService`): el token se pide en cada llamada y, ante un 401, se pide otro y se repite una sola
 * vez. La llamada pertenece a la cuenta con la que empezó: si cambia antes de la respuesta, la respuesta (o el error) se
 * descarta y la llamada termina sin valor, y nunca se repite con la cuenta nueva.
 */
export function requestWithToken<T>(request: TokenRequest<T>): Observable<T> {
    const current = () => request.isCurrent();
    return from(request.token()).pipe(
        catchError(() => of(null)),
        switchMap(token => {
            if (!current()) return EMPTY;
            if (!token && request.withoutToken) return request.withoutToken();
            return request.send(token).pipe(
                catchError((error: unknown) => {
                    if (!current()) return EMPTY;
                    if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !token)
                        return throwError(() => error);
                    return from(request.renew(token)).pipe(
                        catchError(() => of(null)),
                        switchMap(renewed => {
                            if (!current()) return EMPTY;
                            if (!renewed) return throwError(() => error);
                            return request.send(renewed).pipe(
                                catchError((retryError: unknown) => current() ? throwError(() => retryError) : EMPTY)
                            );
                        })
                    );
                })
            );
        }),
        filter(() => current())
    );
}
