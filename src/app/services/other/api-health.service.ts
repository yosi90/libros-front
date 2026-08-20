import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, startWith, timeout } from 'rxjs';
import { environment } from '../../../environment/environment';

export type ApiHealthState = 'checking' | 'online' | 'degraded' | 'offline';
export type ApiHealthComponentState = 'checking' | 'healthy' | 'degraded' | 'unavailable' | 'unknown';

export interface ApiHealthComponent {
    state: ApiHealthComponentState;
    source: string;
    latencyMs: number | null;
    heartbeatAgeSeconds: number | null;
}

export interface ApiHealthComponents {
    api: ApiHealthComponent;
    sqlServer: ApiHealthComponent;
    realtimeGateway: ApiHealthComponent;
}

export interface ApiHealth {
    state: ApiHealthState;
    label: string;
    detail: string;
    apiAvailable: boolean;
    realtimeAvailable: boolean | null;
    components: ApiHealthComponents;
}

export type RealtimeHealthStatus = 'healthy' | 'degraded';
export type RealtimeHealthIssue = 'realtime_outbox_dead_letters' | 'firestore_outbox_dead_letters' | 'nats_unreachable';

export interface RealtimeOutboxCounters {
    pending: number;
    deadLetters: number;
    oldestAgeSeconds: number;
    maxAttempts: number;
}

export interface RealtimeHealth {
    success: true;
    status: RealtimeHealthStatus;
    issues: RealtimeHealthIssue[];
    realtimeOutbox: RealtimeOutboxCounters;
    firestoreOutbox: RealtimeOutboxCounters;
    natsTcpReachable: boolean;
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
    private readonly realtimeHealthUrl = `${environment.apiUrl}health/realtime`;

    constructor(private http: HttpClient) { }

    check(): Observable<ApiHealth> {
        return this.http.get<VerifyResponse>(this.verifyUrl).pipe(
            timeout(5000),
            map(response => {
                const realtimeState = response.Componentes?.realtimeGateway?.Estado;
                const realtimeAvailable = realtimeState ? realtimeState === 'healthy' : null;
                const components = this.toComponents(response.Componentes);
                if (response.status === 'success' && response.EstadoGeneral === 'healthy') {
                    return {
                        state: 'online',
                        label: 'API operativa',
                        detail: response.message || 'Conexión establecida con éxito',
                        apiAvailable: true,
                        realtimeAvailable,
                        components
                    } satisfies ApiHealth;
                }

                return {
                    state: response.EstadoGeneral === 'unavailable' ? 'offline' : 'degraded',
                    label: 'API con incidencias',
                    detail: response.message || response.detail || 'La API responde, pero informa de un problema',
                    apiAvailable: true,
                    realtimeAvailable,
                    components
                } satisfies ApiHealth;
            }),
            catchError(error => of(this.toUnavailableHealth(error))),
            startWith({
                state: 'checking',
                label: 'Comprobando API',
                detail: 'Consultando el estado del servicio',
                apiAvailable: false,
                realtimeAvailable: null,
                components: this.checkingComponents()
            } satisfies ApiHealth)
        );
    }

    getRealtimeHealth(): Observable<RealtimeHealth> {
        return this.http.get<RealtimeHealth>(this.realtimeHealthUrl).pipe(timeout(5000));
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
            realtimeAvailable: false,
            components: this.toComponents(response?.Componentes, 'unavailable')
        };
    }

    private checkingComponents(): ApiHealthComponents {
        const checking = (): ApiHealthComponent => ({ state: 'checking', source: '', latencyMs: null, heartbeatAgeSeconds: null });
        return { api: checking(), sqlServer: checking(), realtimeGateway: checking() };
    }

    private toComponents(components?: VerifyResponse['Componentes'], fallback: ApiHealthComponentState = 'unknown'): ApiHealthComponents {
        return {
            api: this.toComponent(components?.api, fallback),
            sqlServer: this.toComponent(components?.sqlServer, fallback),
            realtimeGateway: this.toComponent(components?.realtimeGateway, fallback)
        };
    }

    private toComponent(component: OperationalHealthComponent | undefined, fallback: ApiHealthComponentState): ApiHealthComponent {
        return {
            state: component?.Estado ?? fallback,
            source: component?.Fuente ?? '',
            latencyMs: component?.LatenciaMs ?? null,
            heartbeatAgeSeconds: component?.EdadHeartbeatSegundos ?? null
        };
    }
}
