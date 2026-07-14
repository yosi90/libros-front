import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environment/environment';
import { ApiHealthService } from './api-health.service';

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
            Componentes: { realtimeGateway: { Estado: 'unavailable', Fuente: 'http' } }
        });

        expect(states).toEqual(['checking:null', 'degraded:false']);
    });

    it('reports the database outage returned by verify as offline', () => {
        const states: string[] = [];
        service.check().subscribe(health => states.push(`${health.state}:${health.detail}`));

        http.expectOne(`${environment.apiUrl}verify`).flush({ code: 'database_connection_failed' }, { status: 503, statusText: 'Service Unavailable' });

        expect(states).toEqual(['checking:Consultando el estado del servicio', 'offline:La API no puede conectar con la base de datos.']);
    });
});
