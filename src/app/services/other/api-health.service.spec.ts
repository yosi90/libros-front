import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { fakeAsync, tick } from '@angular/core/testing';
import { environment } from '../../../environment/environment';
import { ApiHealth, ApiHealthService, RealtimeHealth } from './api-health.service';

describe('ApiHealthService', () => {
    let service: ApiHealthService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(ApiHealthService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('reports a degraded API while preserving the realtime gateway state', () => {
        const states: string[] = [];
        service.check().subscribe(health => states.push(`${health.state}:${health.realtimeAvailable}`));

        http.expectOne(`${environment.apiUrl}verify`).flush({
            success: true,
            status: 'success',
            EstadoGeneral: 'degraded',
            Componentes: {
                api: { Estado: 'healthy', Fuente: 'http', LatenciaMs: 12 },
                sqlServer: { Estado: 'healthy', Fuente: 'sql', LatenciaMs: 8 },
                realtimeGateway: { Estado: 'unavailable', Fuente: 'heartbeat', EdadHeartbeatSegundos: 91 }
            }
        });

        expect(states).toEqual(['checking:null', 'degraded:false']);
    });

    it('normalizes health details for administration without changing the aggregate state', () => {
        let finalState: ApiHealth | undefined;
        service.check().subscribe(health => finalState = health);

        http.expectOne(`${environment.apiUrl}verify`).flush({
            success: true,
            status: 'success',
            EstadoGeneral: 'healthy',
            Componentes: {
                api: { Estado: 'healthy', Fuente: 'http', LatenciaMs: 4 },
                sqlServer: { Estado: 'healthy', Fuente: 'sql', LatenciaMs: 7 },
                realtimeGateway: { Estado: 'healthy', Fuente: 'heartbeat', EdadHeartbeatSegundos: 2 }
            }
        });

        expect(finalState!.state).toBe('online');
        expect(finalState!.components.api.latencyMs).toBe(4);
        expect(finalState!.components.realtimeGateway.heartbeatAgeSeconds).toBe(2);
    });

    it('marks omitted component details as unknown without inventing availability', () => {
        let finalState: ApiHealth | undefined;
        service.check().subscribe(health => finalState = health);

        http.expectOne(`${environment.apiUrl}verify`).flush({
            success: true,
            status: 'success',
            EstadoGeneral: 'healthy',
            Componentes: { api: { Estado: 'healthy', Fuente: 'http', LatenciaMs: 3 } }
        });

        expect(finalState!.state).toBe('online');
        expect(finalState!.realtimeAvailable).toBeNull();
        expect(finalState!.components.sqlServer.state).toBe('unknown');
        expect(finalState!.components.realtimeGateway.state).toBe('unknown');
    });

    it('reports the database outage returned by verify as offline', () => {
        const states: string[] = [];
        service.check().subscribe(health => states.push(`${health.state}:${health.detail}`));

        http.expectOne(`${environment.apiUrl}verify`).flush({ code: 'database_connection_failed' }, { status: 503, statusText: 'Service Unavailable' });

        expect(states).toEqual(['checking:Consultando el estado del servicio', 'offline:La API no puede conectar con la base de datos.']);
    });

    it('turns a verify timeout into an offline state', fakeAsync(() => {
        let finalState: ApiHealth | undefined;
        service.check().subscribe(health => finalState = health);
        const request = http.expectOne(`${environment.apiUrl}verify`);

        tick(5001);

        expect(request.cancelled).toBeTrue();
        expect(finalState!.state).toBe('offline');
        expect(finalState!.components.api.state).toBe('unavailable');
    }));

    it('loads the typed realtime diagnosis from its admin endpoint', () => {
        const diagnosis: RealtimeHealth = {
            success: true as const,
            status: 'degraded' as const,
            issues: ['nats_unreachable' as const],
            realtimeOutbox: { pending: 14, deadLetters: 0, oldestAgeSeconds: 900, maxAttempts: 8 },
            firestoreOutbox: { pending: 3, deadLetters: 0, oldestAgeSeconds: 120, maxAttempts: 2 },
            natsTcpReachable: false
        };
        let result: RealtimeHealth | undefined;

        service.getRealtimeHealth().subscribe(response => result = response);
        http.expectOne(`${environment.apiUrl}health/realtime`).flush(diagnosis);

        expect(result).toEqual(diagnosis);
    });
});
