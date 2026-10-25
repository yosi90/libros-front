import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../environment/environment';
import { PlatformSessionService } from '../auth/platform-session.service';
import { requestWithToken } from '../auth/token-request';

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Parametros = Record<string, string | number | boolean | null | undefined>;

/** Lo que responde una ruta de la plataforma sin sesión: no hay a quién preguntar. */
export const SIN_SESION_PLATAFORMA = { status: 401, error: { code: 'sin_sesion', error: 'Entra con tu cuenta de Yosiftware.' } };

/**
 * Las rutas de la API de la plataforma (`environment.plataforma.apiUrl`: el chat, las amistades…) con el token de la
 * plataforma (`yosiftware.tokenPlataforma()`, `aud: cuentas`), pedido en cada llamada y nunca guardado
 * (ecosistema-kit/ACCESO.md). Ante un 401 se pide otro y se repite una vez.
 *
 * Como en `PlatformTokenInterceptor` (los dos con `requestWithToken`), cada llamada pertenece a la generación de la
 * cuenta con la que empezó (CAMBIO_DE_CUENTA.md): si la cuenta cambia antes de la respuesta, se descarta sin valor ni
 * error.
 */
@Injectable({ providedIn: 'root' })
export class PlatformApiService {
    private readonly baseUrl = environment.plataforma.apiUrl.replace(/\/+$/, '');

    constructor(private http: HttpClient, private session: PlatformSessionService) { }

    get<T>(path: string, params?: Parametros): Observable<T> { return this.request<T>('GET', path, undefined, params); }
    post<T>(path: string, body: unknown = {}): Observable<T> { return this.request<T>('POST', path, body); }
    put<T>(path: string, body: unknown = {}): Observable<T> { return this.request<T>('PUT', path, body); }
    patch<T>(path: string, body: unknown = {}): Observable<T> { return this.request<T>('PATCH', path, body); }
    delete<T>(path: string): Observable<T> { return this.request<T>('DELETE', path); }

    request<T>(method: Metodo, path: string, body?: unknown, params?: Parametros): Observable<T> {
        const generation = this.session.generation;
        const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
        return requestWithToken<T>({
            token: () => this.session.platformToken(),
            // El SDK renueva solo: si aún da el mismo token, no se repite.
            renew: async previous => {
                const renewed = await this.session.platformToken();
                return renewed === previous ? null : renewed;
            },
            send: token => this.http.request<T>(method, url, {
                body,
                params: toHttpParams(params),
                headers: { Authorization: `Bearer ${token}` }
            }),
            isCurrent: () => this.session.isCurrentGeneration(generation),
            withoutToken: () => throwError(() => SIN_SESION_PLATAFORMA)
        });
    }
}

function toHttpParams(params?: Parametros): HttpParams | undefined {
    if (!params) return undefined;
    let result = new HttpParams();
    for (const [key, value] of Object.entries(params))
        if (value !== null && value !== undefined && value !== '') result = result.set(key, String(value));
    return result;
}
