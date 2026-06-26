import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, startWith, timeout } from 'rxjs';
import { environment } from '../../../environment/environment';

export type ApiHealthState = 'checking' | 'online' | 'degraded' | 'offline';

export interface ApiHealth {
    state: ApiHealthState;
    label: string;
    detail: string;
}

interface VerifyResponse {
    status: string;
    message?: string;
    detail?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ApiHealthService {

    private readonly verifyUrl = `${environment.apiUrl}verify`;

    constructor(private http: HttpClient) { }

    check(): Observable<ApiHealth> {
        return this.http.get<VerifyResponse>(this.verifyUrl).pipe(
            timeout(5000),
            map(response => {
                if (response.status === 'success') {
                    return {
                        state: 'online',
                        label: 'API operativa',
                        detail: response.message || 'Conexión establecida con éxito'
                    } satisfies ApiHealth;
                }

                return {
                    state: 'degraded',
                    label: 'API con incidencias',
                    detail: response.message || response.detail || 'La API responde, pero informa de un problema'
                } satisfies ApiHealth;
            }),
            catchError(() => of({
                state: 'offline',
                label: 'API no disponible',
                detail: 'No se pudo contactar con el servicio'
            } satisfies ApiHealth)),
            startWith({
                state: 'checking',
                label: 'Comprobando API',
                detail: 'Consultando el estado del servicio'
            } satisfies ApiHealth)
        );
    }
}
