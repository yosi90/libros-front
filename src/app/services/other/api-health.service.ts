import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, startWith, timeout } from 'rxjs';
import { environment } from '../../../environment/environment';

export type ApiHealthState = 'checking' | 'online' | 'degraded' | 'offline';

export interface ApiHealth {
    state: ApiHealthState;
    label: string;
    detail: string;
    apiAvailable: boolean;
    realtimeAvailable: boolean | null;
}

interface OperationalHealthComponent {
    Estado: 'healthy' | 'degraded' | 'unavailable';
    Fuente: string;
    LatenciaMs?: number;
    EdadHeartbeatSegundos?: number;
}

interface VerifyResponse {
    success?: boolean;
    status: string;
    message?: string;
    detail?: string;
    code?: string;
    EstadoGeneral?: 'healthy' | 'degraded' | 'unavailable';
    Componentes?: {
        api?: OperationalHealthComponent;
        sqlServer?: OperationalHealthComponent;
        realtimeGateway?: OperationalHealthComponent;
    };
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
                const realtimeState = response.Componentes?.realtimeGateway?.Estado;
                const realtimeAvailable = realtimeState ? realtimeState === 'healthy' : null;
                if (response.status === 'success' && response.EstadoGeneral !== 'degraded') {
                    return {
                        state: 'online',
                        label: 'API operativa',
                        detail: response.message || 'Conexión establecida con éxito',
                        apiAvailable: true,
                        realtimeAvailable
                    } satisfies ApiHealth;
                }

                return {
                    state: 'degraded',
                    label: 'API con incidencias',
                    detail: response.message || response.detail || 'La API responde, pero informa de un problema',
                    apiAvailable: true,
                    realtimeAvailable
                } satisfies ApiHealth;
            }),
            catchError(error => of(this.toUnavailableHealth(error))),
            startWith({
                state: 'checking',
                label: 'Comprobando API',
                detail: 'Consultando el estado del servicio',
                apiAvailable: false,
                realtimeAvailable: null
            } satisfies ApiHealth)
        );
    }

    private toUnavailableHealth(error: unknown): ApiHealth {
        const response = error instanceof HttpErrorResponse ? error.error as VerifyResponse | null : null;
        const sqlUnavailable = response?.code === 'database_connection_failed';
        return {
            state: 'offline',
            label: 'API no disponible',
            detail: sqlUnavailable
                ? 'La API no puede conectar con la base de datos.'
                : 'No se pudo contactar con el servicio.',
            apiAvailable: false,
            realtimeAvailable: false
        };
    }
}
